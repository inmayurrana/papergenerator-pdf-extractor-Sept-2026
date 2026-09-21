import { Router, Request, Response } from "express";
import axios from "axios";
import { prisma } from "../prisma";
import { config } from "../config";
import { authenticateJwt, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";

const router = Router();

router.use(authenticateJwt);

// Create a visual snippet crop & run targeted recognition
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { pageImagePath, bbox, mode, documentId, pageNumber, questionId } = req.body;

    if (!pageImagePath || !bbox || !Array.isArray(bbox) || bbox.length !== 4) {
      res.status(400).json({ error: "pageImagePath and bbox [x, y, w, h] are required" });
      return;
    }

    // Call AI Service localized snipping engine
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/snip/process`, {
      page_image_path: pageImagePath,
      bbox,
      mode: mode || "AUTO",
    });

    const snipData = aiRes.data.data;

    const snip = await prisma.visualSnip.create({
      data: {
        documentId: documentId || null,
        questionId: questionId || null,
        pageNumber: pageNumber || 1,
        bboxJson: JSON.stringify(bbox),
        imageUrl: snipData.relative_url,
        extractedText: snipData.extracted_text || "",
        mode: mode || "AUTO",
      },
    });

    await logAuditAction(req.user!.id, "CREATE_SNIP", "SNIP", snip.id, {
      imageUrl: snip.imageUrl,
      mode: snip.mode,
    });

    res.status(201).json({ snip, aiData: snipData });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// List snips
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.query;
    const where: any = {};
    if (documentId) where.documentId = documentId as string;

    const snips = await prisma.visualSnip.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ snips });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
