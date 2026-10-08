"""
Model Manager — Lazy Load / Unload for Low-Hardware (i3 2nd Gen, 6 GB RAM)
============================================================================
Rules:
  - Never load more than one heavy model (>300 MB) at a time on low RAM.
  - Auto-evict LRU model when RAM < SAFETY_MARGIN_MB available.
  - Thread count auto-detected from CPU (works on any hardware from i3 2nd Gen up).
  - No GPU assumed; all models use CPU providers only (no AVX2 required).
  - VLM fallback runs in a subprocess to guarantee memory release after use.
"""

from __future__ import annotations

import gc
import logging
import os
import threading
import time
from collections import OrderedDict
from typing import Any, Callable, Dict, Optional

import psutil

import platform

logger = logging.getLogger("model_manager")

# Hardware constants and auto-detection
_CPU_THREADS = max(1, (os.cpu_count() or 2))
_TOTAL_RAM_MB = psutil.virtual_memory().total // (1024 * 1024)
_MACHINE = platform.machine().lower()
_IS_ARM = _MACHINE.startswith("arm") or "aarch" in _MACHINE

def _check_is_rpi() -> bool:
    try:
        if os.path.exists("/proc/device-tree/model"):
            with open("/proc/device-tree/model", "r", errors="ignore") as f:
                return "raspberry" in f.read().lower()
    except Exception:
        pass
    return False

_IS_RPI = _check_is_rpi()

# Determine Hardware Tier & Adaptive Safety Margin
if _IS_RPI or (_IS_ARM and _TOTAL_RAM_MB <= 4096) or _TOTAL_RAM_MB <= 2500:
    _HARDWARE_TIER = "PI_EMBEDDED"       # Raspberry Pi / ARM / <= 2.5 GB RAM
    _SAFETY_MARGIN_MB = max(80, int(_TOTAL_RAM_MB * 0.08))
    _MAX_HEAVY_MODELS = 1
    _ALLOW_HEAVY_VLM = False
elif _TOTAL_RAM_MB <= 6500:
    _HARDWARE_TIER = "LOW_SPEC"          # Intel Core i3 2nd Gen, 4-6 GB RAM
    _SAFETY_MARGIN_MB = max(400, int(_TOTAL_RAM_MB * 0.10))
    _MAX_HEAVY_MODELS = 1
    _ALLOW_HEAVY_VLM = True
else:
    _HARDWARE_TIER = "STANDARD"          # 8+ GB RAM, modern multi-core
    _SAFETY_MARGIN_MB = 900
    _MAX_HEAVY_MODELS = 2
    _ALLOW_HEAVY_VLM = True


class ModelDescriptor:
    """Metadata about a loadable model."""

    def __init__(
        self,
        name: str,
        ram_mb: int,
        loader: Callable[[], Any],
        is_heavy: bool = True,
    ):
        self.name = name
        self.ram_mb = ram_mb
        self.loader = loader
        self.is_heavy = is_heavy


