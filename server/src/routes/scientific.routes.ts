import { Router, Request, Response } from "express";
import axios from "axios";
import { prisma } from "../prisma";
import { config } from "../config";
import { authenticateJwt, AuthRequest } from "../middleware/auth";

const router = Router();

// Retrieve 15-category scientific symbol palette
router.get("/symbols", async (req: Request, res: Response) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/api/scientific/symbols`);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Process formula/scientific crop with AST construction, LaTeX, MathML, confidence
router.post("/recognize", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { cropPath, cropBase64, ocrText, mode, pageId, bbox } = req.body;

    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/scientific/recognize`, {
      crop_path: cropPath,
      crop_base64: cropBase64,
      ocr_text: ocrText,
      mode: mode || "AUTO",
    });

    const data = aiRes.data.data;

    // Persist FormulaRegion and FormulaRecognition if pageId or cropPath is provided
    try {
      const region = await prisma.formulaRegion.create({
        data: {
          pageId: pageId || null,
          bboxJson: JSON.stringify(bbox || [0, 0, 0, 0]),
          imageUrl: cropPath || "",
          domain: data.mode || "MATH",
          confidence: data.confidence?.overall_confidence || 0.90,
          recognitions: {
            create: {
              rawText: data.raw_text || "",
              latex: data.latex || "",
              mathml: data.mathml || "",
              structuredExpression: JSON.stringify(data.structured_ast || {}),
              confidence: data.confidence?.overall_confidence || 0.90,
              visualSimilarity: data.confidence?.visual_similarity || 0.85,
              engine: "SCIENTIFIC_SUBSYSTEM",
              validationStatus: data.confidence?.needs_review ? "NEEDS_REVIEW" : "VALIDATED",
            },
          },
        },
        include: { recognitions: true },
      });
      res.json({ status: "SUCCESS", data, regionId: region.id });
    } catch (dbErr) {
      // If DB save has an issue, still return recognized formula data
      res.json({ status: "SUCCESS", data });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Validate candidate LaTeX visually against crop
router.post("/validate", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const { latex, cropPath, cropBase64, mode } = req.body;
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/scientific/validate`, {
      latex,
      crop_path: cropPath,
      crop_base64: cropBase64,
      mode: mode || "MATH",
    });
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Get administrator settings for mathematical recognition
router.get("/settings", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.get(`${config.AI_SERVICE_URL}/api/scientific/settings`);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Update administrator settings for mathematical recognition
router.put("/settings", authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const aiRes = await axios.put(`${config.AI_SERVICE_URL}/api/scientific/settings`, req.body);
    res.json(aiRes.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

export default router;
