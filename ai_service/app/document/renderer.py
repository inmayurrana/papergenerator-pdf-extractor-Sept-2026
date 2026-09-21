import gc
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import pymupdf  # type: ignore
from PIL import Image  # type: ignore
from ..core.config import config

logger = logging.getLogger("renderer")

class PageRenderer:
    @staticmethod
    def render_page(
        doc_path: Path,
        page_number: int,  # 1-indexed
        dpi: int = 200,
        output_dir: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """Renders a single page of a document to an image file and releases the document object from RAM immediately."""
        ext = doc_path.suffix.lower()
        if output_dir is None:
            output_dir = config.STORAGE_DOCUMENTS / doc_path.stem
        output_dir.mkdir(parents=True, exist_ok=True)

        target_image_path = output_dir / f"page_{page_number}.png"

        if ext == ".pdf":
            doc = pymupdf.open(str(doc_path))
            if page_number < 1 or page_number > len(doc):
                doc.close()
                raise ValueError(f"Page number {page_number} out of range (1 - {len(doc)})")

            page = doc.load_page(page_number - 1)
            # Calculate zoom matrix based on DPI (72 dpi is 1.0)
            zoom = dpi / 72.0
            mat = pymupdf.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            pix.save(str(target_image_path))

            width = pix.width
            height = pix.height

            # Explicitly clean up PyMuPDF objects to free RAM
            del pix
            del page
            doc.close()
            del doc
            gc.collect()

        elif ext in [".docx", ".doc", ".xlsx", ".xls", ".csv"]:
            from .office_converter import office_converter
            converted_pdf = doc_path.with_name(f"{doc_path.stem}_converted.pdf")
            if not converted_pdf.exists():
                office_converter.convert_to_pdf(doc_path, converted_pdf)
            return PageRenderer.render_page(converted_pdf, page_number, dpi)

        elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif"]:
            with Image.open(doc_path) as img:
                img_rgb = img.convert("RGB")
                img_rgb.save(str(target_image_path), "PNG")
                width, height = img.size

        else:
            raise ValueError(f"Unsupported format for rendering: {ext}")

        # Automatically remove background watermarks and clean background illumination
        from .preprocessor import image_preprocessor
        image_preprocessor.clean_page_image_file(target_image_path)

        logger.info(f"Page {page_number} rendered to {target_image_path.name} ({width}x{height}px)")

        return {
            "page_number": page_number,
            "image_path": str(target_image_path),
            "relative_url": f"/data/documents/{doc_path.stem}/{target_image_path.name}",
            "width": width,
            "height": height,
            "dpi": dpi,
        }

page_renderer = PageRenderer()
