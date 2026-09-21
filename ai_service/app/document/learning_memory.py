import json
import logging
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import difflib

logger = logging.getLogger("learning_memory")

class LearningMemoryEngine:
    """
    Self-learning memory system that captures user corrections, compares raw extracted text 
    with user-snipped images and manual edits, discovers token substitution rules, 
    and automatically applies them to future document extractions.
    """

    def __init__(self, data_file: Optional[Path] = None):
        self.data_dir = Path(__file__).resolve().parent.parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.data_file = data_file or (self.data_dir / "learned_corrections.json")
        self.rules: List[Dict[str, Any]] = []
        self._load_memory()

    def _load_memory(self):
        """Loads persisted learned correction rules from disk."""
        if self.data_file.exists():
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    loaded_rules = data.get("rules", [])
                    # Guard: Filter out any corrupt or dangerous syntax/delimiter rules
                    self.rules = [
                        r for r in loaded_rules
                        if r.get("raw_pattern") not in [r"\}\{", "}{", r"\{", r"\}", "{", "}", r"\$\n\$"]
                        and "dr/dt}}" not in r.get("raw_pattern", "")
                        and r.get("id") != "diff_767843"
                    ]
                logger.info(f"Loaded {len(self.rules)} learned correction rules from memory.")
            except Exception as e:
                logger.error(f"Error loading learned corrections: {e}")
                self.rules = []
        else:
            self.rules = self._get_initial_seed_rules()
            self._save_memory()

    def _save_memory(self):
        """Persists learned rules to disk."""
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump({
                    "version": "1.0",
                    "total_rules": len(self.rules),
                    "rules": self.rules,
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving learned corrections to disk: {e}")

    def _get_initial_seed_rules(self) -> List[Dict[str, Any]]:
        """Standard educational symbol seed rules."""
        return [
            {
                "id": "rule_times_accent",
                "raw_pattern": r'(\d+|\))\s*[´`’‘′×✕✖]\s*(\d+|\()',
                "replacement": r'\1 \\times \2',
                "is_regex": True,
                "description": "Convert legacy font accent/prime symbols between numbers to multiplication \\times",
                "occurrences": 10,
                "confidence": 0.99,
                "created_from": "SYSTEM_SEED",
            },
            {
                "id": "rule_superscript_gap",
                "raw_pattern": r'(\d+)\s+([23456789])(?=\s*(?:\\times|[×´\+\-\/\*])|\b)',
                "replacement": r'\1^\2',
                "is_regex": True,
                "description": "Merge spurious whitespace between base number and exponent power (e.g. 60 2 -> 60^2)",
                "occurrences": 10,
                "confidence": 0.98,
                "created_from": "SYSTEM_SEED",
            },
            {
                "id": "rule_units_ms2",
                "raw_pattern": r'm/s\s*[-–]?\s*2\b',
                "replacement": r'm/s^2',
                "is_regex": True,
                "description": "Normalize acceleration unit m/s 2 to standard physics m/s^2",
                "occurrences": 10,
                "confidence": 0.99,
                "created_from": "SYSTEM_SEED",
            },
        ]

    def record_user_correction(
        self,
        raw_text: str,
        corrected_text: str,
        image_path: Optional[str] = None,
        context_domain: str = "GENERAL"
    ) -> Dict[str, Any]:
        """
        Analyzes discrepancy between raw extracted text and user correction (or cropped image),
        extracts substitution patterns, and saves new learning rules to memory.
        """
        raw_clean = raw_text.strip() if raw_text else ""
        corr_clean = corrected_text.strip() if corrected_text else ""

        if not raw_clean or not corr_clean or raw_clean == corr_clean:
            return {"status": "NO_CHANGE", "learned_rules_count": 0}

        new_rules_created = []

        # 1. Check exact phrase match rule
        exact_rule_id = f"exact_{abs(hash(raw_clean)) % 1000000}"
        existing = next((r for r in self.rules if r.get("raw_pattern") == raw_clean and not r.get("is_regex")), None)
        if existing:
            existing["replacement"] = corr_clean
            existing["occurrences"] = existing.get("occurrences", 1) + 1
            existing["confidence"] = min(0.99, existing.get("confidence", 0.90) + 0.02)
            new_rules_created.append(existing)
        else:
            exact_rule = {
                "id": exact_rule_id,
                "raw_pattern": raw_clean,
                "replacement": corr_clean,
                "is_regex": False,
                "description": f"User exact correction: '{raw_clean[:30]}...' -> '{corr_clean[:30]}...'",
                "occurrences": 1,
                "confidence": 0.95,
                "created_from": "USER_CORRECTION",
                "context_domain": context_domain,
            }
            self.rules.append(exact_rule)
            new_rules_created.append(exact_rule)

        # 2. Token-level diff analysis to extract generalized micro-patterns
        matcher = difflib.SequenceMatcher(None, raw_clean, corr_clean)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'replace':
                raw_token = raw_clean[i1:i2]
                corr_token = corr_clean[j1:j2]

                # Guard against dangerous single-letter, common word fragment, or syntax bracket substitutions
                raw_s = raw_token.strip()
                corr_s = corr_token.strip()
                if len(raw_s) <= 1 or (raw_s.isalpha() and len(raw_s) < 3):
                    continue
                if raw_s in ["lyPrac", "rS", "c", "l", "B"]:
                    continue
                # NEVER learn raw syntax brackets or delimiter fragments (e.g. }{, {, }, \, $, /)
                if raw_s in ["}{", "{", "}", "\\", "$", "/"] or corr_s in ["}{", "{", "}", "\\", "$", "/"]:
                    continue
                if "}{" in raw_s or "}{" in corr_s:
                    continue
                # Reject unbalanced braces
                if raw_s.count("{") != raw_s.count("}") or corr_s.count("{") != corr_s.count("}"):
                    continue

                # If token is short (e.g. ´ -> \times or 2 -> ^2)
                if len(raw_token) <= 15 and len(corr_token) <= 25 and raw_token != corr_token:
                    escaped_raw = re.escape(raw_token)
                    rule_id = f"diff_{abs(hash(raw_token + corr_token)) % 1000000}"
                    
                    token_existing = next((r for r in self.rules if r.get("raw_pattern") == escaped_raw and r.get("is_regex")), None)
                    if token_existing:
                        token_existing["replacement"] = corr_token
                        token_existing["occurrences"] = token_existing.get("occurrences", 1) + 1
                        token_existing["confidence"] = min(0.99, token_existing.get("confidence", 0.90) + 0.02)
                    else:
                        diff_rule = {
                            "id": rule_id,
                            "raw_pattern": escaped_raw,
                            "replacement": corr_token,
                            "is_regex": True,
                            "description": f"Learned token mapping: '{raw_token}' -> '{corr_token}'",
                            "occurrences": 1,
                            "confidence": 0.92,
                            "created_from": "TOKEN_DIFF",
                            "context_domain": context_domain,
                        }
                        self.rules.append(diff_rule)
                        new_rules_created.append(diff_rule)

        self._save_memory()
        logger.info(f"Learned {len(new_rules_created)} correction rule(s) from user feedback.")

        return {
            "status": "SUCCESS",
            "learned_rules_count": len(new_rules_created),
            "rules": new_rules_created,
            "total_rules": len(self.rules),
        }

    def apply_learned_corrections(self, text: str) -> str:
        """
        Applies all learned correction rules to sanitize and improve raw extracted text.
        """
        if not text:
            return ""

        result = text
        for rule in self.rules:
            pattern = rule.get("raw_pattern", "")
            replacement = rule.get("replacement", "")
            is_regex = rule.get("is_regex", False)
            confidence = rule.get("confidence", 0.5)

            if confidence < 0.7 or not pattern:
                continue

            # Safety check: Never allow single alpha character substitution rules to corrupt words
            clean_pat = pattern.replace("\\", "").strip()
            if len(clean_pat) <= 1 or (clean_pat.isalpha() and len(clean_pat) < 3):
                continue

            try:
                if is_regex:
                    result = re.sub(pattern, replacement, result)
                else:
                    result = result.replace(pattern, replacement)
            except Exception as e:
                logger.debug(f"Failed to apply rule {rule.get('id')}: {e}")

        return result

    def get_memory_stats(self) -> Dict[str, Any]:
        """Returns statistics of all learned rules and patterns in memory."""
        return {
            "total_rules": len(self.rules),
            "user_learned_count": len([r for r in self.rules if r.get("created_from") != "SYSTEM_SEED"]),
            "system_seed_count": len([r for r in self.rules if r.get("created_from") == "SYSTEM_SEED"]),
            "rules": self.rules,
        }

    def delete_rule(self, rule_id: str) -> bool:
        """Allows deleting a specific learned rule."""
        initial_len = len(self.rules)
        self.rules = [r for r in self.rules if r.get("id") != rule_id]
        if len(self.rules) < initial_len:
            self._save_memory()
            return True
        return False

learning_memory_engine = LearningMemoryEngine()
