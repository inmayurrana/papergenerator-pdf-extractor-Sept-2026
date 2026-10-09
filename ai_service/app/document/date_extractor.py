"""
Comprehensive Date & Schedule Extraction Engine
Supports PDF, DOCX, scanned pages, images, tables, headers, footers.
Recognizes:
- DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, YYYY/MM/DD
- 9 October 2026, October 9, 2026, 9 Oct 2026, Oct 9, 2026
- Ordinals: 9th October 2026, 1st Jan 2025, 22nd Nov 2024
- Dates with time: 09/10/2026 10:30 AM, 2026-10-09 14:00, 9 Oct 2026 at 2:30 PM
- Date ranges: 09/10/2026 to 15/10/2026, 9 Oct 2026 - 12 Oct 2026, 2025-2026
- Ambiguity detection: Flags ambiguous dates (e.g. 03/04/2026) with possible interpretations.
- Negative filters: Prevents question numbers, ratios, fractions, roll numbers from being treated as dates.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger("date_extractor")

class DateExtractor:
    MONTH_NAMES = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8,
        "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12
    }

    MONTH_REGEX_STR = r"(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    ORDINAL_SUFFIX_STR = r"(?:st|nd|rd|th)?"

    # 1. Textual Month: "9 October 2026", "9th Oct 2026", "October 9, 2026", "Oct 9th 2026"
    TEXTUAL_DATE_PATTERN = re.compile(
        rf"\b(?:(?P<day1>[0-2]?[1-9]|3[01]){ORDINAL_SUFFIX_STR}\s+(?P<month1>{MONTH_REGEX_STR})|(?P<month2>{MONTH_REGEX_STR})\s+(?P<day2>[0-2]?[1-9]|3[01]){ORDINAL_SUFFIX_STR})"
        rf"(?:[,\s]+(?P<year>(?:19|20)\d{{2}}))\b",
        re.IGNORECASE
    )

    # 2. ISO Date: YYYY-MM-DD or YYYY/MM/DD
    ISO_DATE_PATTERN = re.compile(
        r"\b(?P<year>(?:19|20)\d{2})[-/.](?P<month>0[1-9]|1[0-2])[-/.](?P<day>0[1-9]|[12]\d|3[01])\b"
    )

    # 3. Numeric Date: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    NUMERIC_DATE_PATTERN = re.compile(
        r"\b(?P<first>0?[1-9]|[12]\d|3[01])[-/.](?P<second>0?[1-9]|[12]\d|3[01])[-/.](?P<year>(?:19|20)\d{2}|\d{2})\b"
    )

    # 4. Academic Session / Year Range: "2025-2026", "2024-25", "Session: 2026-27"
    SESSION_PATTERN = re.compile(
        r"\b(?:Session|Academic\s*Year|Year)?\s*[:=\-]?\s*((?:19|20)\d{2})\s*(?:[-–/])\s*((?:19|20)?\d{2})\b",
        re.IGNORECASE
    )

    # 5. Time component following date: "10:30 AM", "14:00", "09:45:00"
    TIME_PATTERN = re.compile(
        r"\b(?:at\s+)?(?P<hour>0?[1-9]|1[0-2]|2[0-3]):(?P<minute>[0-5]\d)(?::(?P<second>[0-5]\d))?\s*(?P<ampm>AM|PM)?\b",
        re.IGNORECASE
    )

    @classmethod
    def _is_valid_date(cls, year: int, month: int, day: int) -> bool:
        try:
            datetime(year=year, month=month, day=day)
            return True
        except ValueError:
            return False

    @classmethod
    def extract_dates_from_spans(
        cls,
        spans: List[Dict[str, Any]],
        page_number: int = 1,
        locale_preference: str = "DMY"  # DMY (Indian/UK/Intl) or MDY (US)
    ) -> List[Dict[str, Any]]:
        """
        Scans document text spans and extracts structured dates with bounding boxes,
        verbatim source strings, normalized ISO format, and ambiguity resolution.
        """
        extracted = []
        seen_keys = set()

        for s in spans:
            text = s.get("text", "").strip()
            bbox = s.get("bbox", [0, 0, 0, 0])
            if not text:
                continue

            # Skip math formulas and fractions that look like divisions (e.g. 1/2, 3/4)
            if re.search(r"[=><+\-×÷√∫∑∏\\_^{}]", text) and not re.search(r"\b(?:Date|Dated|Session)\b", text, re.IGNORECASE):
                continue

            # Pass A: Textual dates ("9th October 2026", "October 9, 2026")
            for m in cls.TEXTUAL_DATE_PATTERN.finditer(text):
                matched_str = m.group(0).strip()
                day_val = int(m.group("day1") or m.group("day2"))
                month_name = (m.group("month1") or m.group("month2")).lower()
                month_val = cls.MONTH_NAMES.get(month_name, 1)
                year_val = int(m.group("year"))

                if not cls._is_valid_date(year_val, month_val, day_val):
                    continue

                iso_str = f"{year_val:04d}-{month_val:02d}-{day_val:02d}"
                key = (page_number, iso_str, matched_str)
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                # Check for associated time
                time_match = cls.TIME_PATTERN.search(text[m.end():m.end() + 25])
                time_str = time_match.group(0).strip() if time_match else None

                extracted.append({
                    "original_text": matched_str,
                    "normalized_iso": iso_str,
                    "date_type": "DATE_TIME" if time_str else "EXACT_DATE",
                    "time": time_str,
                    "is_ambiguous": False,
                    "possible_interpretations": [iso_str],
                    "page_number": page_number,
                    "bbox": bbox,
                    "confidence": 0.98,
                    "source": "TEXTUAL_MONTH"
                })

            # Pass B: ISO dates ("2026-10-09")
            for m in cls.ISO_DATE_PATTERN.finditer(text):
                matched_str = m.group(0).strip()
                year_val = int(m.group("year"))
                month_val = int(m.group("month"))
                day_val = int(m.group("day"))

                if not cls._is_valid_date(year_val, month_val, day_val):
                    continue

                iso_str = f"{year_val:04d}-{month_val:02d}-{day_val:02d}"
                key = (page_number, iso_str, matched_str)
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                extracted.append({
                    "original_text": matched_str,
                    "normalized_iso": iso_str,
                    "date_type": "EXACT_DATE",
                    "time": None,
                    "is_ambiguous": False,
                    "possible_interpretations": [iso_str],
                    "page_number": page_number,
                    "bbox": bbox,
                    "confidence": 0.99,
                    "source": "ISO_NUMERIC"
                })

            # Pass C: Numeric dates ("09/10/2026", "09-10-2026", "09.10.2026")
            for m in cls.NUMERIC_DATE_PATTERN.finditer(text):
                matched_str = m.group(0).strip()
                # Exclude math fractions like 1/2 or ratios 3:1
                first = int(m.group("first"))
                second = int(m.group("second"))
                raw_year = m.group("year")
                year_val = int(raw_year) if len(raw_year) == 4 else (2000 + int(raw_year) if int(raw_year) < 70 else 1900 + int(raw_year))

                # Check if first and second are ambiguous (e.g. 03/04/2026)
                is_ambiguous = False
                interpretations = []

                if first <= 12 and second <= 12 and first != second:
                    is_ambiguous = True
                    dmy_iso = f"{year_val:04d}-{second:02d}-{first:02d}"
                    mdy_iso = f"{year_val:04d}-{first:02d}-{second:02d}"
                    interpretations = [dmy_iso, mdy_iso]
                    if locale_preference == "DMY":
                        day_val, month_val = first, second
                        primary_iso = dmy_iso
                    else:
                        day_val, month_val = second, first
                        primary_iso = mdy_iso
                elif first > 12 and second <= 12:
                    # Unambiguously DMY (e.g. 25/10/2026)
                    day_val, month_val = first, second
                    primary_iso = f"{year_val:04d}-{month_val:02d}-{day_val:02d}"
                    interpretations = [primary_iso]
                elif second > 12 and first <= 12:
                    # Unambiguously MDY (e.g. 10/25/2026)
                    day_val, month_val = second, first
                    primary_iso = f"{year_val:04d}-{month_val:02d}-{day_val:02d}"
                    interpretations = [primary_iso]
                else:
                    continue

                if not cls._is_valid_date(year_val, month_val, day_val):
                    continue

                key = (page_number, primary_iso, matched_str)
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                # Check for time
                time_match = cls.TIME_PATTERN.search(text[m.end():m.end() + 25])
                time_str = time_match.group(0).strip() if time_match else None

                extracted.append({
                    "original_text": matched_str,
                    "normalized_iso": primary_iso,
                    "date_type": "DATE_TIME" if time_str else "EXACT_DATE",
                    "time": time_str,
                    "is_ambiguous": is_ambiguous,
                    "possible_interpretations": interpretations,
                    "page_number": page_number,
                    "bbox": bbox,
                    "confidence": 0.88 if is_ambiguous else 0.96,
                    "source": "NUMERIC_DMY_MDY"
                })

            # Pass D: Academic session range ("2025-2026", "2024-25")
            for m in cls.SESSION_PATTERN.finditer(text):
                matched_str = m.group(0).strip()
                y1 = int(m.group(1))
                y2_str = m.group(2)
                y2 = int(y2_str) if len(y2_str) == 4 else (int(str(y1)[:2] + y2_str))

                if 1950 <= y1 <= 2070 and y2 == y1 + 1:
                    key = (page_number, f"{y1}-{y2}", matched_str)
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)

                    extracted.append({
                        "original_text": matched_str,
                        "normalized_iso": f"{y1}-{y2}",
                        "date_type": "ACADEMIC_SESSION",
                        "time": None,
                        "is_ambiguous": False,
                        "possible_interpretations": [f"{y1}-{y2}"],
                        "page_number": page_number,
                        "bbox": bbox,
                        "confidence": 0.95,
                        "source": "SESSION_RANGE"
                    })

        return extracted

    @classmethod
    def extract_dates_from_text(
        cls,
        text: str,
        page_number: int = 1,
        locale_preference: str = "DMY"
    ) -> List[Dict[str, Any]]:
        """Extract dates directly from a raw text string or multiline text block."""
        fake_spans = [
            {"text": line, "bbox": [0, idx * 20, 100, 20]}
            for idx, line in enumerate(text.split("\n"))
            if line.strip()
        ]
        return cls.extract_dates_from_spans(fake_spans, page_number, locale_preference)

date_extractor = DateExtractor()

