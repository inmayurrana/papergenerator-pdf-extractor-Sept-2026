from pathlib import Path
from typing import Dict, Any
import pymupdf  # type: ignore
from ..core.storage import storage_service
from .office_converter import office_converter

SUPPORTED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif",
    ".docx", ".doc", ".xlsx", ".xls", ".csv"
}

class DocumentValidator:
    @staticmethod
    def validate_file(filepath: Path) -> Dict[str, Any]:
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        ext = filepath.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file format: {ext}. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}")

        # If office document (Word or Excel), convert to standardized digital PDF
        active_filepath = filepath
        is_office_doc = ext in [".docx", ".doc", ".xlsx", ".xls", ".csv"]
        converted_pdf_path = None

        if is_office_doc:
            converted_pdf_path = filepath.with_name(f"{filepath.stem}_converted.pdf")
            office_converter.convert_to_pdf(filepath, converted_pdf_path)
            active_filepath = converted_pdf_path

        file_size_bytes = filepath.stat().st_size
        sha256 = storage_service.compute_sha256(filepath)

        active_ext = active_filepath.suffix.lower()
        is_pdf = active_ext == ".pdf"
        page_count = 1
        has_digital_text = False
        text_char_count = 0

        if is_pdf:
            try:
                doc = pymupdf.open(str(active_filepath))
                page_count = len(doc)
                for page in doc:
                    txt = page.get_text().strip()
                    text_char_count += len(txt)
                has_digital_text = text_char_count > (15 * page_count)
                doc.close()
            except Exception as e:
                raise ValueError(f"Failed to parse PDF: {str(e)}")

        return {
            "filename": filepath.name,
            "extension": ext,
            "size_bytes": file_size_bytes,
            "sha256": sha256,
            "page_count": page_count,
            "is_pdf": is_pdf,
            "is_digital": has_digital_text or is_office_doc,
            "is_scanned": not has_digital_text if is_pdf and not is_office_doc else True,
            "detected_chars": text_char_count,
            "converted_pdf_path": str(converted_pdf_path) if converted_pdf_path else None,
        }

document_validator = DocumentValidator()
