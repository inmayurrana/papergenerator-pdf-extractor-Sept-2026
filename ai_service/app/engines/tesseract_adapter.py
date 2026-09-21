import shutil
from typing import Dict, Any, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore
import pytesseract  # type: ignore
from PIL import Image  # type: ignore
from .base import BaseEngineAdapter

class TesseractEngineAdapter(BaseEngineAdapter):
    name: str = "Tesseract-OCR"
    version: str = "5.4.0"
    ram_req_mb: int = 150
    vram_req_mb: int = 0
    supports_gpu: bool = False
    capabilities: list = ["PRINTED_TEXT", "TABLES", "MULTILINGUAL"]

    def __init__(self):
        self._check_installation()

    def _check_installation(self):
        # Look in PATH or common Windows Tesseract paths
        tess_exe = shutil.which("tesseract")
        if not tess_exe:
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                r"C:\Users\mayur\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
            ]
            for p in common_paths:
                if shutil.os.path.exists(p):
                    pytesseract.pytesseract.tesseract_cmd = p
                    tess_exe = p
                    break

        self.is_installed = tess_exe is not None

    def health_check(self) -> Dict[str, Any]:
        self._check_installation()
        return {
            "name": self.name,
            "version": self.version,
            "is_installed": self.is_installed,
            "is_enabled": self.is_enabled,
            "ram_req_mb": self.ram_req_mb,
            "vram_req_mb": self.vram_req_mb,
        }

    def load_model(self):
        # Tesseract binary is lightweight on-demand process
        pass

    def unload_model(self):
        pass

    def process_region(self, image_np: np.ndarray, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.is_installed:
            # Graceful return if binary is not installed
            return {
                "text": "",
                "confidence": 0.0,
                "engine": self.name,
                "error": "Tesseract binary not installed on system",
            }

        try:
            pil_img = Image.fromarray(image_np)
            data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)

            words = []
            confs = []
            for i, word in enumerate(data.get("text", [])):
                conf = float(data.get("conf", [0])[i])
                if word.strip() and conf > 0:
                    words.append(word)
                    confs.append(conf)

            full_text = " ".join(words)
            avg_conf = (sum(confs) / max(len(confs), 1)) / 100.0  # Normalize to 0.0 - 1.0

            return {
                "text": full_text,
                "confidence": round(avg_conf, 2),
                "engine": self.name,
            }
        except Exception as e:
            return {
                "text": "",
                "confidence": 0.0,
                "engine": self.name,
                "error": str(e),
            }

tesseract_adapter = TesseractEngineAdapter()
