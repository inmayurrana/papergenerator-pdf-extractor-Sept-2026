import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class SystemConfig(BaseModel):
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR

    # Hardware constraints & targets (Core i3 8th gen, 8GB RAM, 4GB VRAM)
    RAM_TARGET_MB: int = 5120  # 5 GB target cap
    MAX_HEAVY_JOBS: int = 1
    MAX_PAGE_WORKERS: int = 1
    MODEL_IDLE_TIMEOUT_SECONDS: int = 180  # Unload heavy models after 3 min idle

    # Confidence Thresholds
    CONFIDENCE_HIGH_THRESHOLD: float = 0.95
    CONFIDENCE_BALANCED_THRESHOLD: float = 0.85
    CONFIDENCE_REVIEW_THRESHOLD: float = 0.70

    # Paths
    STORAGE_UPLOADS: Path = DATA_DIR / "uploads"
    STORAGE_DOCUMENTS: Path = DATA_DIR / "documents"
    STORAGE_DIAGRAMS: Path = DATA_DIR / "diagrams"
    STORAGE_SNIPS: Path = DATA_DIR / "snips"
    STORAGE_OMR: Path = DATA_DIR / "omr"
    STORAGE_EXPORTS: Path = DATA_DIR / "exports"
    STORAGE_FORMULAS: Path = DATA_DIR / "formulas"

    # Default OCR settings
    DEFAULT_PROFILE: str = "BALANCED"  # FAST, BALANCED, HIGH_ACCURACY, MAXIMUM_ACCURACY

config = SystemConfig()

# Ensure directories exist
for p in [
    config.STORAGE_UPLOADS,
    config.STORAGE_DOCUMENTS,
    config.STORAGE_DIAGRAMS,
    config.STORAGE_SNIPS,
    config.STORAGE_OMR,
    config.STORAGE_EXPORTS,
    config.STORAGE_FORMULAS,
]:
    p.mkdir(parents=True, exist_ok=True)
