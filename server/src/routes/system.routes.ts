import { Router, Request, Response } from "express";
import axios from "axios";
import { config } from "../config";
import { authenticateJwt, requireRole, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";

const router = Router();

router.use(authenticateJwt);

// Get real-time system hardware usage (CPU %, RAM MB, VRAM, active jobs, loaded models)
router.get("/resources", async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/api/resource-status`);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({
      error: "AI Service offline or unreachable",
      details: err.message,
    });
  }
});

// List all installed and configured AI / OCR engine adapters
router.get("/models", async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/api/models`);
    res.json({ models: aiRes.data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manually unload models to release RAM/VRAM immediately
router.post("/models/unload", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/models/unload`);
    await logAuditAction(req.user!.id, "UNLOAD_MODELS", "SYSTEM", null, { action: "MANUAL_MEMORY_RELEASE" });
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
