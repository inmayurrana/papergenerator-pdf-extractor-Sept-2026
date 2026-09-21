import re
from typing import Dict, Any

class SpecializedPhysEngine:
    PHYSICS_UNITS = {
        "m/s", "m/s^2", "m/s2", "ms^-1", "ms^-2", "kg", "g", "N", "J", "W", "Pa", "V", "A", "C", "F", "H",
        "Hz", "mol", "K", "rad", "sr", "dB", "eV", "MeV", "GeV", "T", "Wb", "ohm", "Ω"
    }

    @staticmethod
    def normalize_physics_expression(raw_text: str) -> Dict[str, Any]:
        """Recognizes physics units, constants, scientific notation, and variables."""
        phys_str = raw_text.strip()

        # Scientific notation: 1.6 x 10^-19 or 3*10^8
        phys_str = re.sub(r"(\d+(?:\.\d+)?)\s*[xX*]\s*10\^?([+\-]?\d+)", r"\1 \\times 10^{\2}", phys_str)

        # Detect units
        words = phys_str.split()
        found_units = [w for w in words if w.strip(".,()") in SpecializedPhysEngine.PHYSICS_UNITS]

        # Standard physics equations recognition
        is_equation = "=" in phys_str

        return {
            "raw_text": raw_text,
            "normalized": phys_str,
            "detected_units": found_units,
            "is_equation": is_equation,
            "confidence": 0.94 if (found_units or is_equation) else 0.85,
        }

specialized_phys = SpecializedPhysEngine()
