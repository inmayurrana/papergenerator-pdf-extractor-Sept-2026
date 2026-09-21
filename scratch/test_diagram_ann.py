import re

def is_diagram_annotation(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return True
    unmath = re.sub(r"[\$\\]", "", cleaned).strip()
    if re.match(r"^[a-zA-Z]$", unmath):
        return True
    if re.match(r"^[A-Z]{1,4}\d{2,6}[A-Z0-9_\-]*$", cleaned):
        return True
    lines = [ln.strip() for ln in unmath.split("\n") if ln.strip()]
    if all(
        re.match(r"^(?:(?:\d+(?:\.\d+)?\s*(?:kg|g|N|m|cm|mm|V|A|J|s|ms|°|deg|\^circ)?|[A-Za-z]\s*=\s*\d+.*|[MmFfTtAaVvNnXxYyZz](?:_[0-9a-zA-Z]+|\d+)?|[Mm]\s*theta|[Mm]|\d+\s*°)\s*)+$", ln, re.IGNORECASE)
        for ln in lines
    ):
        return True
    words = unmath.split()
    if len(words) <= 5 and not any(p in unmath for p in [".", "?", ":", ";"]):
        common_verbs = {"is", "are", "was", "were", "find", "calculate", "determine", "what", "show", "placed", "shown", "having", "acceleration", "connected", "pulled", "lying"}
        if not any(w.lower() in common_verbs for w in words):
            return True
    return False

tests = [
    "T_1 T_2\nm_3 m_2 m_1 40 N",
    "M_1 M_2 M_3\nF",
    "a",
    "M \theta\nM",
    "NL0084",
    "6 kg",
    "Three blocks of masses m_1, m_2 and m_3 are connected by massless strings...",
    "Three masses M_1, M_2 and M_3 are lying on a frictionless table..."
]

for t in tests:
    print(repr(t[:40]), "-> Annotation?", is_diagram_annotation(t))
