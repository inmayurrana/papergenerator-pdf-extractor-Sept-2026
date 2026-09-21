import csv
import logging
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import pymupdf  # type: ignore
import docx  # type: ignore
import openpyxl  # type: ignore
from ..engines.specialized_math import specialized_math

logger = logging.getLogger("office_converter")

OMML_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"

def omml_to_latex(elem) -> str:
    """
    Recursively converts an OpenXML OMML element (<m:oMath>, <m:f>, etc.) into standard LaTeX syntax.
    """
    tag = elem.tag
    if tag.startswith("{"):
        tag = tag.split("}", 1)[1]

    if tag in ["oMath", "oMathPara"]:
        return "".join(omml_to_latex(child) for child in elem).strip()

    elif tag == "r":
        # Text run
        text = ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "t":
                text += child.text or ""
        return text

    elif tag == "t":
        return elem.text or ""

    elif tag == "f":
        # Fraction \frac{num}{den}
        num, den = "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "num":
                num = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "den":
                den = "".join(omml_to_latex(c) for c in child).strip()
        return f"\\frac{{{num}}}{{{den}}}"

    elif tag == "rad":
        # Radical / Square root
        deg, base = "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "deg":
                deg = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "e":
                base = "".join(omml_to_latex(c) for c in child).strip()
        if deg:
            return f"\\sqrt[{deg}]{{{base}}}"
        return f"\\sqrt{{{base}}}"

    elif tag == "sSup":
        # Superscript base^{sup}
        base, sup = "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "e":
                base = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "sup":
                sup = "".join(omml_to_latex(c) for c in child).strip()
        return f"{base}^{{{sup}}}"

    elif tag == "sSub":
        # Subscript base_{sub}
        base, sub = "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "e":
                base = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "sub":
                sub = "".join(omml_to_latex(c) for c in child).strip()
        return f"{base}_{{{sub}}}"

    elif tag == "sSubSup":
        # Subscript + Superscript base_{sub}^{sup}
        base, sub, sup = "", "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "e":
                base = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "sub":
                sub = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "sup":
                sup = "".join(omml_to_latex(c) for c in child).strip()
        return f"{base}_{{{sub}}}^{{{sup}}}"

    elif tag == "d":
        # Delimiters
        beg, end = "(", ")"
        content = ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "dPr":
                for p_child in child:
                    pc_tag = p_child.tag.split("}", 1)[1] if p_child.tag.startswith("{") else p_child.tag
                    if pc_tag == "begChr":
                        beg = p_child.attrib.get(f"{{{OMML_NS}}}val", p_child.attrib.get("val", "("))
                    elif pc_tag == "endChr":
                        end = p_child.attrib.get(f"{{{OMML_NS}}}val", p_child.attrib.get("val", ")"))
            elif c_tag == "e":
                content += "".join(omml_to_latex(c) for c in child)
        return f"{beg}{content}{end}"

    elif tag == "nary":
        # N-ary (Integral, Sum, Product)
        op_char = ""
        sub, sup, body = "", "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "naryPr":
                for p_child in child:
                    pc_tag = p_child.tag.split("}", 1)[1] if p_child.tag.startswith("{") else p_child.tag
                    if pc_tag == "chr":
                        op_char = p_child.attrib.get(f"{{{OMML_NS}}}val", p_child.attrib.get("val", "\\int"))
            elif c_tag == "sub":
                sub = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "sup":
                sup = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "e":
                body = "".join(omml_to_latex(c) for c in child).strip()

        op_map = {"∫": "\\int", "∑": "\\sum", "∏": "\\prod"}
        op = op_map.get(op_char, op_char or "\\int")
        limits = ""
        if sub:
            limits += f"_{{{sub}}}"
        if sup:
            limits += f"^{{{sup}}}"
        return f"{op}{limits} {body}"

    elif tag == "func":
        # Functions: sin, cos, tan, lim, log
        fname, arg = "", ""
        for child in elem:
            c_tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
            if c_tag == "fName":
                fname = "".join(omml_to_latex(c) for c in child).strip()
            elif c_tag == "e":
                arg = "".join(omml_to_latex(c) for c in child).strip()
        return f"\\{fname} {arg}"

    else:
        children_res = "".join(omml_to_latex(child) for child in elem)
        return (elem.text or "") + children_res + (elem.tail or "")

