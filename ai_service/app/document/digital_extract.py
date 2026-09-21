import re
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import pymupdf  # type: ignore

Rect = getattr(pymupdf, "Rect", None)
pdf_open = getattr(pymupdf, "open", None)
from .learning_memory import learning_memory_engine
from ..core.config import config
from ..engines.specialized_math import specialized_math
from ..scientific.spatial_math_engine import spatial_math_engine

logger = logging.getLogger("digital_extract")

# -------------------------------------------------------------------
# Symbol-font decoding: Indian NEET/JEE PDFs authored via PageMaker/
# Word with Adobe Type 1 / Symbol fonts store Greek letters as ASCII
# glyph codes. We must remap them before any further processing.
# -------------------------------------------------------------------
_SYMBOL_FONT_MAP: Dict[str, str] = {
    # lowercase Greek
    'a': r'\alpha',  'b': r'\beta',   'g': r'\gamma',   'd': r'\delta',
    'e': r'\epsilon','z': r'\zeta',   'h': r'\eta',     'q': r'\theta',
    'i': r'\iota',  'k': r'\kappa',  'l': r'\lambda',  'm': r'\mu',
    'n': r'\nu',    'x': r'\xi',     'p': r'\pi',      'r': r'\rho',
    's': r'\sigma', 't': r'\tau',    'u': r'\upsilon',  'f': r'\phi',
    'c': r'\chi',   'y': r'\psi',   'w': r'\omega',
    # uppercase Greek
    'G': r'\Gamma', 'D': r'\Delta',  'Q': r'\Theta',   'L': r'\Lambda',
    'X': r'\Xi',    'P': r'\Pi',     'S': r'\Sigma',   'U': r'\Upsilon',
    'F': r'\Phi',   'Y': r'\Psi',   'W': r'\Omega',
    # math operators stored in Symbol font
    '\xb0': r'^\circ',   # degree
    '\xb1': r'\pm',
    '\xb4': r'\times',   # acute accent = times in Symbol
    '\xb8': r'\div',
    '\xa3': r'\le',
    '\xb3': r'\ge',
    '\xb9': r'\neq',
    '\xa5': r'\infty',
    '\xb5': r'\propto',
    '\xab': r'\approx',
    '\xd7': r'\times',
    '\xf7': r'\div',
}

_SYMBOL_FONT_KEYWORDS = ('symbol', 'wingdings', 'zapf', 'mathtype', 'mtextra')


def _decode_symbol_font_span(text: str, font_name: str) -> str:
    """If the span uses a Symbol/Wingdings font, remap each character using
    the legacy glyph-to-LaTeX mapping. Returns the decoded string."""
    if not text:
        return ''
    fn = font_name.lower()
    if not any(k in fn for k in _SYMBOL_FONT_KEYWORDS):
        return text
    return ''.join(_SYMBOL_FONT_MAP.get(ch, ch) for ch in text)


# Regex that detects the start of a new question: Q.1, Q1, Q.1), 1., 1), (1), Q1.
_QUESTION_SPLIT_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:Q\.?\s*(\d{1,3})\b|(\d{1,3})\s*[.)]\s)",
    re.IGNORECASE
)


