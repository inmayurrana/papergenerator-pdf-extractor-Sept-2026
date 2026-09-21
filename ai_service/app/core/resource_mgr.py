import asyncio
import gc
import logging
import os
import subprocess
import time
from typing import Any, Dict, List, Optional
import psutil
from .config import config

logger = logging.getLogger("resource_mgr")

class ModelEntry:
    def __init__(self, name: str, instance: Any, ram_mb: int = 500, vram_mb: int = 0):
        self.name = name
        self.instance = instance
        self.ram_mb = ram_mb
        self.vram_mb = vram_mb
        self.last_accessed = time.time()
        self.is_loaded = True

class ResourceManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ResourceManager, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.heavy_job_semaphore = asyncio.Semaphore(config.MAX_HEAVY_JOBS)
        self.page_worker_semaphore = asyncio.Semaphore(config.MAX_PAGE_WORKERS)
        self.loaded_models: Dict[str, ModelEntry] = {}
        self.active_jobs_count = 0
        self._lock = asyncio.Lock()
        self._idle_checker_task: Optional[asyncio.Task] = None

    def get_hardware_metrics(self) -> Dict[str, Any]:
        """Returns instantaneous CPU, RAM, and GPU/VRAM statistics."""
        vm = psutil.virtual_memory()
        cpu_pct = psutil.cpu_percent(interval=0.1)
        disk = psutil.disk_usage(str(config.STORAGE_UPLOADS))

        # GPU metrics check
        gpu_info = self._get_gpu_metrics()

        return {
            "cpu_percent": cpu_pct,
            "cpu_count": psutil.cpu_count(logical=True),
            "ram_total_mb": round(vm.total / (1024 * 1024), 1),
            "ram_used_mb": round(vm.used / (1024 * 1024), 1),
            "ram_available_mb": round(vm.available / (1024 * 1024), 1),
            "ram_percent": vm.percent,
            "ram_target_limit_mb": config.RAM_TARGET_MB,
            "disk_free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
            "gpu": gpu_info,
            "active_heavy_jobs": self.active_jobs_count,
            "max_heavy_jobs": config.MAX_HEAVY_JOBS,
            "loaded_models": list(self.loaded_models.keys()),
        }

    def _get_gpu_metrics(self) -> Dict[str, Any]:
        """Inspects GPU/VRAM via nvidia-smi if available, else returns standard stats."""
        try:
            cmd = ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu", "--format=csv,nounits,noheader"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and res.stdout.strip():
                parts = [p.strip() for p in res.stdout.strip().split(",")]
                return {
                    "available": True,
                    "name": parts[0],
                    "vram_total_mb": float(parts[1]),
                    "vram_used_mb": float(parts[2]),
                    "vram_free_mb": float(parts[3]),
                    "gpu_utilization_pct": float(parts[4]),
                }
        except Exception:
            pass

        return {
            "available": False,
            "name": "Integrated / CPU Fallback",
            "vram_total_mb": 0,
            "vram_used_mb": 0,
            "vram_free_mb": 0,
            "gpu_utilization_pct": 0,
        }

    async def can_run_heavy_job(self) -> bool:
        """Determines if there is enough free RAM/resources to start a heavy job."""
        vm = psutil.virtual_memory()
        available_mb = vm.available / (1024 * 1024)
        # We need at least 800 MB free memory to safely run OCR/vision without freezing OS
        return available_mb >= 800

    def register_model(self, name: str, instance: Any, ram_mb: int = 500, vram_mb: int = 0):
        self.loaded_models[name] = ModelEntry(name, instance, ram_mb, vram_mb)
        logger.info(f"Model registered: {name} (~{ram_mb} MB RAM)")

    def touch_model(self, name: str):
        if name in self.loaded_models:
            self.loaded_models[name].last_accessed = time.time()

    def unload_model(self, name: str) -> bool:
        if name in self.loaded_models:
            entry = self.loaded_models.pop(name)
            del entry.instance
            del entry
            gc.collect()
            logger.info(f"Model unloaded and memory released: {name}")
            return True
        return False

    def unload_all_models(self):
        for name in list(self.loaded_models.keys()):
            self.unload_model(name)
        gc.collect()

    async def auto_unload_check(self):
        """Background task checking for models that have been idle past timeout."""
        now = time.time()
        timeout = config.MODEL_IDLE_TIMEOUT_SECONDS
        for name, entry in list(self.loaded_models.items()):
            if now - entry.last_accessed > timeout:
                logger.info(f"Auto-unloading idle model: {name} (Idle for {int(now - entry.last_accessed)}s)")
                self.unload_model(name)

resource_manager = ResourceManager()
