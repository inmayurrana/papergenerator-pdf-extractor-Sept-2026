import hashlib
import os
import shutil
from pathlib import Path
from typing import Optional
from .config import config

class StorageService:
    @staticmethod
    def get_safe_path(base_dir: Path, filename: str) -> Path:
        """Sanitizes filename and resolves path, preventing directory traversal."""
        clean_name = Path(filename).name
        target = (base_dir / clean_name).resolve()
        if not str(target).startswith(str(base_dir.resolve())):
            raise ValueError("Path traversal attempt detected")
        return target

    @staticmethod
    def compute_sha256(filepath: Path) -> str:
        """Computes SHA-256 hash of a file for duplicate detection and data integrity."""
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    @staticmethod
    def save_upload(filename: str, content: bytes) -> Path:
        dest = StorageService.get_safe_path(config.STORAGE_UPLOADS, filename)
        with open(dest, "wb") as f:
            f.write(content)
        return dest

    @staticmethod
    def save_diagram(image_bytes: bytes, filename: str) -> str:
        dest = StorageService.get_safe_path(config.STORAGE_DIAGRAMS, filename)
        with open(dest, "wb") as f:
            f.write(image_bytes)
        return f"/data/diagrams/{dest.name}"

    @staticmethod
    def save_snip(image_bytes: bytes, filename: str) -> str:
        dest = StorageService.get_safe_path(config.STORAGE_SNIPS, filename)
        with open(dest, "wb") as f:
            f.write(image_bytes)
        return f"/data/snips/{dest.name}"

    @staticmethod
    def save_omr_image(image_bytes: bytes, filename: str) -> str:
        dest = StorageService.get_safe_path(config.STORAGE_OMR, filename)
        with open(dest, "wb") as f:
            f.write(image_bytes)
        return f"/data/omr/{dest.name}"

    @staticmethod
    def cleanup_temporary_files(doc_id: str):
        """Removes intermediate preview renders and temp files while preserving original source files."""
        temp_dir = config.STORAGE_DOCUMENTS / doc_id / "temp"
        if temp_dir.exists() and temp_dir.is_dir():
            shutil.rmtree(temp_dir, ignore_errors=True)

storage_service = StorageService()
