"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJwt);
// Create a visual snippet crop & run targeted recognition
router.post("/", async (req, res) => {
    try {
        const { pageImagePath, bbox, mode, documentId, pageNumber, questionId } = req.body;
        if (!pageImagePath || !bbox || !Array.isArray(bbox) || bbox.length !== 4) {
            res.status(400).json({ error: "pageImagePath and bbox [x, y, w, h] are required" });
            return;
        }
        // Call AI Service localized snipping engine
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/snip/process`, {
            page_image_path: pageImagePath,
            bbox,
            mode: mode || "AUTO",
        });
        const snipData = aiRes.data.data;
        const snip = await prisma_1.prisma.visualSnip.create({
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
        await (0, audit_1.logAuditAction)(req.user.id, "CREATE_SNIP", "SNIP", snip.id, {
            imageUrl: snip.imageUrl,
            mode: snip.mode,
        });
        res.status(201).json({ snip, aiData: snipData });
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// List snips
router.get("/", async (req, res) => {
    try {
        const { documentId } = req.query;
        const where = {};
        if (documentId)
            where.documentId = documentId;
        const snips = await prisma_1.prisma.visualSnip.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        res.json({ snips });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