class ModelManager:
    """
    Thread-safe lazy model loader with LRU eviction.

    Usage::

        mm = ModelManager.instance()
        model = mm.get("unimernet")
        result = model.predict(crop)
    """

    _singleton: Optional["ModelManager"] = None
    _class_lock = threading.Lock()

    @classmethod
    def instance(cls) -> "ModelManager":
        if cls._singleton is None:
            with cls._class_lock:
                if cls._singleton is None:
                    cls._singleton = cls()
        return cls._singleton

    def __init__(self):
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._meta: Dict[str, ModelDescriptor] = {}
        self._access: Dict[str, float] = {}
        self._lock = threading.Lock()
        self._idle_timeout_s = 300  # 5 min idle → unload

        logger.info(
            "ModelManager init | CPU threads=%d | Total RAM=%d MB | Safety margin=%d MB",
            _CPU_THREADS, _TOTAL_RAM_MB, _SAFETY_MARGIN_MB,
        )
        self._register_descriptors()

    # ── Registration ──────────────────────────────────────────────────────────

    def _register_descriptors(self):
        """Register model metadata without loading them."""
        from .model_loaders import (
            load_unimernet,
            load_pix2text,
            load_pix2tex,
            load_paddle_ocr,
            load_tesseract,
        )

        descriptors = [
            ModelDescriptor("unimernet",  ram_mb=450, loader=load_unimernet,  is_heavy=True),
            ModelDescriptor("pix2text",   ram_mb=350, loader=load_pix2text,   is_heavy=True),
            ModelDescriptor("pix2tex",    ram_mb=350, loader=load_pix2tex,    is_heavy=True),
            ModelDescriptor("paddleocr",  ram_mb=300, loader=load_paddle_ocr, is_heavy=True),
            ModelDescriptor("tesseract",  ram_mb=80,  loader=load_tesseract,  is_heavy=False),
        ]
        for d in descriptors:
            self._meta[d.name] = d

    def register(self, name: str, ram_mb: int, loader: Callable[[], Any], is_heavy: bool = True):
        """Register a new model descriptor at runtime."""
        self._meta[name] = ModelDescriptor(name, ram_mb, loader, is_heavy)

    # ── Public API ────────────────────────────────────────────────────────────

    def get(self, name: str) -> Any:
        """Return a loaded model, loading + evicting as needed."""
        with self._lock:
            if name in self._cache:
                self._access[name] = time.time()
                self._cache.move_to_end(name)
                return self._cache[name]

            desc = self._meta.get(name)
            if desc is None:
                raise KeyError(f"Unknown model: {name!r}")

            if desc.is_heavy:
                self._evict_to_fit(desc.ram_mb)

            logger.info("Loading model %r (~%d MB) …", name, desc.ram_mb)
            t0 = time.time()
            model = desc.loader()
            elapsed = time.time() - t0
            logger.info("Model %r loaded in %.1f s", name, elapsed)

            self._cache[name] = model
            self._access[name] = time.time()
            return model

    def unload(self, name: str):
        with self._lock:
            self._evict_one(name)

    def unload_all(self):
        with self._lock:
            for name in list(self._cache.keys()):
                self._evict_one(name)

    def is_loaded(self, name: str) -> bool:
        return name in self._cache

    def available_ram_mb(self) -> int:
        return psutil.virtual_memory().available // (1024 * 1024)

    def cpu_threads(self) -> int:
        return _CPU_THREADS

    @property
    def hardware_tier(self) -> str:
        return _HARDWARE_TIER

    @property
    def is_embedded_or_pi(self) -> bool:
        return _HARDWARE_TIER == "PI_EMBEDDED" or _IS_RPI or _IS_ARM

    @property
    def allow_vlm(self) -> bool:
        return _ALLOW_HEAVY_VLM and self.available_ram_mb() >= 1400

    @property
    def max_heavy_models(self) -> int:
        return _MAX_HEAVY_MODELS

    def status(self) -> Dict[str, Any]:
        vm = psutil.virtual_memory()
        return {
            "hardware_tier": _HARDWARE_TIER,
            "is_arm": _IS_ARM,
            "is_raspberry_pi": _IS_RPI,
            "loaded": list(self._cache.keys()),
            "ram_total_mb": vm.total // (1024 * 1024),
            "ram_available_mb": vm.available // (1024 * 1024),
            "ram_used_pct": vm.percent,
            "cpu_threads": _CPU_THREADS,
            "safety_margin_mb": _SAFETY_MARGIN_MB,
            "max_heavy_models": _MAX_HEAVY_MODELS,
            "allow_vlm": self.allow_vlm,
        }

    def tick_idle_unload(self):
        """Call periodically to unload idle models."""
        now = time.time()
        with self._lock:
            for name in list(self._cache.keys()):
                idle_s = now - self._access.get(name, now)
                if idle_s > self._idle_timeout_s:
                    logger.info("Idle-unloading %r (idle %.0f s)", name, idle_s)
                    self._evict_one(name)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _evict_to_fit(self, needed_mb: int):
        while True:
            # Strict cap on concurrent heavy models
            heavy_loaded = [
                n for n in self._cache
                if self._meta.get(n, ModelDescriptor("", 0, lambda: None, False)).is_heavy
            ]
            if len(heavy_loaded) >= _MAX_HEAVY_MODELS:
                victim = self._lru_heavy_model()
                if victim:
                    logger.info("Max heavy models limit (%d) reached. Evicting %r.", _MAX_HEAVY_MODELS, victim)
                    self._evict_one(victim)
                    continue

            avail = self.available_ram_mb()
            if avail - needed_mb >= _SAFETY_MARGIN_MB:
                break
            victim = self._lru_heavy_model()
            if victim is None:
                logger.warning(
                    "RAM low (%d MB avail) but no heavy model to evict. Proceeding.", avail
                )
                break
            logger.info(
                "RAM low (%d MB avail, need %d + %d margin). Evicting %r.",
                avail, needed_mb, _SAFETY_MARGIN_MB, victim,
            )
            self._evict_one(victim)

    def _lru_heavy_model(self) -> Optional[str]:
        candidates = [
            name for name in self._cache
            if self._meta.get(name, ModelDescriptor("", 0, lambda: None, False)).is_heavy
        ]
        return candidates[0] if candidates else None

    def _evict_one(self, name: str):
        model = self._cache.pop(name, None)
        self._access.pop(name, None)
        if model is not None:
            del model
            gc.collect()
            logger.info("Evicted %r | RAM now %d MB free", name, self.available_ram_mb())


# Singleton
model_manager = ModelManager.instance()
