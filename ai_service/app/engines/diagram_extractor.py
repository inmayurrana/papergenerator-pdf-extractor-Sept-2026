import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore
from ..core.config import config

class DiagramExtractor:
    @staticmethod
    def crop_and_save_diagram(
        page_image_path: str,
        bbox: list,  # [x, y, w, h]
        doc_id: str,
        page_num: int
    ) -> Dict[str, Any]:
        """Crops high-resolution diagram region, preserves original source image, and stores metadata."""
        img = cv2.imread(page_image_path)
        if img is None:
            raise FileNotFoundError(f"Image not found: {page_image_path}")

        x, y, w, h = bbox
        img_h, img_w = img.shape[:2]

        # Ensure bounds within image
        x0 = max(0, int(x))
        y0 = max(0, int(y))
        x1 = min(img_w, int(x + w))
        y1 = min(img_h, int(y + h))

        crop = img[y0:y1, x0:x1]

        diag_id = f"diag_{uuid.uuid4().hex[:8]}"
        filename = f"{doc_id}_p{page_num}_{diag_id}.png"
        target_path = config.STORAGE_DIAGRAMS / filename

        cv2.imwrite(str(target_path), crop)

        return {
            "diagram_id": diag_id,
            "filename": filename,
            "relative_url": f"/data/diagrams/{filename}",
            "absolute_path": str(target_path),
            "bbox": [x0, y0, x1 - x0, y1 - y0],
            "width": x1 - x0,
            "height": y1 - y0,
            "labels": [],
        }

diagram_extractor = DiagramExtractor()
