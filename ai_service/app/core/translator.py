import re
import logging
from typing import Dict, Any, List, Optional
from langdetect import detect, detect_langs  # type: ignore
from deep_translator import MyMemoryTranslator, GoogleTranslator  # type: ignore

logger = logging.getLogger("translator")

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "ur": "Urdu (اردو)",
    "sa": "Sanskrit (संस्कृतम्)",
    "bn": "Bengali (বাংলা)",
    "mr": "Marathi (मराठी)",
    "gu": "Gujarati (ગુજરાતી)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "es": "Spanish (Español)",
}

MYMEMORY_LOCALE_MAP = {
    "en": "en-US",
    "hi": "hi-IN",
    "pa": "pa-IN",
    "ur": "ur-PK",
    "sa": "sa-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "fr": "fr-FR",
    "de": "de-DE",
    "es": "es-ES",
}

class TranslationService:
    """Provides high-accuracy language detection and formula-preserving translation for exam questions."""

    @staticmethod
    def detect_language(text: str) -> Dict[str, Any]:
        """Detects language using Unicode script matching and langdetect."""
        if not text or not text.strip():
            return {"language": "en", "name": "English", "confidence": 1.0}

        cleaned = text.strip()

        # Check Unicode ranges for Indic and Middle-Eastern scripts first
        if re.search(r"[\u0A00-\u0A7F]", cleaned):
            return {"language": "pa", "name": "Punjabi (ਪੰਜਾਬੀ)", "confidence": 0.99}
        if re.search(r"[\u0600-\u06FF]", cleaned):
            return {"language": "ur", "name": "Urdu (اردو)", "confidence": 0.99}
        if re.search(r"[\u0A80-\u0AFF]", cleaned):
            return {"language": "gu", "name": "Gujarati (ગુજરાતી)", "confidence": 0.99}
        if re.search(r"[\u0980-\u09FF]", cleaned):
            return {"language": "bn", "name": "Bengali (বাংলা)", "confidence": 0.99}
        if re.search(r"[\u0B80-\u0BFF]", cleaned):
            return {"language": "ta", "name": "Tamil (தமிழ்)", "confidence": 0.99}
        if re.search(r"[\u0C00-\u0C7F]", cleaned):
            return {"language": "te", "name": "Telugu (తెలుగు)", "confidence": 0.99}
        if re.search(r"[\u0C80-\u0CFF]", cleaned):
            return {"language": "kn", "name": "Kannada (ಕನ್ನಡ)", "confidence": 0.99}
        if re.search(r"[\u0D00-\u0D7F]", cleaned):
            return {"language": "ml", "name": "Malayalam (മലയാളം)", "confidence": 0.99}
        if re.search(r"[\u0900-\u097F]", cleaned):
            # Devanagari (Hindi, Marathi, Sanskrit)
            if re.search(r"\b(?:आहे|नाही|झाले|करणे|म्हणून)\b", cleaned):
                return {"language": "mr", "name": "Marathi (मराठी)", "confidence": 0.95}
            elif re.search(r"\b(?:अस्ति|भवति|किम्|कथम्|संस्कृत)\b", cleaned):
                return {"language": "sa", "name": "Sanskrit (संस्कृतम्)", "confidence": 0.95}
            else:
                return {"language": "hi", "name": "Hindi (हिन्दी)", "confidence": 0.98}

        # Use langdetect for Latin / European scripts
        try:
            detected_langs = detect_langs(cleaned)
            if detected_langs:
                best = detected_langs[0]
                code = best.lang.lower()
                name = LANGUAGE_NAMES.get(code, code.upper())
                return {"language": code, "name": name, "confidence": round(best.prob, 2)}
        except Exception:
            pass

        return {"language": "en", "name": "English", "confidence": 0.9}

    @staticmethod
    def translate_exam_text(text: str, target_lang: str, source_lang: Optional[str] = None) -> Dict[str, Any]:
        """
        Translates exam text while preserving LaTeX formulas, option keys (A)-(D),
        and marks brackets [2 Marks] verbatim.
        """
        if not text or not text.strip():
            return {"translated_text": "", "source_lang": source_lang or "en", "target_lang": target_lang}

        target_code = target_lang.lower().strip()
        if not source_lang or source_lang == "auto":
            detected = TranslationService.detect_language(text)
            source_code = detected["language"]
        else:
            source_code = source_lang.lower().strip()

        # If source and target are the same, return as is
        if source_code == target_code:
            return {
                "translated_text": text,
                "source_lang": source_code,
                "target_lang": target_code,
                "detected_name": LANGUAGE_NAMES.get(source_code, source_code),
            }

        # Protect math equations, option labels, and marks tags
        placeholders: List[Dict[str, Any]] = []

        def replace_with_token(match: re.Match) -> str:
            idx = len(placeholders)
            token = f"XYZTOK{idx}XYZ"
            placeholders.append({"token": token, "val": match.group(0), "idx": idx})
            return token

        working_text = text

        # 1. Protect block LaTeX equations $$...$$ and \[...\]
        working_text = re.sub(r"\$\$[\s\S]*?\$\$", replace_with_token, working_text)
        working_text = re.sub(r"\\\[[\s\S]*?\\\]", replace_with_token, working_text)
        # 2. Protect inline LaTeX formulas $...$ and \(...\)
        working_text = re.sub(r"\$[^\$\n]+?\$", replace_with_token, working_text)
        working_text = re.sub(r"\\\([^\)]+?\\\)", replace_with_token, working_text)
        # 3. Protect LaTeX command sequences e.g. \frac{a}{b}, \sqrt{x}, \pi, etc.
        working_text = re.sub(r"\\(?:frac|sqrt|int|sum|prod|pm|times|div|le|ge|neq|approx|infty|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Omega|circ|partial|nabla)(?:\{[^}\n]*\})*", replace_with_token, working_text)
        # 4. Protect isolated math symbols and Greek letters
        working_text = re.sub(r"[πθαβγδεϵζηθϑικλμνξπϖρϱστυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ√∛∜∫∬∭∮∑∏±∓≤≥≠≈≡∞∂∇∈∉⊂⊆∪∩∀∃⊥∠°½⅓¼¾]", replace_with_token, working_text)
        # 5. Protect marks tags like [3 Marks], (2 Marks), [1 Mark]
        working_text = re.sub(r"\[\s*\d+\s*(?:marks?|mark|m|pts?)\s*\]", replace_with_token, working_text, flags=re.IGNORECASE)
        working_text = re.sub(r"\(\s*\d+\s*(?:marks?|mark|m|pts?)\s*\)", replace_with_token, working_text, flags=re.IGNORECASE)
        # 6. Protect MCQ option keys like (A), (B), (C), (D), A), B)
        working_text = re.sub(r"\(([A-Da-d1-4])\)|\b([A-Da-d1-4])[.)\]]", replace_with_token, working_text)
        # 7. Protect question headers like Q1., Q.2), Question 3:
        working_text = re.sub(r"^(?:Q(?:uestion)?[\s\.]*\d+|\d+[\.\)]|Q\.?\d+)[\s:]*", replace_with_token, working_text, flags=re.MULTILINE | re.IGNORECASE)

        translated_output = ""

        # Strategy 1: MyMemoryTranslator
        src_locale = MYMEMORY_LOCALE_MAP.get(source_code, f"{source_code}-US")
        tgt_locale = MYMEMORY_LOCALE_MAP.get(target_code, f"{target_code}-IN")

        try:
            mymem = MyMemoryTranslator(source=src_locale, target=tgt_locale)
            if len(working_text) <= 450:
                translated_output = mymem.translate(working_text) or working_text
            else:
                lines = working_text.split("\n")
                chunks: List[str] = []
                current_chunk: List[str] = []
                current_len = 0

                for line in lines:
                    if current_len + len(line) + 1 > 450 and current_chunk:
                        chunks.append("\n".join(current_chunk))
                        current_chunk = [line]
                        current_len = len(line)
                    else:
                        current_chunk.append(line)
                        current_len += len(line) + 1
                if current_chunk:
                    chunks.append("\n".join(current_chunk))

                translated_chunks: List[str] = []
                for c in chunks:
                    try:
                        tc = mymem.translate(c)
                        tc_str = " ".join(tc) if isinstance(tc, list) else (tc or c)
                        translated_chunks.append(tc_str)
                    except Exception as e_c:
                        logger.debug(f"MyMemory chunk error: {e_c}")
                        translated_chunks.append(c)

                translated_output = "\n".join(translated_chunks)

        except Exception as e_mymem:
            logger.warning(f"MyMemory failed: {e_mymem}. Attempting GoogleTranslator.")
            try:
                g_trans = GoogleTranslator(source=source_code, target=target_code)
                res_g = g_trans.translate(working_text)
                translated_output = "\n".join(res_g) if isinstance(res_g, list) else (res_g or working_text)
            except Exception as e_g:
                logger.error(f"GoogleTranslator also failed: {e_g}. Returning original text.")
                translated_output = working_text

        # Ensure translated_output is string
        if isinstance(translated_output, list):
            translated_str = "\n".join(translated_output)
        else:
            translated_str = translated_output or ""

        # Restore all preserved tokens verbatim (safe against LaTeX backslashes like \pm, \frac, \sqrt)
        for p in placeholders:
            token = p["token"]
            original_val = p["val"]
            idx = p["idx"]
            translated_str = translated_str.replace(token, original_val)
            translated_str = translated_str.replace(token.lower(), original_val)
            tol_pattern = re.compile(rf"X\s*Y\s*Z\s*T\s*O\s*K\s*{idx}\s*X\s*Y\s*Z", re.IGNORECASE)
            translated_str = tol_pattern.sub(lambda m, v=original_val: v, translated_str)

        return {
            "translated_text": translated_str,
            "source_lang": source_code,
            "target_lang": target_code,
            "detected_name": LANGUAGE_NAMES.get(source_code, source_code),
            "target_name": LANGUAGE_NAMES.get(target_code, target_code),
        }

translation_service = TranslationService()
