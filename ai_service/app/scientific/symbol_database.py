"""
Master Scientific Symbol Database Manager
Provides fast lookups, multi-attribute indexing, category grouping,
fuzzy/token search, and confusable resolution.
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

logger = logging.getLogger("symbol_database")


class ScientificSymbolDatabase:
    def __init__(self, data_file: Optional[Path] = None):
        self.data_file = data_file or (
            Path(__file__).resolve().parent.parent / "data" / "scientific_symbols_database.json"
        )
        self.symbols: List[Dict[str, Any]] = []
        self.by_id: Dict[str, Dict[str, Any]] = {}
        self.by_symbol: Dict[str, Dict[str, Any]] = {}
        self.by_latex: Dict[str, Dict[str, Any]] = {}
        self.by_domain: Dict[str, List[Dict[str, Any]]] = {}
        self.by_category: Dict[str, List[Dict[str, Any]]] = {}
        self.confusable_map: Dict[str, List[Dict[str, Any]]] = {}
        self._load()

    def _load(self):
        if not self.data_file.exists():
            logger.warning(f"Scientific symbol database not found at {self.data_file}")
            return

        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.symbols = data.get("symbols", [])

            for sym in self.symbols:
                s_id = sym.get("id")
                s_char = sym.get("symbol")
                s_latex = sym.get("latex")
                s_domain = sym.get("domain", "GENERAL_SCIENCE")
                s_cat = sym.get("category", "OTHER")

                if s_id:
                    self.by_id[s_id] = sym
                if s_char:
                    self.by_symbol[s_char] = sym
                if s_latex:
                    self.by_latex[s_latex] = sym
                    clean_ltx = s_latex.lstrip("\\")
                    if clean_ltx not in self.by_latex:
                        self.by_latex[clean_ltx] = sym

                self.by_domain.setdefault(s_domain, []).append(sym)
                self.by_category.setdefault(s_cat, []).append(sym)

                # Index confusables
                for conf in sym.get("confusableSymbols", []):
                    self.confusable_map.setdefault(conf, []).append(sym)

            logger.info(f"Loaded {len(self.symbols)} scientific symbols across {len(self.by_domain)} domains.")
        except Exception as e:
            logger.error(f"Failed to load scientific symbols database: {e}")

    def lookup_symbol(self, symbol_char: str) -> Optional[Dict[str, Any]]:
        """Finds symbol record by exact unicode character or token."""
        return self.by_symbol.get(symbol_char) or self.by_latex.get(symbol_char)

    def search(
        self,
        query: str,
        domain: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Searches symbols by name, alias, LaTeX, unicode, or description.
        e.g. search('theta') -> [θ, Θ, ϑ]
             search('mu') -> [μ, Μ, μm, μL]
             search('integral') -> [∫, ∬, ∭, ∮]
        """
        if not query or not query.strip():
            return self.symbols[:limit]

        q = query.strip().lower()
        q_clean = q.lstrip("\\")
        results: List[Tuple[int, Dict[str, Any]]] = []

        pool = self.by_domain.get(domain, self.symbols) if domain else self.symbols

        for sym in pool:
            score = 0
            sym_char = sym.get("symbol", "").lower()
            sym_name = sym.get("name", "").lower()
            sym_latex = sym.get("latex", "").lower().lstrip("\\")
            aliases = [a.lower() for a in sym.get("aliases", [])]

            # Exact matches get top score
            if q == sym_char or q_clean == sym_latex or q == sym_name:
                score = 100
            elif q in aliases:
                score = 90
            elif sym_name.startswith(q) or sym_latex.startswith(q_clean):
                score = 75
            elif any(a.startswith(q) for a in aliases):
                score = 65
            elif q in sym_name or q_clean in sym_latex:
                score = 50
            elif q in sym.get("description", "").lower() or q in sym.get("commonMeaning", "").lower():
                score = 30

            if score > 0:
                results.append((score, sym))

        # Sort descending by relevance score
        results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in results[:limit]]

    def get_palette(self, domain: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns categorized symbol lists formatted for formula editor palettes:
        Mathematics, Greek, Calculus, Algebra, Geometry, Physics, Chemistry, Biology, Units, etc.
        """
        palette: Dict[str, List[Dict[str, Any]]] = {
            "Greek Lowercase": self.by_category.get("GREEK_LETTERS", []),
            "Greek Uppercase": [s for s in self.by_category.get("GREEK_LETTERS", []) if s.get("subcategory") == "UPPERCASE"],
            "Arithmetic & Relations": self.by_category.get("ARITHMETIC", []),
            "Inequalities": self.by_category.get("INEQUALITIES", []),
            "Roots & Radicals": self.by_category.get("ROOTS", []),
            "Calculus & Analysis": self.by_category.get("CALCULUS", []),
            "Set Theory & Logic": self.by_category.get("SET_THEORY_LOGIC", []),
            "Number Systems": self.by_category.get("NUMBER_SYSTEMS", []),
            "Geometry & Vectors": self.by_category.get("GEOMETRY_VECTORS", []),
            "Biology & Genetics": self.by_category.get("BIOLOGY", []),
            "Scientific Units": self.by_category.get("UNITS", []),
            "Chemical Elements": self.by_category.get("PERIODIC_TABLE", [])
        }

        # Filter if domain specified
        if domain and domain.upper() in self.by_domain:
            filtered: Dict[str, List[Dict[str, Any]]] = {}
            for cat, items in palette.items():
                d_items = [it for it in items if it.get("domain") == domain.upper()]
                if d_items:
                    filtered[cat] = d_items
            return filtered

        return palette


symbol_database = ScientificSymbolDatabase()
