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

// Toggle an individual engine adapter enabled/disabled
router.post("/models/:engineName/toggle", async (req: AuthRequest, res: Response) => {
  try {
    const { engineName } = req.params;
    const aiRes = await axios.post(
      `${config.AI_SERVICE_URL}/api/models/${encodeURIComponent(engineName)}/toggle`,
      req.body
    );
    await logAuditAction(req.user!.id, "TOGGLE_ENGINE", "SYSTEM", null, {
      engine: engineName,
      is_enabled: aiRes.data.is_enabled,
    });
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restart an individual engine adapter
router.post("/models/:engineName/restart", async (req: AuthRequest, res: Response) => {
  try {
    const { engineName } = req.params;
    const aiRes = await axios.post(
      `${config.AI_SERVICE_URL}/api/models/${encodeURIComponent(engineName)}/restart`
    );
    await logAuditAction(req.user!.id, "RESTART_ENGINE", "SYSTEM", null, {
      engine: engineName,
    });
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restart all engine adapters
router.post("/models/restart-all", async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/models/restart-all`);
    await logAuditAction(req.user!.id, "RESTART_ALL_ENGINES", "SYSTEM", null, {});
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
