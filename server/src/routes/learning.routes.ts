import { Router, Response } from "express";
import axios from "axios";
import { config } from "../config";
import { authenticateJwt, AuthRequest } from "../middleware/auth";

const router = Router();

// Record a correction and learn token/formula rules
router.post("/learn", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { raw_text, corrected_text, image_path, context_domain } = req.body;
    if (!raw_text || !corrected_text) {
      return res.status(400).json({ error: "raw_text and corrected_text are required" });
    }

    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/learning/learn`, {
      raw_text,
      corrected_text,
      image_path,
      context_domain: context_domain || "GENERAL",
    });

    res.json(aiRes.data);
  } catch (err: any) {
    console.error("Learning error:", err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Get learned rules and stats
router.get("/patterns", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/api/learning/patterns`);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Delete a learned rule
router.delete("/patterns/:id", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.delete(`${config.AI_SERVICE_URL}/api/learning/patterns/${req.params.id}`);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

export default router;
