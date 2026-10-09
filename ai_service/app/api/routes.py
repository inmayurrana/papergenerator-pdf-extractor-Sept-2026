import asyncio
import gc
import logging
import re
import cv2  # type: ignore
import numpy as np  # type: ignore
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response, Query  # type: ignore
from pydantic import BaseModel  # type: ignore

from ..core.config import config
from ..core.resource_mgr import resource_manager
from ..core.storage import storage_service
from ..document.validator import document_validator
from ..document.renderer import page_renderer
from ..document.digital_extract import digital_extractor
from ..document.preprocessor import image_preprocessor
from ..layout.region_detector import region_detector
from ..layout.reading_order import reading_order_sorter
from ..layout.question_parser import question_parser
from ..engines.router import ocr_router
from ..engines.diagram_extractor import diagram_extractor
from ..engines.ocr_extractor import ocr_extractor
from ..snip.snip_engine import snipping_engine
from ..omr.generator import omr_generator
from ..omr.evaluator import omr_evaluator
from ..core.translator import translation_service
from ..document.export_engine import ExportEngine

logger = logging.getLogger("api_routes")
router = APIRouter(prefix="/api")

def resolve_file_path(input_path: Optional[str], default_subfolder: Optional[Path] = None) -> Path:
    """
    Robustly resolves a file path across different machines, operating systems, and installations.
    Handles:
    - Current machine absolute paths
    - Stale absolute paths from a previous machine (e.g. D:\\Recovered_school_app\\...)
    - URL paths (e.g. /data/uploads/foo.pdf, /data/documents/foo/bar.png)
    - Relative paths (e.g. uploads/foo.pdf)
    - Bare filenames
    """
    if not input_path:
        raise HTTPException(status_code=400, detail="File path is empty or not provided")

    p = Path(input_path)
    if p.exists():
        return p

    clean = str(input_path).replace("\\", "/").lstrip("/")
    if clean.startswith("data/"):
        clean = clean[5:]
    elif clean.startswith("api/"):
        clean = clean[4:]

    # 1. Try DATA_DIR / clean
    data_cand = config.DATA_DIR / clean
    if data_cand.exists():
        return data_cand

    # 2. Try BASE_DIR / clean
    base_cand = config.BASE_DIR / clean
    if base_cand.exists():
        return base_cand

    # 3. Try filename inside common subdirectories
    fname = p.name
    candidates = [
        config.STORAGE_UPLOADS / fname,
        config.STORAGE_DOCUMENTS / fname,
        config.STORAGE_DIAGRAMS / fname,
        config.STORAGE_SNIPS / fname,
        config.STORAGE_OMR / fname,
        config.STORAGE_EXPORTS / fname,
        config.STORAGE_FORMULAS / fname,
        config.DATA_DIR / fname,
    ]
    if default_subfolder:
        candidates.insert(0, default_subfolder / fname)

    for c in candidates:
        if c.exists():
            return c

    # 4. Check nested document renders like /data/documents/<doc_stem>/<page>.png
    parts = clean.split("/")
    if len(parts) >= 2:
        nested_cand = config.DATA_DIR / "/".join(parts)
        if nested_cand.exists():
            return nested_cand
        nested_doc_cand = config.STORAGE_DOCUMENTS / "/".join(parts[-2:])
        if nested_doc_cand.exists():
            return nested_doc_cand

    if default_subfolder:
        return default_subfolder / fname
    return data_cand

# Models for request schemas
class ProcessPageRequest(BaseModel):
    doc_path: str
    doc_id: str
    page_number: int  # 1-indexed
    profile: str = "BALANCED"  # FAST, BALANCED, HIGH_ACCURACY, MAXIMUM_ACCURACY
    force_ocr: bool = False

class SnipRequest(BaseModel):
    page_image_path: str
    bbox: List[int]  # [x, y, w, h]
    mode: str = "AUTO"  # AUTO, TEXT, MATH, CHEM, DIAGRAM

class OMRGenerateRequest(BaseModel):
    exam_title: str = "OFFLINE EXAMINATION OMR SHEET"
    exam_code: str = "EXAM-101"
    total_questions: int = 30
    options_per_question: int = 4
    answer_key: Optional[Dict[str, str]] = None

class OMREvaluateRequest(BaseModel):
    omr_image_path: str
    template_metadata: Dict[str, Any]
    answer_key: Dict[str, str]
    positive_marks: float = 1.0
    negative_marks: float = 0.0

class GenerateFromTextRequest(BaseModel):
    title: str = "Pasted Document"
    raw_text: str
    profile: str = "BALANCED"

class DetectLanguageRequest(BaseModel):
    text: str

class TranslateTextRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: Optional[str] = "auto"

@router.post("/languages/detect")
async def detect_text_language(req: DetectLanguageRequest):
    """Detects the language of raw text with Indic script heuristic and langdetect."""
    res = await asyncio.to_thread(translation_service.detect_language, req.text)
    return {"status": "SUCCESS", "data": res}

@router.post("/languages/translate")
async def translate_text(req: TranslateTextRequest):
    """Translates question text while preserving LaTeX formulas, options, and marks brackets."""
    res = await asyncio.to_thread(
        translation_service.translate_exam_text,
        text=req.text,
        target_lang=req.target_lang,
        source_lang=req.source_lang,
    )
    return {"status": "SUCCESS", "data": res}

@router.get("/resource-status")
async def get_resource_status():
    """Returns hardware usage (CPU %, RAM MB, VRAM, active workers, loaded models)."""
    return resource_manager.get_hardware_metrics()

@router.get("/models")
async def list_models():
    """Lists all available AI/OCR engine adapters with hardware specs and status."""
    return ocr_router.list_engines()

@router.post("/models/unload")
async def unload_all_models():
    """Manually releases all heavy models from RAM/VRAM."""
    resource_manager.unload_all_models()
    return {"status": "SUCCESS", "message": "All loaded model memory released."}

class ModelToggleRequest(BaseModel):
    enabled: Optional[bool] = None

@router.post("/models/{engine_name}/toggle")
async def toggle_model_engine(engine_name: str, payload: Optional[ModelToggleRequest] = None):
    """Toggles or sets the enabled state for a specific OCR/AI engine."""
    enabled_val = payload.enabled if payload else None
    new_state = ocr_router.toggle_engine(engine_name, enabled_val)
    return {
        "status": "SUCCESS",
        "engine": engine_name,
        "is_enabled": new_state,
        "message": f"Engine '{engine_name}' is now {'ENABLED' if new_state else 'DISABLED'}."
    }

@router.post("/models/{engine_name}/restart")
async def restart_model_engine(engine_name: str):
    """Restarts a specific engine and reclaims cached allocations."""
    res = ocr_router.restart_engine(engine_name)
    return {
        "status": "SUCCESS",
        "engine": engine_name,
        "data": res,
        "message": f"Engine '{engine_name}' has been successfully restarted."
    }

@router.post("/models/restart-all")
async def restart_all_model_engines():
    """Restarts all pluggable engine adapters and flushes model caches."""
    res = ocr_router.restart_all_engines()
    return {
        "status": "SUCCESS",
        "data": res,
        "message": "All pluggable engines have been restarted."
    }

