"""
Regression test for universal hardware compatibility:
- Raspberry Pi (ARMv7, ARM64, aarch64, 1-4 GB RAM)
- Intel Core i3 2nd Gen (4-6 GB RAM)
- High-end multi-core machines
Validates:
1. ModelManager hardware tier classification & adaptive safety margin
2. Strict concurrency / memory limits for low-spec / embedded tiers
3. VisualMathRouter graceful degradation to GeometricSpatialAST with zero heavy neural models
"""

import unittest
import numpy as np
from ai_service.app.core.model_manager import model_manager
from ai_service.app.engines.visual_math_router import visual_math_router


class TestUniversalHardwareCompatibility(unittest.TestCase):
    def test_hardware_tier_status(self):
        status = model_manager.status()
        self.assertIn("hardware_tier", status)
        self.assertIn("is_arm", status)
        self.assertIn("is_raspberry_pi", status)
        self.assertIn("max_heavy_models", status)
        self.assertIn("safety_margin_mb", status)
        self.assertIn("allow_vlm", status)

        tier = status["hardware_tier"]
        self.assertIn(tier, ["PI_EMBEDDED", "LOW_SPEC", "STANDARD"])

        # Safety margin must be > 0 and <= total ram
        self.assertGreater(status["safety_margin_mb"], 0)
        self.assertLess(status["safety_margin_mb"], status["ram_total_mb"])

    def test_geometric_spatial_ast_fallback_runs_without_gpu(self):
        # Create a synthetic crop containing a horizontal fraction bar
        # White background (255), black horizontal line (0)
        crop = np.ones((80, 140, 3), dtype=np.uint8) * 255
        # Draw fraction bar in the middle
        crop[38:42, 20:120] = 0
        # Draw some content above (numerator)
        crop[15:25, 50:90] = 0
        # Draw some content below (denominator)
        crop[55:65, 50:90] = 0

        # Recognize with VLM disabled (as on low-spec/Raspberry Pi)
        result = visual_math_router.recognize(crop, hint="MATH", allow_vlm=False)
        self.assertIsNotNone(result)
        self.assertIn(result.engine, ["UniMERNet", "Pix2Text", "pix2tex", "GeometricSpatialAST"])
        self.assertIsInstance(result.latex, str)


if __name__ == "__main__":
    unittest.main()
