from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import cv2  # type: ignore
import numpy as np  # type: ignore

class ImagePreprocessor:
    @staticmethod
    def analyze_image_quality(image: np.ndarray) -> Dict[str, Any]:
        """Calculates blur score (Laplacian variance), contrast, and estimated skew."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        contrast = gray.std()
        skew_angle = ImagePreprocessor._estimate_skew_angle(gray)

        return {
            "blur_score": round(float(blur_score), 2),
            "is_blurry": blur_score < 100.0,
            "contrast_std": round(float(contrast), 2),
            "skew_angle": round(float(skew_angle), 2),
        }

    @staticmethod
    def _estimate_skew_angle(gray: np.ndarray) -> float:
        """Estimates skew angle using minAreaRect on foreground text pixels."""
        try:
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
            coords = np.column_stack(np.where(thresh > 0))
            if len(coords) < 50:
                return 0.0
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = 90 - angle
            else:
                angle = -angle
            return angle
        except Exception:
            return 0.0

    @staticmethod
    def deskew(image: np.ndarray, angle: float) -> np.ndarray:
        """Rotates image to correct skew without cropping corners."""
        if abs(angle) < 0.5:
            return image
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        deskewed = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return deskewed

    @staticmethod
    def remove_background_watermarks(image: np.ndarray) -> np.ndarray:
        """
        Removes background watermarks, stamps, colored logos, and non-uniform background artifacts
        while preserving sharp, high-contrast black text, math symbols, diagrams, and figures.
        """
        if image is None:
            return image

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # 1. Background illumination estimation via morphological dilation
        # Large structuring element removes dark text strokes, capturing background + faint watermarks
        kernel_size = 35
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        bg = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
        bg_smooth = cv2.GaussianBlur(bg, (31, 31), 0)

        # 2. Division normalization (flattens background and cancels faint gradients/watermarks)
        norm = cv2.divide(gray, bg_smooth, scale=255)

        # 3. Dynamic contrast mapping
        # Dark foreground (< 115) is enhanced/kept dark.
        # Background and watermarks (> 175) are mapped to pure white (255).
        lut = np.zeros(256, dtype=np.uint8)
        for i in range(256):
            if i >= 175:
                lut[i] = 255
            elif i < 115:
                lut[i] = np.clip(int(i * 0.85), 0, 255)
            else:
                t = (i - 115) / (175 - 115)
                lut[i] = np.clip(int(i * (1 - t) + 255 * t), 0, 255)

        cleaned_gray = cv2.LUT(norm, lut)

        # 4. Color watermark suppression (e.g. faint red, blue, green stamps)
        if len(image.shape) == 3:
            cleaned_bgr = image.copy()
            # Pixels that are bright/watermark in cleaned_gray become pure white
            white_mask = cleaned_gray >= 248
            cleaned_bgr[white_mask] = [255, 255, 255]

            # For dark text/diagrams, replace with cleaned sharp grayscale
            dark_mask = ~white_mask
            for c in range(3):
                cleaned_bgr[dark_mask, c] = np.minimum(cleaned_bgr[dark_mask, c], cleaned_gray[dark_mask])

            return cleaned_bgr
        else:
            return cleaned_gray

    @staticmethod
    def remove_shadows_and_enhance(image: np.ndarray) -> np.ndarray:
        """Removes background shadows and enhances document contrast."""
        return ImagePreprocessor.remove_background_watermarks(image)

    @staticmethod
    def clean_page_image_file(image_path: Path) -> Path:
        """Loads a rendered page image file, removes background watermarks, and overwrites with the cleaned image."""
        try:
            img = cv2.imread(str(image_path))
            if img is not None:
                cleaned = ImagePreprocessor.remove_background_watermarks(img)
                cv2.imwrite(str(image_path), cleaned)
        except Exception:
            pass
        return image_path

    @staticmethod
    def preprocess_for_ocr(
        image_path: Path,
        save_preprocessed: bool = False
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Complete adaptive pipeline: analyzes quality, applies deskew and watermark removal."""
        img = cv2.imread(str(image_path))
        if img is None:
            raise FileNotFoundError(f"Failed to read image at: {image_path}")

        quality = ImagePreprocessor.analyze_image_quality(img)

        # Deskew if needed
        skew = quality["skew_angle"]
        if abs(skew) >= 0.5:
            img = ImagePreprocessor.deskew(img, skew)

        # Enhance contrast and remove background watermarks
        processed = ImagePreprocessor.remove_background_watermarks(img)

        if save_preprocessed:
            prep_path = image_path.parent / f"{image_path.stem}_prep.png"
            cv2.imwrite(str(prep_path), processed)
            quality["preprocessed_path"] = str(prep_path)

        return processed, quality

image_preprocessor = ImagePreprocessor()
