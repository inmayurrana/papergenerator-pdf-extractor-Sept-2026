"""
Formula Recognition Cache Engine
Caches recognized mathematical formulas by image SHA-256 hash
to avoid redundant processing of identical formula crops.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np  # type: ignore
import cv2  # type: ignore
from ..core.config import config

logger = logging.getLogger("formula_cache")


class FormulaCacheManager:
    CACHE_VERSION = "2.0.0"

    def __init__(self, cache_file: Optional[Path] = None):
        self.cache_file = cache_file or (config.DATA_DIR / "formula_cache.json")
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._load_cache()

    def _load_cache(self) -> None:
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load formula cache: {e}")
                self._cache = {}

    def _save_cache(self) -> None:
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to save formula cache: {e}")

    @staticmethod
    def compute_image_hash(image_input: Any) -> Optional[str]:
        """Computes SHA-256 hash of an image (numpy ndarray, bytes, or file Path)."""
        if image_input is None:
            return None

        if isinstance(image_input, (str, Path)):
            p = Path(image_input)
            if p.exists():
                with open(p, "rb") as f:
                    return hashlib.sha256(f.read()).hexdigest()
            return hashlib.sha256(str(image_input).encode("utf-8")).hexdigest()

        if isinstance(image_input, bytes):
            return hashlib.sha256(image_input).hexdigest()

        if isinstance(image_input, np.ndarray):
            # Encode to png bytes for deterministic hashing
            success, encoded = cv2.imencode(".png", image_input)
            if success:
                return hashlib.sha256(encoded.tobytes()).hexdigest()
            return hashlib.sha256(image_input.tobytes()).hexdigest()

        return hashlib.sha256(str(image_input).encode("utf-8")).hexdigest()

    def get(self, image_input: Any) -> Optional[Dict[str, Any]]:
        """Retrieves cached formula recognition result if present."""
        if image_input is None:
            return None
        img_hash = self.compute_image_hash(image_input)
        if not img_hash:
            return None
        entry = self._cache.get(img_hash)
        if entry:
            return entry.get("data")
        return None

    def set(self, image_input: Any, data: Dict[str, Any], engine: str = "ScientificRecognitionSubsystem") -> None:
        """Caches a validated formula recognition result."""
        if image_input is None:
            return
        img_hash = self.compute_image_hash(image_input)
        if not img_hash:
            return
        self._cache[img_hash] = {
            "hash": img_hash,
            "engine": engine,
            "version": self.CACHE_VERSION,
            "data": data,
        }
        self._save_cache()

    def clear(self) -> None:
        self._cache.clear()
        self._save_cache()


formula_cache = FormulaCacheManager()
