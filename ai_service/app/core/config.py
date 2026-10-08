import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class SystemConfig(BaseModel):
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR

    # ── Hardware constraints (minimum: i3 2nd Gen, 6 GB RAM, no GPU)
    # Scales automatically: on 8+ GB RAM, two models may co-load.
    RAM_TARGET_MB: int = 4500          # conservative target for 6 GB
    RAM_SAFETY_MARGIN_MB: int = 900    # always keep this free
    MAX_HEAVY_JOBS: int = 1            # only one AI job at a time on i3
    MAX_PAGE_WORKERS: int = 1          # one page processed at a time
    MODEL_IDLE_TIMEOUT_SECONDS: int = 300   # 5 min idle → unload

    # ── Confidence Thresholds
    CONFIDENCE_HIGH_THRESHOLD: float = 0.85
    CONFIDENCE_BALANCED_THRESHOLD: float = 0.75
    CONFIDENCE_REVIEW_THRESHOLD: float = 0.65

    # ── Visual Math Pipeline Thresholds
    VISUAL_PRIMARY_THRESHOLD: float = 0.80     # UniMERNet accept threshold
    VISUAL_SECONDARY_THRESHOLD: float = 0.75   # Pix2Text accept threshold
    VISUAL_TERTIARY_THRESHOLD: float = 0.65    # pix2tex accept threshold
    VISUAL_VLM_MIN_THRESHOLD: float = 0.45     # VLM minimum accept threshold

    # ── Model Paths (override via env vars)
    UNIMERNET_CFG: str = os.environ.get("UNIMERNET_CFG", "")
    UNIMERNET_MODEL_DIR: str = os.environ.get("UNIMERNET_MODEL_DIR", "")
    UNIMERNET_ONNX_PATH: str = os.environ.get("UNIMERNET_ONNX_PATH", "")

    # ── Paths
    STORAGE_UPLOADS: Path = DATA_DIR / "uploads"
    STORAGE_DOCUMENTS: Path = DATA_DIR / "documents"
    STORAGE_DIAGRAMS: Path = DATA_DIR / "diagrams"
    STORAGE_SNIPS: Path = DATA_DIR / "snips"
    STORAGE_OMR: Path = DATA_DIR / "omr"
    STORAGE_EXPORTS: Path = DATA_DIR / "exports"
    STORAGE_FORMULAS: Path = DATA_DIR / "formulas"
    STORAGE_CROPS: Path = DATA_DIR / "crops"
    STORAGE_PAGES: Path = DATA_DIR / "pages"

    # ── OCR settings
    DEFAULT_PROFILE: str = "BALANCED"   # FAST | BALANCED | HIGH_ACCURACY | MAXIMUM_ACCURACY
    PAGE_DPI: int = 300                 # target DPI for page images
    CROP_DPI: int = 400                 # target DPI for math crop recognition

    class Config:
        arbitrary_types_allowed = True

config = SystemConfig()

# Ensure all directories exist
for p in [
    config.STORAGE_UPLOADS,
    config.STORAGE_DOCUMENTS,
    config.STORAGE_DIAGRAMS,
    config.STORAGE_SNIPS,
    config.STORAGE_OMR,
    config.STORAGE_EXPORTS,
    config.STORAGE_FORMULAS,
    config.STORAGE_CROPS,
    config.STORAGE_PAGES,
]:
    p.mkdir(parents=True, exist_ok=True)