@router.post("/documents/validate")
async def validate_document(doc_path: str = Form(...)):
    """Validates file format, computes SHA-256 hash, and detects digital text."""
    p = resolve_file_path(doc_path, config.STORAGE_UPLOADS)
    try:
        res = document_validator.validate_file(p)
        return {"status": "SUCCESS", "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/documents/ocr-image")
async def extract_text_from_image_document(
    image_path: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Extracts text from an image document into digital text in the same language.
    Preserves question numbers, equations, options (A)-(D), and formatting verbatim.
    Automatically detects and identifies the language.
    """
    import os
    import tempfile
    from PIL import Image

    target_path = None
    temp_file = None

    try:
        if file and file.filename:
            suffix = Path(file.filename).suffix or ".png"
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            content = await file.read()
            temp_file.write(content)
            temp_file.close()
            target_path = Path(temp_file.name)
        elif image_path:
            target_path = resolve_file_path(image_path, config.STORAGE_UPLOADS)
        else:
            raise HTTPException(status_code=400, detail="No image file or image_path provided")

        if not target_path.exists():
            raise HTTPException(status_code=404, detail=f"Image file not found: {target_path}")

        # Open image with PIL to verify dimensions
        with Image.open(target_path) as img:
            img_w, img_h = img.size

        # Run OCR extractor (RapidOCR + reading order sorter)
        spans = await asyncio.to_thread(ocr_extractor.extract_page_text_spans, str(target_path), img_w, img_h)
        sorted_spans = await asyncio.to_thread(reading_order_sorter.sort_regions, spans, img_w)

        # Assemble lines into structured digital text
        lines = [s["text"].strip() for s in sorted_spans if s.get("text", "").strip()]
        full_text = "\n".join(lines)

        # Detect language of the extracted text
        lang_info = translation_service.detect_language(full_text) if full_text else {"language": "en", "name": "English", "confidence": 1.0}

        avg_conf = 0.0
        if sorted_spans:
            avg_conf = round(sum(s.get("confidence", 0.0) for s in sorted_spans) / len(sorted_spans), 3)

        return {
            "status": "SUCCESS",
            "data": {
                "extracted_text": full_text,
                "detected_language": lang_info["language"],
                "language_name": lang_info["name"],
                "confidence": avg_conf,
                "script": lang_info.get("script", ""),
                "spans_count": len(sorted_spans),
                "lines_count": len(lines),
                "words_count": len(full_text.split()) if full_text else 0,
                "chars_count": len(full_text),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image text extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except Exception:
                pass

@router.post("/documents/from-text")
async def generate_document_from_text(req: GenerateFromTextRequest):
    """
    Generates a high-quality multi-page PDF document from raw pasted text,
    preserving exact line breaks, indentation, formulas, and characters verbatim.
    """
    import hashlib
    import time
    import re
    import pymupdf
    from ..document.office_converter import get_unicode_font_args

    raw_text = req.raw_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Pasted text cannot be empty.")

    clean_title = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', req.title.strip()) or "pasted_document"
    unique_suffix = f"{int(time.time())}_{hashlib.md5(raw_text.encode('utf-8')).hexdigest()[:8]}"
    pdf_filename = f"{clean_title}_{unique_suffix}.pdf"
    target_pdf_path = config.STORAGE_UPLOADS / pdf_filename

    doc = pymupdf.open()
    page_w, page_h = 595, 842  # Standard A4
    margin_left, margin_right = 50, 545
    margin_top, margin_bottom = 50, 792

    current_page = doc.new_page(width=page_w, height=page_h)
    current_y = margin_top

    font_args_bold = get_unicode_font_args(True)
    font_args_reg = get_unicode_font_args(False)

    if req.title:
        current_page.insert_textbox(
            pymupdf.Rect(margin_left, current_y, margin_right, current_y + 24),
            req.title.upper(),
            fontsize=13,
            color=(0.1, 0.1, 0.2),
            **font_args_bold
        )
        current_y += 24
        shape = current_page.new_shape()
        shape.draw_line(pymupdf.Point(margin_left, current_y - 8), pymupdf.Point(margin_right, current_y - 8))
        shape.finish(color=(0.7, 0.7, 0.8), width=1)
        shape.commit()
        current_y += 10

    lines = raw_text.splitlines()
    if not lines:
        lines = [raw_text]

    line_height = 16
    for line in lines:
        if current_y + line_height > margin_bottom:
            current_page = doc.new_page(width=page_w, height=page_h)
            current_y = margin_top

        rect = pymupdf.Rect(margin_left, current_y, margin_right, margin_bottom)
        rc = current_page.insert_textbox(rect, line if line.strip() else " ", fontsize=10.5, **font_args_reg)
        if rc < 0:
            current_page = doc.new_page(width=page_w, height=page_h)
            current_y = margin_top
            rect = pymupdf.Rect(margin_left, current_y, margin_right, margin_bottom)
            current_page.insert_textbox(rect, line if line.strip() else " ", fontsize=10.5, **font_args_reg)
            current_y += line_height
        else:
            used_h = (margin_bottom - current_y) - rc
            current_y += max(line_height, used_h + 3)

    page_count = len(doc)
    doc.save(str(target_pdf_path))
    doc.close()

    with open(target_pdf_path, "rb") as f:
        file_bytes = f.read()
        sha256 = hashlib.sha256(file_bytes).hexdigest()

    return {
        "status": "SUCCESS",
        "doc_path": str(target_pdf_path),
        "filename": pdf_filename,
        "page_count": page_count,
        "is_digital": True,
        "sha256": sha256,
        "file_size_bytes": len(file_bytes),
    }

@router.post("/documents/process-page")
async def process_page_sequentially(req: ProcessPageRequest):
    """
    Core sequential page processing pipeline:
    1. Acquires sequential lock (enforces 1 heavy AI job at a time on 8GB RAM).
    2. Renders requested page to image.
    3. Extracts embedded digital text or runs preprocessor + OCR router.
    4. Detects layout regions, reading order, and diagrams.
    5. Reconstructs structured questions, MCQ options, formulas, and marks.
    6. Releases PyMuPDF objects and cleans intermediate memory.
    """
    async with resource_manager.heavy_job_semaphore:
        resource_manager.active_jobs_count += 1
        try:
            doc_p = resolve_file_path(req.doc_path, config.STORAGE_UPLOADS)

            if not doc_p.exists():
                raise HTTPException(status_code=404, detail=f"Document file not found: {doc_p.name}")

            # 1. Render single page
            render_res = page_renderer.render_page(doc_p, req.page_number)
            page_img_path = render_res["image_path"]
            img_w = render_res["width"]
            img_h = render_res["height"]

            # 2. Check digital vs scanned text / image
            regions = []
            spans = []
            is_pdf = doc_p.suffix.lower() == ".pdf"
            pdf_path_for_vector = doc_p if is_pdf else None

            # If office document (Word or Excel), route to the correct extractor
            docx_source = None
            if doc_p.suffix.lower() in [".docx", ".doc"]:
                docx_source = doc_p
            elif "_converted" in doc_p.stem:
                orig_stem = doc_p.stem.replace("_converted", "")
                for o_ext in [".docx", ".doc"]:
                    cand = doc_p.with_name(orig_stem + o_ext)
                    if cand.exists():
                        docx_source = cand
                        break

            if docx_source and docx_source.exists():
                # For Word documents: ALWAYS extract directly from the .docx file.
                # This preserves OMML math equations as proper LaTeX $...$.
                try:
                    spans = digital_extractor.extract_docx_text_spans(docx_source, req.page_number, img_w, img_h)
                    logger.info(f"DOCX direct extraction: {len(spans)} spans for {docx_source.name} page {req.page_number}")
                except Exception as docx_err:
                    logger.warning(f"DOCX direct extraction failed ({docx_err}), will fall through to PDF/OCR")
                    spans = []
            elif not is_pdf and doc_p.suffix.lower() in [".xlsx", ".xls", ".csv"]:
                # For xlsx/csv: convert to PDF then extract vector text
                converted_p = doc_p.with_name(f"{doc_p.stem}_converted.pdf")
                if not converted_p.exists():
                    from ..document.office_converter import office_converter
                    office_converter.convert_to_pdf(doc_p, converted_p)
                if converted_p.exists():
                    pdf_path_for_vector = converted_p

            page_bgr = cv2.imread(str(page_img_path))
            from ..engines.geometric_math_detector import geometric_math_detector

            # 3. Detect visual diagrams via OpenCV contours
            diagram_regions = region_detector.detect_diagram_regions_from_image(page_img_path)
            saved_diagrams = []
            for d in diagram_regions:
                diag_crop_res = diagram_extractor.crop_and_save_diagram(
                    page_img_path, d["bbox"], req.doc_id, req.page_number
                )
                saved_diagrams.append(diag_crop_res)

            def _process_spans_into_questions(input_spans):
                nonlocal page_bgr, saved_diagrams
                proc_regions = []
                for s in input_spans:
                    classification = region_detector.classify_text_region(s["text"], s["bbox"], img_h)
                    rtype = classification["type"]

                    crop_img = None
                    crop_url = ""
                    try:
                        if page_bgr is not None and (rtype in ["MATH", "MATHEMATICS", "OPTION", "MIXED"] or any(c in s["text"] for c in "πθαβγδεθ√∫∑∏±×÷≠≤≥∞^/")):
                            crop_info = geometric_math_detector.crop_formula_pixels(
                                page_bgr, s["bbox"], pad_x=12, pad_y=12, save_to_disk=True, filename_prefix=f"doc_{req.doc_id}_p{req.page_number}"
                            )
                            crop_img = crop_info["crop"]
                            crop_url = crop_info["crop_url"]
                    except Exception as crop_err:
                        logger.warning("Formula pixel crop failed, falling back to text: %s", crop_err)
                        crop_img = None
                        crop_url = ""

                    try:
                        routed = ocr_router.route_and_process_region(
                            s["text"], rtype, req.profile, crop_img=crop_img, crop_url=crop_url
                        )
                    except Exception as route_err:
                        logger.warning("Region routing failed for %r: %s", s.get("text", "")[:30], route_err)
                        routed = {
                            "processed_text": s["text"],
                            "confidence": 0.85,
                            "validation_status": "NEEDS_REVIEW",
                            "needs_review": True,
                            "specialized_data": {},
                        }

                    proc_regions.append({
                        "id": s["id"],
                        "type": rtype,
                        "text": routed["processed_text"],
                        "raw_text": s["text"],
                        "bbox": s["bbox"],
                        "confidence": routed["confidence"],
                        "validation_status": routed.get("validation_status", "VALIDATED"),
                        "needs_review": routed.get("needs_review", False),
                        "crop_url": crop_url,
                        "source": s["source"],
                        "formula_objects": s.get("formula_objects", []),
                        "specialized_data": routed.get("specialized_data", {}),
                        "question_number": classification.get("question_number"),
                        "option_label": classification.get("option_label"),
                        "sub_label": classification.get("sub_label"),
                        "answer_key": classification.get("answer_key"),
                    })

                sorted_r = reading_order_sorter.sort_regions(proc_regions, img_w)
                struct_q = question_parser.build_structured_questions(sorted_r, saved_diagrams)
                return sorted_r, struct_q

            # Extraction routing: force_ocr directly invokes RapidOCR on rendered page image
            if req.force_ocr:
                logger.info(f"Force OCR enabled for {doc_p.name} page {req.page_number}")
                spans = ocr_extractor.extract_page_text_spans(page_img_path, img_w, img_h)
            else:
                if pdf_path_for_vector and pdf_path_for_vector.exists() and not spans:
                    # Fast direct vector extraction for digital PDFs preserving exact math and formulas
                    spans = digital_extractor.extract_page_text_spans(pdf_path_for_vector, req.page_number, img_w, img_h)

                # If not a PDF or if PDF has no digital vector text (scanned PDF / image):
                if not spans:
                    # High-Accuracy Offline OCR directly on page image
                    spans = ocr_extractor.extract_page_text_spans(page_img_path, img_w, img_h)

            sorted_regions, structured_questions = _process_spans_into_questions(spans)

            # AUTOMATIC FALLBACK FOR SCANNED PDFS / SPARSE EXTRACTIONS:
            # If digital extraction yielded 0 structured questions and force_ocr was not already executed:
            if len(structured_questions) == 0 and not req.force_ocr:
                logger.info(f"0 questions extracted from digital text on {doc_p.name} page {req.page_number}. Automatically triggering High-Accuracy RapidOCR fallback.")
                ocr_spans = ocr_extractor.extract_page_text_spans(page_img_path, img_w, img_h)
                if ocr_spans:
                    ocr_regions, ocr_questions = _process_spans_into_questions(ocr_spans)
                    if len(ocr_questions) > len(structured_questions) or len(ocr_regions) > len(sorted_regions):
                        logger.info(f"RapidOCR fallback successful: extracted {len(ocr_questions)} questions from {len(ocr_regions)} regions.")
                        sorted_regions = ocr_regions
                        structured_questions = ocr_questions


            # 6. Overall page confidence calculation & Strict Review Quality Control
            all_confs = [r.get("confidence", 0.95) for r in sorted_regions]
            page_avg_conf = round(sum(all_confs) / max(len(all_confs), 1), 3) if all_confs else 0.95
            has_unverified_formulas = any(r.get("needs_review") for r in sorted_regions)
            page_needs_review = has_unverified_formulas or (page_avg_conf < config.CONFIDENCE_BALANCED_THRESHOLD)

            # Immediate garbage collection to free RAM
            gc.collect()

            return {
                "status": "SUCCESS",
                "page_number": req.page_number,
                "page_image": render_res["relative_url"],
                "width": img_w,
                "height": img_h,
                "overall_confidence": page_avg_conf,
                "needs_review": page_needs_review,
                "regions": sorted_regions,
                "diagrams": saved_diagrams,
                "questions": structured_questions,
            }
        finally:
            resource_manager.active_jobs_count -= 1

@router.post("/snip/process")
async def process_visual_snip(req: SnipRequest):
    """Processes localized visual crop bounding box on demand."""
    img_p = resolve_file_path(req.page_image_path, config.STORAGE_DOCUMENTS)

    try:
        snip_res = snipping_engine.process_snip(str(img_p), req.bbox, req.mode)
        return {"status": "SUCCESS", "data": snip_res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/omr/generate")
async def generate_omr(req: OMRGenerateRequest):
    """Generates standard OMR answer sheet template + filled master answer key with fiducials."""
    try:
        omr_res = omr_generator.generate_omr_template(
            exam_title=req.exam_title,
            exam_code=req.exam_code,
            total_questions=req.total_questions,
            options_per_question=req.options_per_question,
            answer_key=req.answer_key,
        )
        return {"status": "SUCCESS", "data": omr_res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/omr/evaluate")
async def evaluate_omr(req: OMREvaluateRequest):
    """Evaluates uploaded OMR sheet scan against answer key snapshot."""
    img_p = resolve_file_path(req.omr_image_path, config.STORAGE_OMR)

    try:
        eval_res = omr_evaluator.evaluate_omr_sheet(
            omr_image_path=str(img_p),
            template_metadata=req.template_metadata,
            answer_key=req.answer_key,
            positive_marks_per_q=req.positive_marks,
            negative_marks_per_q=req.negative_marks,
        )
        return {"status": "SUCCESS", "data": eval_res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DetectCandidateRequest(BaseModel):
    omr_image_path: str

@router.post("/omr/detect-candidate-info")
async def detect_candidate_info_endpoint(req: DetectCandidateRequest):
    """Runs RapidOCR on the OMR candidate header to extract handwritten/printed Student Name and Roll Number."""
    img_p = resolve_file_path(req.omr_image_path, config.STORAGE_OMR)

    try:
        cand_res = omr_evaluator.detect_candidate_info(str(img_p))
        return {"status": "SUCCESS", "data": cand_res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ADAPTIVE CONTINUOUS LEARNING MEMORY ENDPOINTS ---

class LearnCorrectionRequest(BaseModel):
    raw_text: str
    corrected_text: str
    image_path: Optional[str] = None
    context_domain: str = "GENERAL"

@router.post("/learning/learn")
async def learn_from_user_correction(req: LearnCorrectionRequest):
    """Learns token, formula and OCR substitution rules from user correction and persists for future extractions."""
    try:
        from ..document.learning_memory import learning_memory_engine
        res = learning_memory_engine.record_user_correction(
            raw_text=req.raw_text,
            corrected_text=req.corrected_text,
            image_path=req.image_path,
            context_domain=req.context_domain,
        )
        return {"status": "SUCCESS", "data": res}
    except Exception as e:
        logger.error(f"Failed to learn from correction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/learning/patterns")
async def get_learned_patterns():
    """Returns all active learned memory rules and match statistics."""
    try:
        from ..document.learning_memory import learning_memory_engine
        return {"status": "SUCCESS", "data": learning_memory_engine.get_memory_stats()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/learning/patterns/{rule_id}")
async def delete_learned_pattern(rule_id: str):
    """Deletes a specific learned rule from memory."""
    from ..document.learning_memory import learning_memory_engine
    deleted = learning_memory_engine.delete_rule(rule_id)
    return {"status": "SUCCESS", "deleted": deleted}

# --- UNIVERSAL EXPORT & IMPORT ENDPOINTS ---

class QuestionsPdfRequest(BaseModel):
    questions: List[Dict[str, Any]]
    title: Optional[str] = "Question Bank & Answer Key"
    folder_name: Optional[str] = "General"
    include_answers: Optional[bool] = True

class PaperPdfRequest(BaseModel):
    paper_data: Dict[str, Any]
    include_answers: Optional[bool] = False

class TextPdfRequest(BaseModel):
    title: str
    text: str
    meta: Optional[Dict[str, Any]] = None

@router.post("/export/questions-pdf")
async def export_questions_pdf_endpoint(req: QuestionsPdfRequest):
    """Generates an A4 PDF containing Question Bank questions, options, and comprehensive Answer Key."""
    try:
        pdf_bytes = await asyncio.to_thread(
            ExportEngine.generate_questions_pdf,
            questions=req.questions,
            title=req.title or "Question Bank & Answer Key",
            folder_name=req.folder_name or "General",
            include_answers=req.include_answers if req.include_answers is not None else True,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="question_bank.pdf"'},
        )
    except Exception as e:
        logger.error(f"Failed to generate questions PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/paper-pdf")
async def export_paper_pdf_endpoint(req: PaperPdfRequest):
    """Generates an A4 examination paper PDF with school header, candidate info, and optional marking scheme."""
    try:
        pdf_bytes = await asyncio.to_thread(
            ExportEngine.generate_paper_pdf,
            paper_data=req.paper_data,
            include_answers=req.include_answers or False,
        )
        safe_title = re.sub(r"[^a-zA-Z0-9_-]", "_", req.paper_data.get("title", "Question_Paper"))
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )
    except Exception as e:
        logger.error(f"Failed to generate paper PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/text-pdf")
async def export_text_pdf_endpoint(req: TextPdfRequest):
    """Converts extracted OCR text or translated text into a formatted PDF document."""
    try:
        pdf_bytes = await asyncio.to_thread(
            ExportEngine.generate_text_pdf,
            title=req.title,
            text=req.text,
            meta=req.meta,
        )
        safe_title = re.sub(r"[^a-zA-Z0-9_-]", "_", req.title or "Document")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )
    except Exception as e:
        logger.error(f"Failed to generate text PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/parse-questions-file")
async def parse_questions_file_endpoint(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None),
):
    """Extracts structured questions and answers from Word (.docx), PDF (.pdf), or plain text files."""
    try:
        target_path: Optional[Path] = None
        if file_path:
            target_path = resolve_file_path(file_path, config.STORAGE_UPLOADS)
        elif file:
            suffix = Path(file.filename or "uploaded.docx").suffix
            import tempfile
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            content = await file.read()
            tmp.write(content)
            tmp.close()
            target_path = Path(tmp.name)
        else:
            raise HTTPException(status_code=400, detail="Either file or file_path is required")

        if not target_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {target_path}")

        ext = target_path.suffix.lower()
        if ext in [".docx", ".doc"]:
            questions = await asyncio.to_thread(ExportEngine.parse_word_file, target_path)
        elif ext == ".pdf":
            questions = await asyncio.to_thread(ExportEngine.parse_pdf_file, target_path)
        elif ext in [".txt", ".json", ".csv"]:
            raw_text = target_path.read_text(encoding="utf-8", errors="ignore")
            questions = await asyncio.to_thread(ExportEngine.parse_questions_from_text, raw_text)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format {ext}. Use .docx, .pdf, or .txt")

        return {"status": "SUCCESS", "questions": questions, "count": len(questions)}
    except Exception as e:
        logger.error(f"Failed to parse questions file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ExtractRawTextRequest(BaseModel):
    file_path: Optional[str] = None

@router.post("/import/extract-raw-text")
async def extract_raw_text_endpoint(
    req: Optional[ExtractRawTextRequest] = None,
    file: Optional[UploadFile] = File(None),
):
    """Extracts all raw digital text from Word (.docx), PDF (.pdf), or text files."""
    try:
        target_path: Optional[Path] = None
        if req and req.file_path:
            target_path = resolve_file_path(req.file_path, config.STORAGE_UPLOADS)
        elif file:
            suffix = Path(file.filename or "uploaded.txt").suffix
            import tempfile
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            content = await file.read()
            tmp.write(content)
            tmp.close()
            target_path = Path(tmp.name)
        else:
            raise HTTPException(status_code=400, detail="Either file or file_path is required")

        if not target_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {target_path}")

        raw_text = await asyncio.to_thread(ExportEngine.extract_file_raw_text, target_path)
        return {"status": "SUCCESS", "text": raw_text, "length": len(raw_text)}
    except Exception as e:
        logger.error(f"Failed to extract raw text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------
# Advanced Mathematical, Scientific, Physics & Chemistry Routes
# -------------------------------------------------------------

class ScientificRecognizeRequest(BaseModel):
    crop_path: Optional[str] = None
    crop_base64: Optional[str] = None
    ocr_text: Optional[str] = ""
    mode: str = "AUTO"  # AUTO, MATH, PHYSICS, CHEMISTRY, DIAGRAM, ALL

class ScientificValidateRequest(BaseModel):
    latex: str
    crop_path: Optional[str] = None
    crop_base64: Optional[str] = None
    mode: str = "MATH"

class ScientificSettingsUpdate(BaseModel):
    formula_detection_threshold: Optional[float] = 0.75
    formula_confidence_threshold: Optional[float] = 0.85
    visual_similarity_threshold: Optional[float] = 0.85
    max_upscale_factor: Optional[int] = 2
    max_processing_resolution: Optional[int] = 1200
    enable_math_engine: Optional[bool] = True
    enable_physics_engine: Optional[bool] = True
    enable_chemistry_engine: Optional[bool] = True
    engine_priority: Optional[str] = "SPECIALIZED_FIRST"
    max_ai_workers: Optional[int] = 1
    gpu_memory_limit_mb: Optional[int] = 3072
    ram_safety_threshold_mb: Optional[int] = 5120

SETTINGS_FILE = config.DATA_DIR / "scientific_settings.json"

def _load_scientific_settings() -> Dict[str, Any]:
    defaults = {
        "formula_detection_threshold": 0.75,
        "formula_confidence_threshold": 0.85,
        "visual_similarity_threshold": 0.85,
        "max_upscale_factor": 2,
        "max_processing_resolution": 1200,
        "enable_math_engine": True,
        "enable_physics_engine": True,
        "enable_chemistry_engine": True,
        "engine_priority": "SPECIALIZED_FIRST",
        "max_ai_workers": 1,
        "gpu_memory_limit_mb": 3072,
        "ram_safety_threshold_mb": 5120,
    }
    if SETTINGS_FILE.exists():
        try:
            import json
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            defaults.update(data)
        except Exception as e:
            logger.warning(f"Failed to read scientific settings: {e}")
    return defaults

def _decode_image_payload(crop_path: Optional[str], crop_base64: Optional[str]) -> Optional[Any]:
    import base64
    import cv2  # type: ignore
    import numpy as np  # type: ignore

    if crop_base64:
        header_split = crop_base64.split(",", 1)
        b64_str = header_split[1] if len(header_split) > 1 else header_split[0]
        raw_bytes = base64.b64decode(b64_str)
        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if crop_path:
        p = resolve_file_path(crop_path, config.STORAGE_DIAGRAMS)
        if p.exists():
            return cv2.imread(str(p))

    return None

@router.post("/scientific/recognize")
async def recognize_scientific_content(req: ScientificRecognizeRequest):
    """Processes a formula/scientific crop with AST construction, LaTeX, MathML, and rendering validation."""
    from ..scientific.subsystem import scientific_subsystem
    import cv2  # type: ignore
    import numpy as np  # type: ignore

    img = _decode_image_payload(req.crop_path, req.crop_base64)
    ocr_text = (req.ocr_text or "").strip()

    if img is None and not ocr_text:
        raise HTTPException(status_code=400, detail="Either a valid crop (path/base64) or ocr_text must be provided")

    # If image is provided but no ocr_text, run region OCR
    if img is not None and not ocr_text:
        from ..engines.tesseract_adapter import tesseract_adapter
        ocr_res = await asyncio.to_thread(tesseract_adapter.process_region, img)
        ocr_text = ocr_res.get("text", "")

    result = await asyncio.to_thread(
        scientific_subsystem.process_formula_crop,
        crop_image=img,
        ocr_text=ocr_text,
        mode=req.mode,
    )
    return {"status": "SUCCESS", "data": result}

@router.post("/scientific/validate-visual")
async def validate_formula_rendering(req: ScientificValidateRequest):
    """Renders candidate LaTeX to image and compares visual similarity against the original crop."""
    from ..scientific.visual_validator import visual_validator

    img = _decode_image_payload(req.crop_path, req.crop_base64)
    eval_res = await asyncio.to_thread(
        visual_validator.evaluate_multi_dimensional_confidence,
        crop_img=img,
        formula_latex=req.latex,
        recognition_conf=0.95,
        structural_valid=True,
        domain_conf=0.90,
    )
    return {"status": "SUCCESS", "data": eval_res}

@router.get("/scientific/symbols")
async def get_scientific_symbols():
    """Returns the comprehensive 15-category symbol palette for mathematical and scientific editing."""
    palette = {
        "categories": [
            {
                "id": "arithmetic",
                "name": "Arithmetic",
                "symbols": [
                    {"label": "+", "latex": "+", "unicode": "+"},
                    {"label": "−", "latex": "-", "unicode": "−"},
                    {"label": "×", "latex": "\\times", "unicode": "×"},
                    {"label": "÷", "latex": "\\div", "unicode": "÷"},
                    {"label": "/", "latex": "/", "unicode": "/"},
                    {"label": "=", "latex": "=", "unicode": "="},
                    {"label": "≠", "latex": "\\neq", "unicode": "≠"},
                    {"label": "±", "latex": "\\pm", "unicode": "±"},
                    {"label": "∓", "latex": "\\mp", "unicode": "∓"},
                    {"label": "%", "latex": "\\%", "unicode": "%"},
                ]
            },
            {
                "id": "algebra",
                "name": "Algebra",
                "symbols": [
                    {"label": "√x", "latex": "\\sqrt{x}", "unicode": "√"},
                    {"label": "∛x", "latex": "\\sqrt[3]{x}", "unicode": "∛"},
                    {"label": "x²", "latex": "x^2", "unicode": "x²"},
                    {"label": "x³", "latex": "x^3", "unicode": "x³"},
                    {"label": "xⁿ", "latex": "x^n", "unicode": "xⁿ"},
                    {"label": "x₁", "latex": "x_1", "unicode": "x₁"},
                    {"label": "x₂", "latex": "x_2", "unicode": "x₂"},
                    {"label": "aₙ", "latex": "a_n", "unicode": "aₙ"},
                    {"label": "a/b", "latex": "\\frac{a}{b}", "unicode": "a/b"},
                    {"label": "∝", "latex": "\\propto", "unicode": "∝"},
                    {"label": "≈", "latex": "\\approx", "unicode": "≈"},
                    {"label": "≡", "latex": "\\equiv", "unicode": "≡"},
                ]
            },
            {
                "id": "calculus",
                "name": "Calculus",
                "symbols": [
                    {"label": "∫", "latex": "\\int", "unicode": "∫"},
                    {"label": "∬", "latex": "\\iint", "unicode": "∬"},
                    {"label": "∭", "latex": "\\iiint", "unicode": "∭"},
                    {"label": "∮", "latex": "\\oint", "unicode": "∮"},
                    {"label": "d/dx", "latex": "\\frac{d}{dx}", "unicode": "d/dx"},
                    {"label": "∂", "latex": "\\partial", "unicode": "∂"},
                    {"label": "∇", "latex": "\\nabla", "unicode": "∇"},
                    {"label": "Δ", "latex": "\\Delta", "unicode": "Δ"},
                    {"label": "lim", "latex": "\\lim_{x \\to 0}", "unicode": "lim"},
                ]
            },
            {
                "id": "geometry",
                "name": "Geometry",
                "symbols": [
                    {"label": "∠", "latex": "\\angle", "unicode": "∠"},
                    {"label": "⊥", "latex": "\\perp", "unicode": "⊥"},
                    {"label": "∥", "latex": "\\parallel", "unicode": "∥"},
                    {"label": "°", "latex": "^{\\circ}", "unicode": "°"},
                    {"label": "△", "latex": "\\triangle", "unicode": "△"},
                    {"label": "≅", "latex": "\\cong", "unicode": "≅"},
                    {"label": "∼", "latex": "\\sim", "unicode": "∼"},
                ]
            },
            {
                "id": "trigonometry",
                "name": "Trigonometry",
                "symbols": [
                    {"label": "sin", "latex": "\\sin", "unicode": "sin"},
                    {"label": "cos", "latex": "\\cos", "unicode": "cos"},
                    {"label": "tan", "latex": "\\tan", "unicode": "tan"},
                    {"label": "cot", "latex": "\\cot", "unicode": "cot"},
                    {"label": "sec", "latex": "\\sec", "unicode": "sec"},
                    {"label": "csc", "latex": "\\csc", "unicode": "csc"},
                    {"label": "sin θ", "latex": "\\sin\\theta", "unicode": "sin θ"},
                    {"label": "cos θ", "latex": "\\cos\\theta", "unicode": "cos θ"},
                    {"label": "tan θ", "latex": "\\tan\\theta", "unicode": "tan θ"},
                ]
            },
            {
                "id": "statistics",
                "name": "Statistics",
                "symbols": [
                    {"label": "x̄", "latex": "\\bar{x}", "unicode": "x̄"},
                    {"label": "σ", "latex": "\\sigma", "unicode": "σ"},
                    {"label": "σ²", "latex": "\\sigma^2", "unicode": "σ²"},
                    {"label": "μ", "latex": "\\mu", "unicode": "μ"},
                    {"label": "Σ", "latex": "\\sum", "unicode": "Σ"},
                    {"label": "Π", "latex": "\\prod", "unicode": "Π"},
                ]
            },
            {
                "id": "set_theory",
                "name": "Set Theory",
                "symbols": [
                    {"label": "∈", "latex": "\\in", "unicode": "∈"},
                    {"label": "∉", "latex": "\\notin", "unicode": "∉"},
                    {"label": "⊂", "latex": "\\subset", "unicode": "⊂"},
                    {"label": "⊆", "latex": "\\subseteq", "unicode": "⊆"},
                    {"label": "⊃", "latex": "\\supset", "unicode": "⊃"},
                    {"label": "⊇", "latex": "\\supseteq", "unicode": "⊇"},
                    {"label": "∅", "latex": "\\emptyset", "unicode": "∅"},
                    {"label": "∪", "latex": "\\cup", "unicode": "∪"},
                    {"label": "∩", "latex": "\\cap", "unicode": "∩"},
                ]
            },
            {
                "id": "logic",
                "name": "Logic",
                "symbols": [
                    {"label": "∀", "latex": "\\forall", "unicode": "∀"},
                    {"label": "∃", "latex": "\\exists", "unicode": "∃"},
                    {"label": "¬", "latex": "\\neg", "unicode": "¬"},
                    {"label": "∧", "latex": "\\land", "unicode": "∧"},
                    {"label": "∨", "latex": "\\lor", "unicode": "∨"},
                    {"label": "⇒", "latex": "\\Rightarrow", "unicode": "⇒"},
                    {"label": "⇔", "latex": "\\Leftrightarrow", "unicode": "⇔"},
                    {"label": "∴", "latex": "\\therefore", "unicode": "∴"},
                    {"label": "∵", "latex": "\\because", "unicode": "∵"},
                ]
            },
            {
                "id": "greek",
                "name": "Greek Letters",
                "symbols": [
                    {"label": "α", "latex": "\\alpha", "unicode": "α"},
                    {"label": "β", "latex": "\\beta", "unicode": "β"},
                    {"label": "γ", "latex": "\\gamma", "unicode": "γ"},
                    {"label": "δ", "latex": "\\delta", "unicode": "δ"},
                    {"label": "ε", "latex": "\\epsilon", "unicode": "ε"},
                    {"label": "θ", "latex": "\\theta", "unicode": "θ"},
                    {"label": "λ", "latex": "\\lambda", "unicode": "λ"},
                    {"label": "μ", "latex": "\\mu", "unicode": "μ"},
                    {"label": "ν", "latex": "\\nu", "unicode": "ν"},
                    {"label": "π", "latex": "\\pi", "unicode": "π"},
                    {"label": "ρ", "latex": "\\rho", "unicode": "ρ"},
                    {"label": "σ", "latex": "\\sigma", "unicode": "σ"},
                    {"label": "τ", "latex": "\\tau", "unicode": "τ"},
                    {"label": "φ", "latex": "\\phi", "unicode": "φ"},
                    {"label": "χ", "latex": "\\chi", "unicode": "χ"},
                    {"label": "ψ", "latex": "\\psi", "unicode": "ψ"},
                    {"label": "ω", "latex": "\\omega", "unicode": "ω"},
                    {"label": "Δ", "latex": "\\Delta", "unicode": "Δ"},
                    {"label": "Θ", "latex": "\\Theta", "unicode": "Θ"},
                    {"label": "Λ", "latex": "\\Lambda", "unicode": "Λ"},
                    {"label": "Σ", "latex": "\\Sigma", "unicode": "Σ"},
                    {"label": "Ω", "latex": "\\Omega", "unicode": "Ω"},
                ]
            },
            {
                "id": "physics",
                "name": "Physics",
                "symbols": [
                    {"label": "F = ma", "latex": "F = ma", "unicode": "F = ma"},
                    {"label": "E = mc²", "latex": "E = mc^2", "unicode": "E = mc²"},
                    {"label": "v = u + at", "latex": "v = u + at", "unicode": "v = u + at"},
                    {"label": "s = ut + ½at²", "latex": "s = ut + \\frac{1}{2}at^2", "unicode": "s = ut + ½at²"},
                    {"label": "V = IR", "latex": "V = IR", "unicode": "V = IR"},
                    {"label": "P = VI", "latex": "P = VI", "unicode": "P = VI"},
                    {"label": "KE = ½mv²", "latex": "KE = \\frac{1}{2}mv^2", "unicode": "KE = ½mv²"},
                    {"label": "PE = mgh", "latex": "PE = mgh", "unicode": "PE = mgh"},
                    {"label": "ℏ", "latex": "\\hbar", "unicode": "ℏ"},
                    {"label": "c", "latex": "c", "unicode": "c"},
                    {"label": "G", "latex": "G", "unicode": "G"},
                ]
            },
            {
                "id": "chemistry",
                "name": "Chemistry",
                "symbols": [
                    {"label": "→", "latex": "\\rightarrow", "unicode": "→"},
                    {"label": "⇌", "latex": "\\rightleftharpoons", "unicode": "⇌"},
                    {"label": "H₂O", "latex": "\\mathrm{H_2O}", "unicode": "H₂O"},
                    {"label": "CO₂", "latex": "\\mathrm{CO_2}", "unicode": "CO₂"},
                    {"label": "H₂SO₄", "latex": "\\mathrm{H_2SO_4}", "unicode": "H₂SO₄"},
                    {"label": "NH₄⁺", "latex": "\\mathrm{NH_4^+}", "unicode": "NH₄⁺"},
                    {"label": "SO₄²⁻", "latex": "\\mathrm{SO_4^{2-}}", "unicode": "SO₄²⁻"},
                    {"label": "Fe³⁺", "latex": "\\mathrm{Fe^{3+}}", "unicode": "Fe³⁺"},
                    {"label": "Cu²⁺", "latex": "\\mathrm{Cu^{2+}}", "unicode": "Cu²⁺"},
                    {"label": "(s)", "latex": "_{(s)}", "unicode": "(s)"},
                    {"label": "(l)", "latex": "_{(l)}", "unicode": "(l)"},
                    {"label": "(g)", "latex": "_{(g)}", "unicode": "(g)"},
                    {"label": "(aq)", "latex": "_{(aq)}", "unicode": "(aq)"},
                ]
            },
            {
                "id": "units",
                "name": "Scientific Units",
                "symbols": [
                    {"label": "m", "latex": "\\mathrm{m}", "unicode": "m"},
                    {"label": "cm", "latex": "\\mathrm{cm}", "unicode": "cm"},
                    {"label": "mm", "latex": "\\mathrm{mm}", "unicode": "mm"},
                    {"label": "km", "latex": "\\mathrm{km}", "unicode": "km"},
                    {"label": "s", "latex": "\\mathrm{s}", "unicode": "s"},
                    {"label": "ms", "latex": "\\mathrm{ms}", "unicode": "ms"},
                    {"label": "kg", "latex": "\\mathrm{kg}", "unicode": "kg"},
                    {"label": "g", "latex": "\\mathrm{g}", "unicode": "g"},
                    {"label": "mg", "latex": "\\mathrm{mg}", "unicode": "mg"},
                    {"label": "N", "latex": "\\mathrm{N}", "unicode": "N"},
                    {"label": "J", "latex": "\\mathrm{J}", "unicode": "J"},
                    {"label": "W", "latex": "\\mathrm{W}", "unicode": "W"},
                    {"label": "Pa", "latex": "\\mathrm{Pa}", "unicode": "Pa"},
                    {"label": "Hz", "latex": "\\mathrm{Hz}", "unicode": "Hz"},
                    {"label": "V", "latex": "\\mathrm{V}", "unicode": "V"},
                    {"label": "A", "latex": "\\mathrm{A}", "unicode": "A"},
                    {"label": "Ω", "latex": "\\Omega", "unicode": "Ω"},
                    {"label": "C", "latex": "\\mathrm{C}", "unicode": "C"},
                    {"label": "K", "latex": "\\mathrm{K}", "unicode": "K"},
                    {"label": "mol", "latex": "\\mathrm{mol}", "unicode": "mol"},
                    {"label": "m/s", "latex": "\\mathrm{m/s}", "unicode": "m/s"},
                    {"label": "m/s²", "latex": "\\mathrm{m/s^2}", "unicode": "m/s²"},
                ]
            },
            {
                "id": "vectors",
                "name": "Vectors",
                "symbols": [
                    {"label": "v⃗", "latex": "\\vec{v}", "unicode": "v⃗"},
                    {"label": "F⃗", "latex": "\\vec{F}", "unicode": "F⃗"},
                    {"label": "a⃗", "latex": "\\vec{a}", "unicode": "a⃗"},
                    {"label": "î", "latex": "\\hat{i}", "unicode": "î"},
                    {"label": "ĵ", "latex": "\\hat{j}", "unicode": "ĵ"},
                    {"label": "k̂", "latex": "\\hat{k}", "unicode": "k̂"},
                    {"label": "· (dot)", "latex": "\\cdot", "unicode": "·"},
                    {"label": "× (cross)", "latex": "\\times", "unicode": "×"},
                ]
            },
            {
                "id": "matrices",
                "name": "Matrices & Determinants",
                "symbols": [
                    {"label": "[2x2 Matrix]", "latex": "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", "unicode": "[2x2]"},
                    {"label": "|2x2 Det|", "latex": "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", "unicode": "|2x2|"},
                    {"label": "[3x3 Matrix]", "latex": "\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}", "unicode": "[3x3]"},
                ]
            },
            {
                "id": "operators",
                "name": "Comparison & Limits",
                "symbols": [
                    {"label": "≤", "latex": "\\le", "unicode": "≤"},
                    {"label": "≥", "latex": "\\ge", "unicode": "≥"},
                    {"label": "≪", "latex": "\\ll", "unicode": "≪"},
                    {"label": "≫", "latex": "\\gg", "unicode": "≫"},
                    {"label": "∞", "latex": "\\infty", "unicode": "∞"},
                    {"label": "∑ⁿᵢ₌₁", "latex": "\\sum_{i=1}^{n}", "unicode": "∑ⁿᵢ₌₁"},
                    {"label": "∏ⁿᵢ₌₁", "latex": "\\prod_{i=1}^{n}", "unicode": "∏ⁿᵢ₌₁"},
                ]
            },
        ]
    }
    return palette

@router.get("/scientific/settings")
async def get_scientific_settings():
    """Returns the current mathematical and scientific recognition settings."""
    return {"status": "SUCCESS", "settings": _load_scientific_settings()}

@router.put("/scientific/settings")
async def update_scientific_settings(req: ScientificSettingsUpdate):
    """Updates and saves mathematical recognition administrator thresholds."""
    current = _load_scientific_settings()
    updates = req.dict(exclude_unset=True)
    current.update(updates)
    try:
        import json
        SETTINGS_FILE.write_text(json.dumps(current, indent=2), encoding="utf-8")
        return {"status": "SUCCESS", "settings": current}
    except Exception as e:
        logger.error(f"Failed to save scientific settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class TokenizeRequest(BaseModel):
    text: str
    domain: Optional[str] = "AUTO"


class ValidateFormulaRequest(BaseModel):
    text: Optional[str] = None
    latex: Optional[str] = None
    domain: Optional[str] = "AUTO"


@router.get("/scientific/symbols/search")
async def search_scientific_symbols(
    q: str = Query("", description="Symbol name, alias, LaTeX macro, or character"),
    domain: Optional[str] = Query(None, description="Optional domain filter"),
    limit: int = Query(50, ge=1, le=200)
):
    """Searches the complete scientific, mathematical, physics, chemistry, and biology symbol database."""
    from ..scientific.symbol_database import symbol_database
    results = symbol_database.search(q, domain=domain, limit=limit)
    return {
        "status": "SUCCESS",
        "query": q,
        "total_results": len(results),
        "symbols": results
    }


@router.get("/scientific/symbols/palette")
async def get_scientific_symbol_palette(
    domain: Optional[str] = Query(None, description="Optional domain filter")
):
    """Returns all mathematical, physics, chemistry, biology, and scientific symbols grouped by category."""
    from ..scientific.symbol_database import symbol_database
    palette = symbol_database.get_palette(domain=domain)
    return {
        "status": "SUCCESS",
        "categories_count": len(palette),
        "palette": palette
    }


@router.post("/scientific/tokenize")
async def tokenize_formula_endpoint(req: TokenizeRequest):
    """Scans and tokenizes a formula into typed tokens (symbols, numbers, greek, elements, units, etc.)."""
    from ..scientific.formula_tokenizer import formula_tokenizer
    tokens = formula_tokenizer.tokenize(req.text, domain_hint=req.domain or "AUTO")
    return {
        "status": "SUCCESS",
        "raw_text": req.text,
        "tokens_count": len(tokens),
        "tokens": [t.to_dict() for t in tokens]
    }


@router.post("/scientific/validate")
async def validate_formula_endpoint(req: ValidateFormulaRequest):
    """Validates formula syntax, bracket matching, radicals, exponents, and charges, returning confidence and AST."""
    from ..scientific.formula_grammar import formula_validator
    input_str = req.text or req.latex or ""
    report = formula_validator.validate_formula(input_str, domain_hint=req.domain or "AUTO")
    return {
        "status": "SUCCESS",
        "raw_text": input_str,
        "validation": report.to_dict()
    }


# =========================================================================
# V2 HIGH-FIDELITY MULTIMODAL DOCUMENT INTELLIGENCE ENDPOINTS (Pass 1 - 16)
# =========================================================================

class ProcessPageV2Request(BaseModel):
    doc_path: str
    doc_id: str
    page_number: int
    profile: str = "BALANCED"
    watermark_action: str = "KEEP_ORIGINAL"

class ExportHighFidelityRequest(BaseModel):
    pages_data: List[Dict[str, Any]]
    mode: str = "STRUCTURED_RECONSTRUCTION"  # STRUCTURED_RECONSTRUCTION | SOURCE_FIDELITY
    quality: str = "HIGH_QUALITY"           # STANDARD | HIGH_QUALITY | PRINT_QUALITY | ARCHIVAL
    watermark_action: str = "KEEP_ORIGINAL"  # KEEP_ORIGINAL | HIDE_IN_PREVIEW | REMOVE_FROM_EXPORT
    output_filename: Optional[str] = None

class WatermarkActionRequest(BaseModel):
    image_path: str
    watermark_id: str
    action: str = "KEEP_ORIGINAL"
    bbox: List[int]
    user_authorized: bool = False

@router.get("/accuracy-dashboard")
async def get_accuracy_dashboard_endpoint():
    """Requirement 122: Returns Measured Accuracy Dashboard and real-time benchmark statistics."""
    from ..pipeline.multimodal_v2 import multimodal_pipeline_v2
    return {
        "status": "SUCCESS",
        "data": multimodal_pipeline_v2.get_accuracy_dashboard()
    }

@router.get("/fonts/registry")
async def get_font_registry_endpoint():
    """Requirement 80, 113: Returns system and OpenType math fonts registry with licensing metadata."""
    from ..core.font_manager import font_manager
    return {
        "status": "SUCCESS",
        "data": font_manager.get_font_registry()
    }

@router.get("/fonts/coverage-test")
async def get_font_coverage_test_endpoint(font_name: Optional[str] = None):
    """Requirement 114: Tests glyph coverage across scientific & mathematical Unicode symbol blocks."""
    from ..core.font_manager import font_manager
    return {
        "status": "SUCCESS",
        "data": font_manager.test_symbol_coverage(font_name=font_name)
    }

@router.post("/watermarks/detect")
async def detect_watermarks_endpoint(image_path: str = Form(...)):
    """Requirement 95: Detects repeated background logos and low-opacity watermark candidates."""
    from ..layout.watermark_detector import watermark_detector
    img_p = resolve_file_path(image_path, config.STORAGE_DOCUMENTS)
    if not img_p.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    bgr = cv2.imread(str(img_p))
    candidates = watermark_detector.detect_watermark_candidates([bgr] if bgr is not None else [])
    return {
        "status": "SUCCESS",
        "candidates": candidates
    }

@router.post("/watermarks/apply-action")
async def apply_watermark_action_endpoint(req: WatermarkActionRequest):
    """Requirement 94, 96: Applies user-authorized action on derivative copy (never mutating original)."""
    from ..layout.watermark_detector import watermark_detector
    img_p = resolve_file_path(req.image_path, config.STORAGE_DOCUMENTS)
    if not img_p.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    bgr = cv2.imread(str(img_p))
    derivative, res = watermark_detector.apply_watermark_action(
        bgr,
        watermark_id=req.watermark_id,
        action=req.action,
        bbox=req.bbox,
        user_authorized=req.user_authorized
    )
    # Save derivative if modified
    der_name = f"der_{Path(req.image_path).stem}_{req.watermark_id}.jpg"
    der_path = config.STORAGE_DOCUMENTS / der_name
    cv2.imwrite(str(der_path), derivative)
    return {
        "status": "SUCCESS",
        "derivative_url": f"/data/documents/{der_name}",
        "details": res
    }

@router.post("/v2/documents/process-page")
async def process_page_v2_endpoint(req: ProcessPageV2Request):
    """Requirement 72-74: 16-Pass High-Fidelity Multimodal Document Extraction Pipeline."""
    async with resource_manager.heavy_job_semaphore:
        resource_manager.active_jobs_count += 1
        try:
            from ..pipeline.multimodal_v2 import multimodal_pipeline_v2
            doc_p = resolve_file_path(req.doc_path, config.STORAGE_UPLOADS)
            if not doc_p.exists():
                raise HTTPException(status_code=404, detail=f"Document file not found: {doc_p.name}")

            res = await asyncio.to_thread(
                multimodal_pipeline_v2.process_page_v2,
                doc_path=doc_p,
                doc_id=req.doc_id,
                page_number=req.page_number,
                profile=req.profile,
                watermark_action=req.watermark_action,
            )
            return res
        finally:
            resource_manager.active_jobs_count -= 1

@router.post("/export/high-fidelity-pdf")
async def export_high_fidelity_pdf_endpoint(req: ExportHighFidelityRequest):
    """Requirement 97-106: High-Fidelity Document Renderer with Dual-Mode export and post-validation."""
    from ..document.high_fidelity_renderer import high_fidelity_renderer
    res = await asyncio.to_thread(
        high_fidelity_renderer.render_document,
        pages_data=req.pages_data,
        mode=req.mode,
        quality=req.quality,
        watermark_action=req.watermark_action,
        output_filename=req.output_filename or f"export_{int(time.time())}.pdf"
    )
    return res