def extract_paragraph_with_math(paragraph) -> str:
    """Extracts text from a python-docx paragraph preserving OMML equations as LaTeX $...$."""
    parts = []
    for child in paragraph._element:
        tag = child.tag.split("}", 1)[1] if child.tag.startswith("{") else child.tag
        if tag == "r":
            for r_child in child:
                rc_tag = r_child.tag.split("}", 1)[1] if r_child.tag.startswith("{") else r_child.tag
                if rc_tag == "t":
                    parts.append(r_child.text or "")
        elif tag in ["oMath", "oMathPara"]:
            latex = omml_to_latex(child).strip()
            if latex:
                # Normalize Greek and operators inside the formula
                norm_res = specialized_math.normalize_math_to_latex(latex)
                parts.append(f" {norm_res['latex']} ")
        elif tag == "hyperlink":
            for r in child:
                rc_tag = r.tag.split("}", 1)[1] if r.tag.startswith("{") else r.tag
                if rc_tag == "r":
                    for t in r:
                        if t.tag.endswith("}t"):
                            parts.append(t.text or "")
    full_str = "".join(parts).strip()
    return full_str if full_str else paragraph.text.strip()

def extract_cell_with_math(cell) -> str:
    """Extracts text from a table cell preserving OMML math equations."""
    p_texts = [extract_paragraph_with_math(p) for p in cell.paragraphs if p.text.strip() or len(p._element) > 0]
    return "\n".join(p_texts).strip()