def sanitize_math_font_artifacts(text: str) -> str:
    """Corrects legacy PDF symbol font encoding corruption (e.g. acute accent ´ -> \\times, super/subscripts)."""
    if not text:
        return ""

    s = text

    # 1. Acute accent U+00B4, grave `, prime ′ or ' ' between numbers/parentheses -> \\times
    s = re.sub(r'(\d+|\))\s*[´`\u2018\u2019′×✕✖]\s*(\d+|\()', r'\1 \\times \2', s)
    # Stray acute accent between math tokens or spaces -> \\times
    s = re.sub(r'\s+[´`\u2018\u2019′]\s+', r' \\times ', s)
    s = re.sub(r'(\d+)\s*[´`\u2018\u2019′]\s*', r'\1 \\times ', s)
    # Also clean up any accidental 'imes'
    s = re.sub(r'(\d+)\s*imes\s*(\d+)', r'\1 \\times \2', s)

    # 2. Unicode superscripts to LaTeX ^
    sup_map = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ", "0123456789+-=()ni")
    s = re.sub(r'([a-zA-Z0-9\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)', lambda m: f"{m.group(1)}^{{{m.group(2).translate(sup_map)}}}", s)

    # 3. Spurious space before superscript in math expressions: e.g. 60 2 \times -> 60^2 \times
    # IMPORTANT: use [ \t]+ (not \s+) so we NEVER collapse a cross-line "1\n2" stacked fraction here.
    s = re.sub(r'(\d+)[ \t]+([23456789])(?=[ \t]*(?:\\times|[×´\+\-\/\*]))', r'\1^\2', s)

    # 3.5 Common variable subscripts separated by space: m 1, m 2, T 2, M 1, v 0, etc.
    # Convert these before unit normalization turns 'm 2' into 'm^2' or 'm 3' into 'm^3'
    s = re.sub(r'\b([mMtTvVxXyY])[ \t]+([0-9])\b', r'\1_\2', s)

    # 4. Units normalization
    s = re.sub(r'm/s\s*2\b', r'm/s^2', s)
    s = re.sub(r'm/s\s*[-–]\s*2\b', r'm/s^{-2}', s)
    s = re.sub(r'cm\s*3\b', r'cm^3', s)
    s = re.sub(r'cm\s*2\b', r'cm^2', s)
    s = re.sub(r'm\s*3\b(?!/)', r'm^3', s)
    s = re.sub(r'm\s*2\b(?!/)', r'm^2', s)

    # 5. Scientific notation: 1.6 x 10 -19 -> 1.6 \times 10^{-19}
    s = re.sub(r'(\d+(?:\.\d+)?)\s*(?:\\times|x|×|´)\s*10\s*[-–—]\s*(\d+)', r'\1 \\times 10^{-\2}', s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*(?:\\times|x|×|´)\s*10\s*([0-9]+)', r'\1 \\times 10^{\2}', s)

    # 6. Square roots: √x or √(x)
    s = re.sub(r'√\(([^)]+)\)', r'\\sqrt{\1}', s)
    s = re.sub(r'√([a-zA-Z0-9]+)', r'\\sqrt{\1}', s)
    # Collapse fragmented spans belonging to the same radical: \sqrt{a}\sqrt{b} -> \sqrt{ab}
    while re.search(r'\\sqrt\{([^}]+)\}\s*\\sqrt\{([^}]+)\}', s):
        s = re.sub(r'\\sqrt\{([^}]+)\}\s*\\sqrt\{([^}]+)\}', r'\\sqrt{\1\2}', s)
    # Fix fractured radical+superscript: \sqrt{x}^{2} -> \sqrt{x^{2}}
    s = re.sub(r'\\sqrt\{([^}]+)\}\^\{([^}]+)\}', r'\\sqrt{\1^{\2}}', s)
    # Fix \sqrt{x}_{2} -> \sqrt{x_{2}} (subscript fused outside radical)
    s = re.sub(r'\\sqrt\{([^}]+)\}_\{([^}]+)\}', r'\\sqrt{\1_{\2}}', s)

    # 7. Greek letters, phonetic spellings, and trigonometry commonly embedded without LaTeX
    # NOTE: use negative lookbehind (?<!\\) to avoid double-encoding already LaTeX-encoded \theta
    s = re.sub(r'\\thita\b', r'\\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'\\Thita\b', r'\\Theta', s)
    s = re.sub(r'\b(sin|cos|tan|cot|sec|csc|cosec)\s*(?<!\\)(?:theta|thita|0|q)\b', r'\1 \\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(sin|cos|tan|cot|sec|csc|cosec)[θq]\b', r'\1 \\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(\d*g|g)\s*sin\s*q\b', r'\1 \\sin\\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(?:angle|at an angle of|angle of)\s+(?<!\\)(?:theta|thita|θ|ϑ|q)\b', r'angle \\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'(?<!\\)\b(?:theta|thita)\b', r'\\theta', s, flags=re.IGNORECASE)
    s = re.sub(r'(?<!\\)\b(?:Theta|Thita)\b', r'\\Theta', s)
    s = re.sub(r'[θϑ]', r'\\theta ', s)
    s = re.sub(r'Θ', r'\\Theta ', s)

    # 7b. Contextual symbol-font fallback patterns (for spans whose font info has been lost
    # after text joining – these rely on surrounding words rather than font name).
    # Stacked vertical fraction: numerator \n denominator \n symbol =   →  symbol = \frac{n}{d}
    s = re.sub(
        r'(\d+)\s*\n\s*(\d+)\s*\n\s*(\\[a-zA-Z]+)\s*=',
        lambda m: f'{m.group(3)} = \\frac{{{m.group(1)}}}{{{m.group(2)}}}',
        s
    )
    s = re.sub(
        r'(\\[a-zA-Z]+)\s*=\s*\n?\s*(\d+)\s*\n\s*(\d+)',
        lambda m: f'{m.group(1)} = \\frac{{{m.group(2)}}}{{{m.group(3)}}}',
        s
    )
    # Same-line stacked fraction: PageMaker fractions appear as sequential spans on one line:
    # "text is  1 2 \mu = more text" → "text is \mu = \frac{1}{2} more text"
    # Pattern: single-digit numerator, whitespace, single-digit denominator, whitespace, LaTeX-cmd =
    s = re.sub(
        r'(\d)\s+(\d)\s+(\\[a-zA-Z]+)\s*=',
        lambda m: f'{m.group(3)} = \\frac{{{m.group(1)}}}{{{m.group(2)}}}',
        s
    )
    # Also handle reversed layout: "\mu = 1 2" (symbol = then num denom inline)
    s = re.sub(
        r'(\\[a-zA-Z]+)\s*=\s*(\d)\s+(\d)\b',
        lambda m: f'{m.group(1)} = \\frac{{{m.group(2)}}}{{{m.group(3)}}}',
        s
    )
    # Trig-function followed by bare q (Symbol-font theta that survived)
    s = re.sub(r'\b(sin|cos|tan|cot|sec|csc|cosec)\s+q\b', r'\\\1 \\theta', s, flags=re.IGNORECASE)
    # Angle phrase followed by bare q
    s = re.sub(r'\b(slope angle|at an angle of|angle of|angle)\s+q\b', r'\1 \\theta', s, flags=re.IGNORECASE)
    # Bare q after comma / space that follows an inclined-plane phrase
    s = re.sub(r'((?:inclined?|slope|plane|surface).*?)\bq\b', r'\1\\theta', s, flags=re.IGNORECASE)
    # Coefficient of friction followed by bare m (Symbol-font mu) or m_s / m_k
    # These patterns handle the case where the m has NOT yet been decoded (raw text fallback)
    s = re.sub(
        r'(coefficient of (?:static |kinetic |sliding |rolling )?friction\s*(?:is|,)?\s*)m\b(?!\s*(?:ass|ov|ed|al|ul))',
        r'\1\\mu', s, flags=re.IGNORECASE
    )
    s = re.sub(
        r'(coefficient of (?:static |kinetic )?friction\s*,\s*)m\s+s\b',
        r'\1\\mu_s', s, flags=re.IGNORECASE
    )
    s = re.sub(
        r'(coefficient of (?:kinetic |sliding )?friction\s*,\s*)m\s+k\b',
        r'\1\\mu_k', s, flags=re.IGNORECASE
    )
    # After Symbol-font decoding, \mu may appear with a stray subscript letter: '\mu s' -> '\mu_s'
    # Pattern: friction context with already-decoded \mu followed by lone s or k
    s = re.sub(
        r'(coefficient of (?:static |kinetic )?friction\s*,\s*)\\mu\s+s\b',
        r'\1\\mu_s', s, flags=re.IGNORECASE
    )
    s = re.sub(
        r'(coefficient of (?:kinetic |sliding )?friction\s*,\s*)\\mu\s+k\b',
        r'\1\\mu_k', s, flags=re.IGNORECASE
    )
    # Generic: lone '\mu s' or '\mu k' in physics context (comma-separated subscript)
    s = re.sub(r'\\mu\s+s\b(?=\s*,)', r'\\mu_s', s)
    s = re.sub(r'\\mu\s+k\b(?=\s*,)', r'\\mu_k', s)
    s = re.sub(r'(?<=[a-zA-Z0-9\s(])π(?=\s|\)|\d|[a-zA-Z\^²³]|$)', r'\\pi ', s)
    s = re.sub(r'(?<=[a-zA-Z0-9\s(])α(?=\s|\)|\d|[a-zA-Z\^²³]|$)', r'\\alpha ', s)
    s = re.sub(r'(?<=[a-zA-Z0-9\s(])β(?=\s|\)|\d|[a-zA-Z\^²³]|$)', r'\\beta ', s)

    # 8. Common derivative / fraction patterns in digital text: dV/dt, dr/dt -> \frac{dV}{dt}
    s = re.sub(r'\bd([A-Za-z])\s*/\s*d([A-Za-z])\b', r'\\frac{d\1}{d\2}', s)

    # 9. Apply Continuous Learned Memory Patterns from User Corrections
    s = learning_memory_engine.apply_learned_corrections(s)

    # 10. Self-healing integrity check: Repair any corrupted/nested fraction expressions
    s = re.sub(r'\\frac\{\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}\}', r'\\frac{d\1}{d\2}', s)
    s = re.sub(r'\\frac\{\\frac\{([^}]+)\}\}', r'\\frac{\1}', s)
    s = re.sub(r'\\frac\{d([A-Za-z])\s*/\s*d([A-Za-z])\}', r'\\frac{d\1}{d\2}', s)
    s = re.sub(r'\\frac\{([a-zA-Z0-9]+)\s*/\s*([a-zA-Z0-9]+)\}', r'\\frac{\1}{\2}', s)

    return s


def split_spans_on_questions(
    spans: List[Dict[str, Any]],
    img_width: int,
    img_height: int,
) -> List[Dict[str, Any]]:
    """
    Splits large paragraph spans that contain multiple embedded questions
    (e.g. 'Q.1 ... Q.2 ... Q.3 ...') into individual question spans.
    Each sub-span gets an estimated bbox by proportionally dividing the parent bbox vertically.
    """
    result: List[Dict[str, Any]] = []
    for span in spans:
        text = span.get("text", "")
        bbox = span.get("bbox", [0, 0, img_width, img_height])

        # Find all Q-marker positions in the text
        markers = list(_QUESTION_SPLIT_PATTERN.finditer(text))

        # Only split if there are at least 2 question markers in the block
        if len(markers) < 2:
            result.append(span)
            continue

        # Split text at each marker boundary
        segments: List[str] = []
        for i, m in enumerate(markers):
            start = m.start()
            end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
            seg = text[start:end].strip()
            if seg:
                segments.append(seg)

        if not segments:
            result.append(span)
            continue

        # Distribute the bbox vertically across segments
        x, y, w, h = bbox
        seg_h = max(1, h // len(segments))
        for i, seg in enumerate(segments):
            sub_y = y + i * seg_h
            sub_h = seg_h if i < len(segments) - 1 else max(1, h - i * seg_h)
            result.append({
                "id": f"{span['id']}_q{i+1}",
                "text": seg,
                "raw_text": seg,
                "bbox": [x, sub_y, w, sub_h],
                "confidence": span.get("confidence", 0.99),
                "source": span.get("source", "DIGITAL_EMBEDDED"),
                "font_size": span.get("font_size", 12),
            })

    return result


def _detect_radical_drawings(page: Any) -> List[Dict[str, Any]]:
    """
    Finds genuine radical glyph drawings on a PDF page.
    A MathType / Equation Editor radical drawing consists of:
    1. A tick mark down/right
    2. A steep upward diagonal stroke: dx in [1.0, 6.0], dy in [-25.0, -4.0] (up to apex)
    3. A horizontal vinculum line starting at or near apex (dx >= 3.0, |dy| < 1.0)
    """
    radicals = []
    for d in page.get_drawings():
        items = d.get("items", [])
        r = d.get("rect")
        if r.width < 5 or r.height < 5 or r.height > 35 or r.width > 80:
            continue
        for item in items:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1.0 and abs(p2.x - p1.x) >= 3.0:
                    vx0, vx1 = min(p1.x, p2.x), max(p1.x, p2.x)
                    vy = (p1.y + p2.y) / 2
                    has_upward = False
                    for other in items:
                        if other[0] == "l":
                            op1, op2 = other[1], other[2]
                            dx = op2.x - op1.x
                            dy = op2.y - op1.y
                            if 1.0 <= dx <= 6.0 and -25.0 <= dy <= -4.0:
                                if abs(op2.x - vx0) < 2.0 and abs(op2.y - vy) < 2.0:
                                    has_upward = True
                                    break
                    if has_upward:
                        if not any(abs(ur["vinculum"][0] - vx0) < 2 and abs(ur["vinculum"][1] - vy) < 2 for ur in radicals):
                            radicals.append({
                                "rect": r,
                                "vinculum": (vx0, vy, vx1),
                            })
    return radicals


def _detect_fraction_drawings(page: Any, page_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Finds horizontal vector division bars representing stacked fractions on a PDF page
    and pairs them with adjacent numerator and denominator text spans.
    """
    all_spans = []
    for b in page_dict.get("blocks", []):
        if b.get("type") == 0:
            for line in b.get("lines", []):
                for s in line.get("spans", []):
                    chars = "".join(ch.get("c", "") for ch in s.get("chars", []))
                    if not chars.strip():
                        continue
                    dec = _decode_symbol_font_span(chars, s.get("font", ""))
                    all_spans.append({
                        "span_ref": s,
                        "text": dec,
                        "raw_text": chars,
                        "bbox": s["bbox"],
                        "size": s.get("size", 10),
                        "font": s.get("font", ""),
                    })

    def _assemble_fraction_spans(spans_list):
        spans_sorted = sorted(spans_list, key=lambda s: s["bbox"][0])
        parts = []
        prev_s = None
        for s in spans_sorted:
            t = s["text"]
            if prev_s and s.get("size", 10) < prev_s.get("size", 10) * 0.85 and s["bbox"][1] > prev_s["bbox"][1] + 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                parts.append(f"_{{{t}}}")
            elif prev_s and s.get("size", 10) < prev_s.get("size", 10) * 0.85 and s["bbox"][3] < prev_s["bbox"][3] - 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                parts.append(f"^{{{t}}}")
            else:
                if parts and not parts[-1].endswith("{") and not t in "+-=" and not parts[-1] in "+-=":
                    parts.append(" ")
                parts.append(t)
            prev_s = s
        res = "".join(parts).strip()
        res = re.sub(r'(?<!\\)sin\s*\\theta', r'\\sin\\theta', res)
        res = re.sub(r'([0-9a-zA-Z])sin', r'\1\\sin', res)
        return re.sub(r'\s+', ' ', res)

    drawings = page.get_drawings()
    frac_drawings = []
    bracket_chars = {'\xe6', '\xe7', '\xe8', '\xf6', '\xf7', '\xf8'}
    for d in drawings:
        r = d.get("rect")
        # Standalone fraction bar: height <= 2.5 pt, width between 5.0 and 120.0 pt
        if r.height > 2.5 or r.width < 5.0 or r.width > 120.0:
            continue
        items = d.get("items", [])
        if len(items) != 1 or items[0][0] != "l":
            continue
        p1, p2 = items[0][1], items[0][2]
        if abs(p1.y - p2.y) > 0.6:
            continue
        fx0, fx1 = min(p1.x, p2.x), max(p1.x, p2.x)
        fy = (p1.y + p2.y) / 2

        # Verify fraction bar with PixelFractionDetector (rejects underlines, borders, dividers)
        from ..scientific.fraction_engine import FractionBar, PixelFractionDetector
        f_bar = FractionBar(fx0, p1.y, fx1, p2.y)
        is_valid_bar, _ = PixelFractionDetector.classify_horizontal_line(
            f_bar, page.rect.width, page.rect.height, all_spans
        )
        if not is_valid_bar:
            continue

        # Check for flanking tall SymbolMT parentheses
        left_brackets = [s for s in all_spans if any(c in bracket_chars for c in s.get("raw_text", "")) and fx0 - 10.0 <= s["bbox"][0] <= fx0 + 2.0 and fy - 18.0 <= s["bbox"][1] <= fy + 18.0]
        right_brackets = [s for s in all_spans if any(c in bracket_chars for c in s.get("raw_text", "")) and fx1 - 2.0 <= s["bbox"][0] <= fx1 + 10.0 and fy - 18.0 <= s["bbox"][1] <= fy + 18.0]

        # Numerator spans: above line (midpoint y < fy), horizontally overlapping
        opt_label_pat = re.compile(r"^\([1-4A-Da-d]\)")
        # Numerator spans: above line (midpoint y < fy), horizontally overlapping, not an option label
        nums = [s for s in all_spans if not opt_label_pat.match(s["text"].strip()) and s["bbox"][2] >= fx0 - 1.0 and s["bbox"][0] <= fx1 + 1.0 and fy - 18.0 <= s["bbox"][1] and (s["bbox"][1] + s["bbox"][3]) / 2 < fy and not any(c in bracket_chars for c in s.get("raw_text", ""))]
        # Denominator spans: below line (midpoint y > fy), horizontally overlapping, not an option label
        dens = [s for s in all_spans if not opt_label_pat.match(s["text"].strip()) and s["bbox"][2] >= fx0 - 1.0 and s["bbox"][0] <= fx1 + 1.0 and (s["bbox"][1] + s["bbox"][3]) / 2 > fy and s["bbox"][3] <= fy + 18.0 and not any(c in bracket_chars for c in s.get("raw_text", ""))]

        if nums and dens:
            nums_sorted = sorted(nums, key=lambda s: s["bbox"][0])
            dens_sorted = sorted(dens, key=lambda s: s["bbox"][0])
            num_t = _assemble_fraction_spans(nums_sorted)
            den_t = _assemble_fraction_spans(dens_sorted)
            frac_latex = f"\\frac{{{num_t}}}{{{den_t}}}"
            has_parens = bool(left_brackets or right_brackets)
            if has_parens:
                frac_latex = f"\\left( {frac_latex} \\right)"
            bracket_spans_refs = [s["span_ref"] for s in left_brackets + right_brackets]
            frac_x0 = fx0 - (6.0 if left_brackets else 0)
            frac_x1 = fx1 + (6.0 if right_brackets else 0)

            # Detect trailing factor/variable (e.g. F, g, v, a, T, etc.)
            trail_x = (max(s["bbox"][2] for s in right_brackets) if right_brackets else frac_x1)
            trailing_spans = [
                s for s in all_spans
                if trail_x <= s["bbox"][0] <= trail_x + 18.0
                and fy - 14.0 <= s["bbox"][1] <= fy + 14.0
                and not opt_label_pat.match(s["text"].strip())
                and len(s["text"].strip()) <= 3
                and s["text"].strip() in ("F", "g", "a", "v", "T", "m", "N", "k", "P", "E", "W", "R")
            ]
            trailing_spans_refs = [s["span_ref"] for s in trailing_spans]
            if trailing_spans:
                trail_str = " ".join(s["text"].strip() for s in trailing_spans)
                frac_latex = f"{frac_latex} {trail_str}"
                frac_x1 = max(frac_x1, max(s["bbox"][2] for s in trailing_spans))

            formula_bbox = [frac_x0, fy - 14.0, frac_x1, fy + 14.0]

            # Generate original pixel crop of the formula
            original_crop_path = ""
            try:
                import uuid
                f_id = f"formula_{uuid.uuid4().hex[:8]}"
                # Use absolute config path — relative Path("data/formulas") fails when
                # uvicorn is launched from a different working directory via .bat
                crop_dir = config.STORAGE_FORMULAS / "extracted"
                crop_dir.mkdir(parents=True, exist_ok=True)
                crop_rect = Rect(max(0, frac_x0 - 2), max(0, fy - 16.0), frac_x1 + 2, fy + 16.0)
                pix = page.get_pixmap(clip=crop_rect, dpi=150)
                crop_file = crop_dir / f"{f_id}.png"
                pix.save(str(crop_file))
                original_crop_path = f"/storage/formulas/extracted/{f_id}.png"
            except Exception as crop_err:
                logger.warning(f"Formula crop save failed: {crop_err}")

            from ..scientific.spatial_math_engine import spatial_math_engine
            formula_res = spatial_math_engine.parse_expression(
                frac_latex,
                bbox=(frac_x0, fy - 14.0, frac_x1 - frac_x0, 28.0)
            )
            formula_obj = formula_res.to_formula_object() if formula_res else None
            if formula_obj:
                if original_crop_path:
                    formula_obj["originalCrop"] = original_crop_path
                    formula_obj["originalImage"] = original_crop_path
                formula_obj["visualSimilarity"] = 0.98

            frac_drawings.append({
                "line": (fx0, fy, fx1),
                "num_spans": [s["span_ref"] for s in nums_sorted],
                "den_spans": [s["span_ref"] for s in dens_sorted],
                "bracket_spans": bracket_spans_refs,
                "trailing_spans": trailing_spans_refs,
                "latex": frac_latex,
                "bbox": formula_bbox,
                "formula_object": formula_obj,
            })
    return frac_drawings


class DigitalTextExtractor:
    @staticmethod
    def extract_page_text_spans(
        pdf_path: Path,
        page_number: int,
        img_width: int,
        img_height: int
    ) -> List[Dict[str, Any]]:
        """Extracts text blocks and spans with exact bounding boxes mapped to the rendered image coordinates."""
        from ..engines.specialized_math import specialized_math

        spans = []
        doc = pdf_open(str(pdf_path))
        if page_number < 1 or page_number > len(doc):
            doc.close()
            return spans

        page = doc.load_page(page_number - 1)
        page_rect = page.rect
        pdf_w, pdf_h = page_rect.width, page_rect.height

        scale_x = img_width / pdf_w if pdf_w > 0 else 1.0
        scale_y = img_height / pdf_h if pdf_h > 0 else 1.0

        rad_drawings = _detect_radical_drawings(page)
        raw_dict = page.get_text("rawdict")
        page_dict: Dict[str, Any] = raw_dict if isinstance(raw_dict, dict) else {}
        frac_drawings = _detect_fraction_drawings(page, page_dict)

        for fd in frac_drawings:
            first_num = fd["num_spans"][0]
            first_num["special_latex"] = fd["latex"]
            first_num["formula_object"] = fd.get("formula_object")
            first_num["bbox"] = list(fd["bbox"])
            for s in fd["num_spans"][1:]:
                s["is_consumed"] = True
            for s in fd["den_spans"]:
                s["is_consumed"] = True
            for s in fd.get("bracket_spans", []):
                s["is_consumed"] = True
            for s in fd.get("trailing_spans", []):
                s["is_consumed"] = True

        raw_blocks = [b for b in page_dict.get("blocks", []) if b.get("type") == 0]
        clusters = []
        mid_x = pdf_w / 2.0
        for b in raw_blocks:
            bb = b["bbox"]
            h = bb[3] - bb[1]
            y_mid = (bb[1] + bb[3]) / 2
            matched = False
            if h < 45.0:
                for cl in clusters:
                    c_bb = cl["bbox"]
                    c_h = c_bb[3] - c_bb[1]
                    c_y_mid = (c_bb[1] + c_bb[3]) / 2
                    same_col = (bb[0] < mid_x and c_bb[0] < mid_x) or (bb[0] >= mid_x and c_bb[0] >= mid_x)
                    overlap_y = min(bb[3], c_bb[3]) - max(bb[1], c_bb[1])
                    if same_col and c_h < 45.0 and (overlap_y > 0.4 * min(h, c_h) or abs(y_mid - c_y_mid) < 8.0):
                        cl["blocks"].append(b)
                        cl["bbox"] = [min(c_bb[0], bb[0]), min(c_bb[1], bb[1]), max(c_bb[2], bb[2]), max(c_bb[3], bb[3])]
                        matched = True
                        break
            if not matched:
                clusters.append({"blocks": [b], "bbox": list(bb)})

        for b_idx, cl in enumerate(clusters):
            block_bbox = cl["bbox"]
            bx0, by0, bx1, by1 = [
                round(block_bbox[0] * scale_x),
                round(block_bbox[1] * scale_y),
                round(block_bbox[2] * scale_x),
                round(block_bbox[3] * scale_y),
            ]

            cl_h = block_bbox[3] - block_bbox[1]
            is_single_row = (cl_h < 45.0 or len(cl["blocks"]) > 1)
            surviving_spans: List[Dict[str, Any]] = []

            if is_single_row:
                # Build per-vinculum span groups for correct multi-span radical grouping
                # key: vinculum index -> list of (span, decoded_text)
                vinculum_span_groups: Dict[int, List] = {}
                all_raw_spans = []
                for block in cl["blocks"]:
                    for line in block.get("lines", []):
                        for s in line.get("spans", []):
                            if s.get("is_consumed"):
                                continue
                            all_raw_spans.append(s)

                # First pass: decode each span and assign to a vinculum group (if any)
                span_records = []  # list of (decoded_txt, is_special, bbox, size, formula_object, vinculum_idx)
                for s in all_raw_spans:
                    txt = s.get("special_latex")
                    is_spec = bool(txt)
                    vinculum_idx = -1
                    if not txt:
                        chars = s.get("chars", [])
                        raw_span_text = "".join(ch.get("c", "") for ch in chars) if chars else s.get("text", "")
                        if not raw_span_text.strip():
                            continue
                        sb = s.get("bbox", [0, 0, 0, 0])
                        for ri, rd in enumerate(rad_drawings):
                            vx0, vy, vx1 = rd["vinculum"]
                            # Span is under this vinculum if it overlaps the x-range and is at the right y-level
                            span_x_mid = (sb[0] + sb[2]) / 2.0
                            if (sb[0] >= vx0 - 4.0 and sb[2] <= vx1 + 4.0) and (vy - 2.0 <= sb[1] <= vy + 14.0):
                                vinculum_idx = ri
                                break
                            # Also accept spans that merely start in the vinculum x-range
                            elif (sb[0] >= vx0 - 4.0 and sb[0] <= vx1 + 2.0) and (vy - 2.0 <= sb[1] <= vy + 14.0):
                                vinculum_idx = ri
                                break
                        txt = _decode_symbol_font_span(raw_span_text, s.get("font", ""))
                    span_records.append({
                        "text": txt,
                        "bbox": s.get("bbox", [0, 0, 0, 0]),
                        "size": s.get("size", 10),
                        "is_special": is_spec,
                        "formula_object": s.get("formula_object"),
                        "vinculum_idx": vinculum_idx,
                    })

                # Second pass: for each vinculum group, build combined \sqrt{...} and mark as single special span
                # Spans NOT under a vinculum remain as-is
                used_vinculum_indices: set = set()
                for rec in span_records:
                    vi = rec["vinculum_idx"]
                    if vi >= 0 and vi not in used_vinculum_indices:
                        used_vinculum_indices.add(vi)
                        vx0, vy, vx1 = rad_drawings[vi]["vinculum"]
                        # Collect all spans for this vinculum
                        under_spans = [r for r in span_records if r["vinculum_idx"] == vi]
                        under_spans.sort(key=lambda r: r["bbox"][0])
                        # Build expression from the sub-spans (with sub/superscript logic)
                        sub_parts: List[str] = []
                        prev_r = None
                        for ur in under_spans:
                            t = ur["text"]
                            if prev_r and not ur["is_special"] and not prev_r["is_special"] and ur["size"] < prev_r["size"] * 0.85 and ur["bbox"][1] > prev_r["bbox"][1] + 1.0 and ur["bbox"][0] <= prev_r["bbox"][2] + 2.5:
                                sub_parts.append(f"_{{{t}}}")
                            elif prev_r and not ur["is_special"] and not prev_r["is_special"] and ur["size"] < prev_r["size"] * 0.85 and ur["bbox"][3] < prev_r["bbox"][3] - 1.0 and ur["bbox"][0] <= prev_r["bbox"][2] + 2.5:
                                sub_parts.append(f"^{{{t}}}")
                            else:
                                if sub_parts and not sub_parts[-1].endswith("{") and t not in "+-=":
                                    sub_parts.append(" ")
                                sub_parts.append(t)
                            prev_r = ur
                        combined = "".join(sub_parts).strip()
                        surviving_spans.append({
                            "text": f"\\sqrt{{{combined}}}",
                            "bbox": rec["bbox"],
                            "size": rec["size"],
                            "is_special": True,  # treat as already-processed
                            "formula_object": rec.get("formula_object"),
                        })
                    elif vi < 0:  # Not under any vinculum
                        surviving_spans.append({
                            "text": rec["text"],
                            "bbox": rec["bbox"],
                            "size": rec["size"],
                            "is_special": rec["is_special"],
                            "formula_object": rec.get("formula_object"),
                        })
                    # Spans with vi >= 0 but already processed (used_vinculum_indices) are skipped (part of group)
                if not surviving_spans:
                    continue
                spans_sorted = sorted(surviving_spans, key=lambda s: s["bbox"][0])
                opt_label_pat = re.compile(r"^\(([1-4A-Da-d])\)")
                opt_indices = [i for i, s in enumerate(spans_sorted) if opt_label_pat.match(s["text"].strip())]

                if len(opt_indices) > 1:
                    # Partition horizontal row cluster across multiple distinct option containers
                    for k in range(len(opt_indices)):
                        start_idx = opt_indices[k]
                        end_idx = opt_indices[k + 1] if k + 1 < len(opt_indices) else len(spans_sorted)
                        seg = spans_sorted[start_idx:end_idx]
                        if not seg:
                            continue
                        sub_parts = []
                        prev_s = None
                        for s in seg:
                            t = s["text"]
                            if prev_s and not s["is_special"] and not prev_s["is_special"] and s["size"] < prev_s["size"] * 0.85 and s["bbox"][1] > prev_s["bbox"][1] + 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                                sub_parts.append(f"_{{{t}}}")
                            elif prev_s and not s["is_special"] and not prev_s["is_special"] and s["size"] < prev_s["size"] * 0.85 and s["bbox"][3] < prev_s["bbox"][3] - 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                                sub_parts.append(f"^{{{t}}}")
                            else:
                                if sub_parts and not sub_parts[-1].endswith("{") and t not in ("+", "-", "=") and sub_parts[-1] not in ("+", "-", "="):
                                    sub_parts.append(" ")
                                sub_parts.append(t)
                            prev_s = s

                        sub_full = "".join(sub_parts).strip()
                        if not sub_full:
                            continue
                        clean_sub = sanitize_math_font_artifacts(sub_full)
                        clean_sub = specialized_math.convert_embedded_math(clean_sub)

                        seg_x0 = round(min(s["bbox"][0] for s in seg) * scale_x)
                        seg_y0 = round(min(s["bbox"][1] for s in seg) * scale_y)
                        seg_x1 = round(max(s["bbox"][2] for s in seg) * scale_x)
                        seg_y1 = round(max(s["bbox"][3] for s in seg) * scale_y)
                        seg_w = max(1, seg_x1 - seg_x0)
                        seg_h = max(1, seg_y1 - seg_y0)

                        seg_formula_objs = [s["formula_object"] for s in seg if s.get("formula_object")]
                        from ..scientific.spatial_math_engine import spatial_math_engine
                        sub_text_fos = spatial_math_engine.extract_formula_objects_from_text(
                            clean_sub,
                            bbox=(seg_x0, seg_y0, seg_w, seg_h)
                        )
                        seen_sub_latex = {fo["latex"] for fo in seg_formula_objs}
                        for tfo in sub_text_fos:
                            if tfo["latex"] not in seen_sub_latex:
                                seg_formula_objs.append(tfo)
                                seen_sub_latex.add(tfo["latex"])

                        spans.append({
                            "id": f"p{page_number}_b{b_idx}_opt{k+1}",
                            "text": clean_sub,
                            "raw_text": sub_full,
                            "bbox": [seg_x0, seg_y0, seg_w, seg_h],
                            "confidence": 0.99,
                            "source": "DIGITAL_EMBEDDED",
                            "font_size": seg[0].get("size", 12),
                            "formula_objects": seg_formula_objs,
                        })
                    continue

                parts = []
                prev_s = None
                for s in spans_sorted:
                    t = s["text"]
                    if prev_s and not s["is_special"] and not prev_s["is_special"] and s["size"] < prev_s["size"] * 0.85 and s["bbox"][1] > prev_s["bbox"][1] + 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                        parts.append(f"_{{{t}}}")
                    elif prev_s and not s["is_special"] and not prev_s["is_special"] and s["size"] < prev_s["size"] * 0.85 and s["bbox"][3] < prev_s["bbox"][3] - 1.0 and s["bbox"][0] <= prev_s["bbox"][2] + 2.5:
                        parts.append(f"^{{{t}}}")
                    else:
                        if parts and not parts[-1].endswith("{") and t not in ("+", "-", "=") and parts[-1] not in ("+", "-", "="):
                            parts.append(" ")
                        parts.append(t)
                    prev_s = s
                full_text = "".join(parts).strip()
            else:
                lines_text = []
                for block in cl["blocks"]:
                    for line in block.get("lines", []):
                        line_parts = []
                        prev_bbox: Optional[List[float]] = None
                        prev_size: float = 10.0
                        prev_special: bool = False
                        for s in line.get("spans", []):
                            if s.get("is_consumed"):
                                continue
                            txt = s.get("special_latex")
                            is_spec = bool(txt)
                            if not txt:
                                chars = s.get("chars", [])
                                raw_span_text = "".join(ch.get("c", "") for ch in chars) if chars else s.get("text", "")
                                if not raw_span_text.strip():
                                    continue
                                sb = s.get("bbox", [0, 0, 0, 0])
                                # Only mark as radical if span overlaps the full vinculum x-range
                                # (not just the start) — prevents partial-span radicals
                                is_radical = False
                                for rd in rad_drawings:
                                    vx0, vy, vx1 = rd["vinculum"]
                                    span_mid_x = (sb[0] + sb[2]) / 2.0
                                    if (sb[0] >= vx0 - 4.0 and sb[2] <= vx1 + 4.0) and (vy - 2.0 <= sb[1] <= vy + 14.0):
                                        is_radical = True
                                        break
                                    elif (sb[0] >= vx0 - 4.0 and sb[0] <= vx1 + 2.0) and (vy - 2.0 <= sb[1] <= vy + 14.0):
                                        is_radical = True
                                        break
                                decoded = _decode_symbol_font_span(raw_span_text, s.get("font", ""))
                                if is_radical:
                                    decoded = f"\\sqrt{{{decoded}}}"
                                txt = decoded
                            s_bbox = s.get("bbox", [0, 0, 0, 0])
                            s_size = s.get("size", 10.0)
                            if prev_bbox and not is_spec and not prev_special and s_size < prev_size * 0.85 and s_bbox[1] > prev_bbox[1] + 1.0 and s_bbox[0] <= prev_bbox[2] + 2.5:
                                line_parts.append(f"_{{{txt}}}")
                            elif prev_bbox and not is_spec and not prev_special and s_size < prev_size * 0.85 and s_bbox[3] < prev_bbox[3] - 1.0 and s_bbox[0] <= prev_bbox[2] + 2.5:
                                line_parts.append(f"^{{{txt}}}")
                            else:
                                if line_parts and not line_parts[-1].endswith("{") and not txt.startswith(",") and txt not in ("+", "-", "="):
                                    line_parts.append(" ")
                                line_parts.append(txt)
                            prev_bbox = s_bbox
                            prev_size = s_size
                            prev_special = is_spec
                        joined = "".join(line_parts).strip()
                        if joined:
                            lines_text.append(joined)
                full_text = "\n".join(lines_text).strip()

            if full_text:
                # Convert stacked vertical fractions in options:
                # e.g. (2)\n v \n sin \theta -> (2) \frac{v}{\sin\theta}
                def repl_opt_frac(m):
                    opt = m.group(1)
                    num = m.group(2)
                    denom = m.group(3).strip()
                    denom = re.sub(r'^(sin|cos|tan|cot|sec|csc)\s*\\theta', r'\\\1\\theta', denom)
                    return f"{opt} \\frac{{{num}}}{{{denom}}}"

                full_text = re.sub(
                    r'(\([1-4A-Da-d]\))\s*\n\s*([a-zA-Z0-9]+)\s*\n\s*((?:sin|cos|tan|cot|sec|csc)?\s*\\theta|\\[a-zA-Z]+|[a-zA-Z0-9]+)',
                    repl_opt_frac,
                    full_text
                )
                clean_full = sanitize_math_font_artifacts(full_text)
                clean_full = specialized_math.convert_embedded_math(clean_full)
                first_blk = cl["blocks"][0]
                first_size = 12
                try:
                    first_size = first_blk.get("lines", [{}])[0].get("spans", [{}])[0].get("size", 12)
                except Exception:
                    pass

                blk_formula_objs = [
                    sp["formula_object"] for sp in surviving_spans if sp.get("formula_object")
                ] if is_single_row else []

                from ..scientific.spatial_math_engine import spatial_math_engine
                text_formula_objs = spatial_math_engine.extract_formula_objects_from_text(
                    clean_full,
                    bbox=(bx0, by0, bx1 - bx0, by1 - by0)
                )
                seen_f_latex = {fo["latex"] for fo in blk_formula_objs}
                for tfo in text_formula_objs:
                    if tfo["latex"] not in seen_f_latex:
                        blk_formula_objs.append(tfo)
                        seen_f_latex.add(tfo["latex"])

                spans.append({
                    "id": f"p{page_number}_b{b_idx}",
                    "text": clean_full,
                    "raw_text": full_text,
                    "bbox": [bx0, by0, bx1 - bx0, by1 - by0],  # [x, y, w, h]
                    "confidence": 0.99,
                    "source": "DIGITAL_EMBEDDED",
                    "font_size": first_size,
                    "formula_objects": blk_formula_objs,
                })

        doc.close()

        # Split any large blocks that contain multiple embedded questions
        spans = split_spans_on_questions(spans, img_width, img_height)
        return spans

    @staticmethod
    def extract_docx_text_spans(
        docx_path: Path,
        page_number: int,
        img_width: int,
        img_height: int,
    ) -> List[Dict[str, Any]]:
        """
        Reads a .docx file directly using python-docx, extracting each paragraph as a span
        while preserving OMML math equations as LaTeX $...$ strings via omml_to_latex().
        This avoids the lossy DOCX -> PDF -> re-extraction round-trip.

        page_number is used to estimate which paragraphs belong to a given page.
        When page_number=1 (the most common single-page DPP case), all paragraphs are returned.
        For multi-page documents, we use a rough character-count heuristic to page-assign paragraphs.
        """
        try:
            import docx  # type: ignore
            from ..document.office_converter import extract_paragraph_with_math
            from ..engines.specialized_math import specialized_math
        except ImportError as e:
            logger.warning(f"python-docx not available for direct DOCX extraction: {e}")
            return []

        try:
            doc_word = docx.Document(str(docx_path))
        except Exception as e:
            logger.error(f"Failed to open DOCX {docx_path.name}: {e}")
            return []

        # Rough chars-per-page estimate for A4 @ 10.5pt
        CHARS_PER_PAGE = 3000

        all_paragraphs = list(doc_word.paragraphs)
        # Also collect table cells
        for table in doc_word.tables:
            for row in table.rows:
                for cell in row.cells:
                    all_paragraphs.extend(cell.paragraphs)

        # Build a flat list of (text, is_heading) for all paragraphs
        para_texts: List[Dict[str, Any]] = []
        for p in all_paragraphs:
            text = extract_paragraph_with_math(p).strip()
            if not text:
                continue
            style_name = getattr(p.style, "name", "") or ""
            is_heading = (
                style_name.startswith("Heading")
                or style_name == "Title"
                or (len(text) < 60 and text.isupper())
            )
            para_texts.append({"text": text, "is_heading": is_heading})

        # Page-assignment heuristic: page_number=1 → first CHARS_PER_PAGE chars
        char_count = 0
        target_page_start = (page_number - 1) * CHARS_PER_PAGE
        target_page_end = page_number * CHARS_PER_PAGE

        # Collect paragraphs for this page
        page_paras: List[Dict[str, Any]] = []
        cumulative = 0
        for pt in para_texts:
            plen = len(pt["text"])
            if cumulative + plen > target_page_start:
                page_paras.append(pt)
            cumulative += plen
            if cumulative >= target_page_end:
                break

        # If we got nothing (e.g. single-page short doc), use all paragraphs
        if not page_paras:
            page_paras = para_texts

        # Build spans with estimated bounding boxes (evenly distributed vertically)
        spans: List[Dict[str, Any]] = []
        total = len(page_paras)
        row_h = max(1, img_height // max(total, 1))

        for idx, pt in enumerate(page_paras):
            raw = pt["text"]
            # Apply embedded-math normalization on top of OMML-extracted LaTeX
            normalized = specialized_math.convert_embedded_math(raw)
            est_y = idx * row_h
            est_h = row_h if idx < total - 1 else max(row_h, img_height - est_y)

            spans.append({
                "id": f"docx_p{page_number}_para{idx}",
                "text": normalized,
                "raw_text": raw,
                "bbox": [0, est_y, img_width, est_h],
                "confidence": 0.99,
                "source": "DOCX_DIRECT",
                "font_size": 12,
            })

        # Split any spans that contain multiple embedded questions
        spans = split_spans_on_questions(spans, img_width, img_height)
        logger.info(f"DOCX direct extraction: {len(spans)} spans from page {page_number} of {docx_path.name}")
        return spans


digital_extractor = DigitalTextExtractor()
