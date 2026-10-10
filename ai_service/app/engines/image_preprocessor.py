"""
Image Pre-Processor for Math Extraction
========================================
Prepares document pages and formula crops for math recognition.
All operations use OpenCV (CPU-only). No AVX2 required.
Safe on i3 2nd Gen and above.

Pipeline:
  1. Normalize input (accept ndarray, PIL, file path, bytes)
  2. Ensure 300 DPI minimum resolution
  3. Deskew (Hough line transform)
  4. Denoise (adaptive morphological)
  5. Binarize (Sauvola / Otsu)
  6. Contrast normalize
  7. Expand crop for math regions (add padding, never clip subscripts)
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Tuple, Union, Any

import cv2
import numpy as np

logger = logging.getLogger("image_preprocessor")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_numpy(source: Union[str, Path, bytes, np.ndarray, Any]) -> np.ndarray:
    """Convert any input type to a uint8 BGR numpy array."""
    if isinstance(source, np.ndarray):
        return source.copy()
    if isinstance(source, (str, Path)):
        img = cv2.imread(str(source))
        if img is None:
            raise FileNotFoundError(f"Cannot read image: {source}")
        return img
    if isinstance(source, bytes):
        arr = np.frombuffer(source, np.uint8)
        decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if decoded is None:
            raise ValueError("Failed to decode image from bytes")
        return decoded
    # PIL Image
    try:
        from PIL import Image as _PIL_Image
        if isinstance(source, _PIL_Image.Image):
            return np.array(source.convert("RGB"))[:, :, ::-1].copy()  # RGB->BGR
    except Exception:
        pass
    raise TypeError(f"Unsupported image source type: {type(source)}")


def _to_gray(bgr: np.ndarray) -> np.ndarray:
    if len(bgr.shape) == 2:
        return bgr
    if bgr.shape[2] == 4:
        bgr = cv2.cvtColor(bgr, cv2.COLOR_BGRA2BGR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


# ─── Core operations ──────────────────────────────────────────────────────────

def deskew(gray: np.ndarray, max_angle_deg: float = 15.0) -> np.ndarray:
    """
    Detect and correct skew angle using Hough line transform.
    Only corrects if angle < max_angle_deg (avoids false corrections on diagrams).
    """
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80,
                                minLineLength=gray.shape[1] // 4, maxLineGap=20)
        if lines is None or len(lines) == 0:
            return gray

        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 == 0:
                continue
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(angle) < max_angle_deg:
                angles.append(angle)

        if not angles:
            return gray

        median_angle = float(np.median(angles))
        if abs(median_angle) < 0.3:
            return gray  # negligible skew

        h, w = gray.shape
        cx, cy = w / 2, h / 2
        M = cv2.getRotationMatrix2D((cx, cy), median_angle, 1.0)
        rotated = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        logger.debug("Deskewed by %.2f°", median_angle)
        return rotated
    except Exception as e:
        logger.warning("Deskew failed: %s", e)
        return gray


def denoise(gray: np.ndarray) -> np.ndarray:
    """
    Lightweight noise removal via morphological close + mild Gaussian blur.
    Preserves fine strokes (fraction bars, superscripts).
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    closed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=1)
    return cv2.GaussianBlur(closed, (3, 3), 0)


def binarize(gray: np.ndarray, method: str = "auto") -> np.ndarray:
    """
    Binarize image.
    method: 'otsu' | 'adaptive' | 'auto' (chooses based on variance)
    """
    if method == "auto":
        variance = float(np.var(gray))
        method = "adaptive" if variance > 1500 else "otsu"

    if method == "otsu":
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=15,
            C=8,
        )
    return binary


def upscale_to_dpi(img: np.ndarray, current_dpi: int, target_dpi: int = 300) -> np.ndarray:
    """Upscale image if DPI is too low. Uses Lanczos for quality."""
    if current_dpi >= target_dpi:
        return img
    scale = target_dpi / current_dpi
    h, w = img.shape[:2]
    new_h, new_w = int(h * scale), int(w * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)


