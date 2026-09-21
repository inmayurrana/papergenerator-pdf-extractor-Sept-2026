from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import numpy as np  # type: ignore

class BaseEngineAdapter(ABC):
    name: str = "BaseEngine"
    version: str = "1.0.0"
    is_installed: bool = False
    is_enabled: bool = True
    ram_req_mb: int = 200
    vram_req_mb: int = 0
    supports_gpu: bool = False
    capabilities: list = []

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Returns health status, version, and availability."""
        pass

    @abstractmethod
    def load_model(self):
        """Loads model weights into RAM/VRAM on demand."""
        pass

    @abstractmethod
    def unload_model(self):
        """Releases model weights and frees memory."""
        pass

    @abstractmethod
    def process_region(self, image_np: np.ndarray, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Processes a single cropped region and returns recognized text, normalized data, and confidence."""
        pass