def get_unicode_font_args(is_bold: bool = False) -> Dict[str, Any]:
    """Returns PyMuPDF font arguments that reliably support Unicode math symbols and Greek letters."""
    candidates = [
        "C:/Windows/Fonts/seguisym.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if is_bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/cambria.ttc",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return {"fontfile": p, "fontname": "SegoeUISymbol" if "seguisym" in p.lower() else "ArialUnicode"}
    return {"fontname": "hebo" if is_bold else "helv"}

class OfficeConverter:
    """Converts Word and Excel files into standardized digital PDFs for OCR and Question pipelines."""

    @staticmethod
    def convert_to_pdf(input_path: Any, output_pdf_path: Optional[Any] = None) -> Dict[str, Any]:
        in_p = Path(input_path)
        out_p = Path(output_pdf_path) if output_pdf_path else in_p.with_name(f"{in_p.stem}_converted.pdf")
        ext = in_p.suffix.lower()
        if ext in [".docx", ".doc"]:
            return OfficeConverter.convert_docx_to_pdf(in_p, out_p)
        elif ext in [".xlsx", ".xls"]:
            return OfficeConverter.convert_excel_to_pdf(in_p, out_p)
        elif ext == ".csv":
            return OfficeConverter.convert_csv_to_pdf(in_p, out_p)
        else:
            raise ValueError(f"Unsupported office document extension: {ext}")

    @staticmethod
    def convert_docx_to_pdf(docx_path: Path, output_pdf_path: Path) -> Dict[str, Any]:
        """Converts Word .docx document into multi-page formatted A4 PDF with full math equation support."""
        try:
            doc_word = docx.Document(docx_path)
        except Exception as e:
            logger.warning(f"python-docx failed to open {docx_path.name}: {e}. Trying raw text fallback.")
            return OfficeConverter._convert_fallback_text_to_pdf(docx_path, output_pdf_path)

        pdf = pymupdf.open()
        page_w, page_h = 595, 842  # Standard A4
        margin_l, margin_r = 50, 545
        margin_t, margin_b = 50, 792

        current_page = pdf.new_page(width=page_w, height=page_h)
        current_y = margin_t

        for p in doc_word.paragraphs:
            text = extract_paragraph_with_math(p)
            if not text:
                current_y += 10
                continue

            is_heading = (
                p.style.name.startswith("Heading")
                or p.style.name == "Title"
                or (len(text) < 60 and text.isupper())
            )
            font_size = 13.5 if is_heading else 10.5
            font_args = get_unicode_font_args(is_bold=is_heading)
            text_color = (0.1, 0.1, 0.25) if is_heading else (0.1, 0.1, 0.1)

            line_spacing = font_size * 1.4

            rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
            rc = current_page.insert_textbox(
                rect, text, fontsize=font_size, color=text_color, **font_args
            )
            if rc < 0:
                current_page = pdf.new_page(width=page_w, height=page_h)
                current_y = margin_t
                rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
                current_page.insert_textbox(
                    rect, text, fontsize=font_size, color=text_color, **font_args
                )
                current_y += line_spacing
            else:
                used_h = (margin_b - current_y) - rc
                current_y += max(line_spacing, used_h + 4)

        # Handle tables in Word document
        for table in doc_word.tables:
            for row in table.rows:
                row_items = [extract_cell_with_math(c) for c in row.cells if c.text.strip() or len(c.paragraphs) > 0]
                row_items = [it for it in row_items if it.strip()]
                if not row_items:
                    continue
                row_text = " | ".join(row_items)

                if current_y + 18 > margin_b:
                    current_page = pdf.new_page(width=page_w, height=page_h)
                    current_y = margin_t

                rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
                current_page.insert_textbox(rect, row_text, fontsize=9.5, **get_unicode_font_args(False))
                current_y += 18

        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf.save(str(output_pdf_path))
        page_count = len(pdf)
        pdf.close()

        logger.info(f"Converted DOCX {docx_path.name} -> {output_pdf_path.name} ({page_count} pages with math equations)")
        return {
            "status": "SUCCESS",
            "pdf_path": str(output_pdf_path),
            "page_count": page_count,
            "format": "DOCX",
        }

    @staticmethod
    def convert_excel_to_pdf(excel_path: Path, output_pdf_path: Path) -> Dict[str, Any]:
        """Converts Excel spreadsheet into structured examination A4 PDF."""
        try:
            wb = openpyxl.load_workbook(excel_path, data_only=True)
        except Exception as e:
            logger.warning(f"openpyxl failed to open {excel_path.name}: {e}. Trying fallback.")
            return OfficeConverter._convert_fallback_text_to_pdf(excel_path, output_pdf_path)

        pdf = pymupdf.open()
        page_w, page_h = 595, 842
        margin_l, margin_r = 50, 545
        margin_t, margin_b = 50, 792

        current_page = pdf.new_page(width=page_w, height=page_h)
        current_y = margin_t
        font_args_regular = get_unicode_font_args(False)
        font_args_bold = get_unicode_font_args(True)

        title_text = f"EXAMINATION PAPER - {excel_path.stem.replace('_', ' ').upper()}"
        current_page.insert_textbox(
            pymupdf.Rect(margin_l, current_y, margin_r, current_y + 24),
            title_text,
            fontsize=13,
            **font_args_bold
        )
        current_y += 26

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue

            headers = [str(h or "").lower().strip() for h in rows[0]]
            has_q_cols = any("quest" in h or "qno" in h or "q." in h for h in headers)

            q_idx = next((i for i, h in enumerate(headers) if "quest" in h or "q_text" in h or "statement" in h), 1 if len(headers) > 1 else 0)
            qno_idx = next((i for i, h in enumerate(headers) if "qno" in h or "no" in h or "num" in h), 0)
            opt_a_idx = next((i for i, h in enumerate(headers) if "opt_a" in h or "option_a" in h or "opta" in h or "a" == h), 2 if len(headers) > 2 else -1)
            opt_b_idx = next((i for i, h in enumerate(headers) if "opt_b" in h or "option_b" in h or "optb" in h or "b" == h), 3 if len(headers) > 3 else -1)
            opt_c_idx = next((i for i, h in enumerate(headers) if "opt_c" in h or "option_c" in h or "optc" in h or "c" == h), 4 if len(headers) > 4 else -1)
            opt_d_idx = next((i for i, h in enumerate(headers) if "opt_d" in h or "option_d" in h or "optd" in h or "d" == h), 5 if len(headers) > 5 else -1)
            ans_idx = next((i for i, h in enumerate(headers) if "ans" in h or "correct" in h or "key" in h), 6 if len(headers) > 6 else -1)
            marks_idx = next((i for i, h in enumerate(headers) if "mark" in h or "pts" in h or "score" in h), 7 if len(headers) > 7 else -1)

            for r_idx, row in enumerate(rows[1:], start=1):
                if not any(row):
                    continue

                if current_y + 50 > margin_b:
                    current_page = pdf.new_page(width=page_w, height=page_h)
                    current_y = margin_t

                if has_q_cols and q_idx < len(row) and row[q_idx]:
                    q_num = str(row[qno_idx] if qno_idx < len(row) and row[qno_idx] is not None else r_idx)
                    q_text = str(row[q_idx] or "").strip()
                    marks_val = str(row[marks_idx]) if marks_idx != -1 and marks_idx < len(row) and row[marks_idx] else ""

                    q_header = f"Q{q_num}. {q_text}"
                    if marks_val:
                        q_header += f" [{marks_val} Marks]"

                    rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
                    rc = current_page.insert_textbox(rect, q_header, fontsize=10.5, **font_args_bold)
                    used_h = (margin_b - current_y) - max(rc, 0)
                    current_y += max(18, used_h + 3)

                    opts = []
                    if opt_a_idx != -1 and opt_a_idx < len(row) and row[opt_a_idx]:
                        opts.append(f"(A) {row[opt_a_idx]}")
                    if opt_b_idx != -1 and opt_b_idx < len(row) and row[opt_b_idx]:
                        opts.append(f"(B) {row[opt_b_idx]}")
                    if opt_c_idx != -1 and opt_c_idx < len(row) and row[opt_c_idx]:
                        opts.append(f"(C) {row[opt_c_idx]}")
                    if opt_d_idx != -1 and opt_d_idx < len(row) and row[opt_d_idx]:
                        opts.append(f"(D) {row[opt_d_idx]}")

                    if opts:
                        rect_opts = pymupdf.Rect(margin_l + 15, current_y, margin_r, margin_b)
                        current_page.insert_textbox(rect_opts, "    ".join(opts), fontsize=9.5, **font_args_regular)
                        current_y += 16

                    if ans_idx != -1 and ans_idx < len(row) and row[ans_idx]:
                        current_page.insert_textbox(
                            pymupdf.Rect(margin_l + 15, current_y, margin_r, current_y + 18),
                            f"Ans: {row[ans_idx]}",
                            fontsize=9.5,
                            color=(0.1, 0.4, 0.1),
                            **font_args_regular
                        )
                        current_y += 18

                    current_y += 6

                else:
                    row_str = " | ".join(str(c) for c in row if c is not None and str(c).strip())
                    if row_str:
                        rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
                        current_page.insert_textbox(rect, row_str, fontsize=9.5, **font_args_regular)
                        current_y += 16

        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf.save(str(output_pdf_path))
        page_count = len(pdf)
        pdf.close()

        logger.info(f"Converted Excel {excel_path.name} -> {output_pdf_path.name} ({page_count} pages)")
        return {
            "status": "SUCCESS",
            "pdf_path": str(output_pdf_path),
            "page_count": page_count,
            "format": "EXCEL",
        }

    @staticmethod
    def convert_csv_to_pdf(csv_path: Path, output_pdf_path: Path) -> Dict[str, Any]:
        """Converts CSV file into formatted A4 PDF."""
        pdf = pymupdf.open()
        page_w, page_h = 595, 842
        margin_l, margin_r = 50, 545
        margin_t, margin_b = 50, 792

        current_page = pdf.new_page(width=page_w, height=page_h)
        current_y = margin_t
        font_args_bold = get_unicode_font_args(True)
        font_args_regular = get_unicode_font_args(False)

        current_page.insert_textbox(
            pymupdf.Rect(margin_l, current_y, margin_r, current_y + 24),
            f"EXAMINATION PAPER - {csv_path.stem.upper()}",
            fontsize=13,
            **font_args_bold
        )
        current_y += 25

        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            for row in reader:
                line = " | ".join(c.strip() for c in row if c.strip())
                if not line:
                    continue

                if current_y + 18 > margin_b:
                    current_page = pdf.new_page(width=page_w, height=page_h)
                    current_y = margin_t

                rect = pymupdf.Rect(margin_l, current_y, margin_r, margin_b)
                current_page.insert_textbox(rect, line, fontsize=9.5, **font_args_regular)
                current_y += 16

        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf.save(str(output_pdf_path))
        page_count = len(pdf)
        pdf.close()

        return {
            "status": "SUCCESS",
            "pdf_path": str(output_pdf_path),
            "page_count": page_count,
            "format": "CSV",
        }

    @staticmethod
    def _convert_fallback_text_to_pdf(input_path: Path, output_pdf_path: Path) -> Dict[str, Any]:
        """Fallback reading raw bytes as text."""
        raw_text = input_path.read_text(encoding="utf-8", errors="ignore")
        pdf = pymupdf.open()
        current_page = pdf.new_page(width=595, height=842)
        font_args = get_unicode_font_args(False)
        current_page.insert_textbox(pymupdf.Rect(50, 50, 545, 792), raw_text[:4000], fontsize=10.5, **font_args)
        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf.save(str(output_pdf_path))
        page_count = len(pdf)
        pdf.close()
        return {
            "status": "SUCCESS",
            "pdf_path": str(output_pdf_path),
            "page_count": page_count,
            "format": "FALLBACK",
        }

office_converter = OfficeConverter()