def normalize_contrast(gray: np.ndarray) -> np.ndarray:
    """CLAHE contrast normalization — helps low-contrast scans."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


# ─── Crop Engine ──────────────────────────────────────────────────────────────

def expand_math_crop(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    padding_px: int = 24,
    extra_top: int = 12,
    extra_bottom: int = 12,
) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
    """
    Expand a bounding box for a math region to include:
      - Surrounding context (parentheses, operators)
      - Superscripts (extra_top)
      - Subscripts (extra_bottom)
    Returns (cropped_image, expanded_bbox).

    bbox: (x1, y1, x2, y2)
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox

    exp_x1 = max(0, x1 - padding_px)
    exp_y1 = max(0, y1 - padding_px - extra_top)
    exp_x2 = min(w, x2 + padding_px)
    exp_y2 = min(h, y2 + padding_px + extra_bottom)

    crop = image[exp_y1:exp_y2, exp_x1:exp_x2]
    return crop, (exp_x1, exp_y1, exp_x2, exp_y2)


# ─── Full Pipeline ────────────────────────────────────────────────────────────

class ImagePreprocessor:
    """
    Full pre-processing pipeline for math document images.
    """

    @staticmethod
    def prepare_page(
        source: Union[str, Path, bytes, np.ndarray],
        dpi: int = 150,
        target_dpi: int = 300,
        do_deskew: bool = True,
        do_denoise: bool = True,
        binarize_method: str = "auto",
    ) -> dict:
        """
        Full page pre-processing.
        Returns {
            "original_bgr": ndarray,
            "gray": ndarray,
            "binary": ndarray,
            "preprocessed": ndarray,  # binary uint8 ready for OCR
            "width": int,
            "height": int,
        }
        """
        bgr = _to_numpy(source)
        original_bgr = bgr.copy()

        gray = _to_gray(bgr)
        gray = normalize_contrast(gray)
        gray = upscale_to_dpi(gray, current_dpi=dpi, target_dpi=target_dpi)

        if do_deskew:
            gray = deskew(gray)

        if do_denoise:
            gray = denoise(gray)

        binary = binarize(gray, method=binarize_method)

        h, w = binary.shape[:2]
        return {
            "original_bgr": original_bgr,
            "gray": gray,
            "binary": binary,
            "preprocessed": binary,
            "width": w,
            "height": h,
        }

    @staticmethod
    def prepare_math_crop(
        page_image: np.ndarray,
        bbox: Tuple[int, int, int, int],
        target_size: Tuple[int, int] = (0, 0),  # 0 = keep native
        padding_px: int = 24,
    ) -> dict:
        """
        Prepare a math formula crop for recognition.
        Returns {
            "original_crop": ndarray,
            "expanded_crop": ndarray,
            "expanded_bbox": tuple,
            "recognition_ready": ndarray,  # high-contrast, clean
        }
        """
        # 1. Expand crop (never clip subscripts/superscripts)
        expanded, exp_bbox = expand_math_crop(page_image, bbox, padding_px=padding_px)
        original_crop = page_image[bbox[1]:bbox[3], bbox[0]:bbox[2]].copy()

        # 2. Convert to gray + enhance
        gray = _to_gray(expanded)
        gray = normalize_contrast(gray)
        denoised = denoise(gray)

        # 3. Upscale to 400 DPI equivalent for better symbol recognition
        h, w = denoised.shape[:2]
        if h < 80 or w < 80:  # very small crop — scale up
            scale = max(2, 120 // max(h, w, 1))
            denoised = cv2.resize(
                denoised, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4
            )

        # 4. Clean binarization
        binary = binarize(denoised, method="adaptive")

        # 5. Optional resize to target_size
        if target_size[0] > 0 and target_size[1] > 0:
            binary = cv2.resize(binary, target_size, interpolation=cv2.INTER_AREA)

        return {
            "original_crop": original_crop,
            "expanded_crop": expanded,
            "expanded_bbox": exp_bbox,
            "recognition_ready": binary,
        }

    @staticmethod
    def enhance_for_retry(crop: np.ndarray) -> np.ndarray:
        """
        Alternative enhancement for a second recognition pass.
        Uses morphological dilation to thicken thin strokes.
        """
        gray = _to_gray(crop)
        gray = normalize_contrast(gray)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        dilated = cv2.dilate(gray, kernel, iterations=1)
        _, binary = cv2.threshold(dilated, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary


image_preprocessor = ImagePreprocessor()
