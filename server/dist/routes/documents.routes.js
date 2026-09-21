"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.resolve(config_1.config.DATA_DIR, "uploads");
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${path_1.default.basename(file.originalname, ext)}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});
router.use(auth_1.authenticateJwt);
// Upload document & compute SHA-256 duplicate detection
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }
        const filepath = req.file.path;
        const fileBuffer = fs_1.default.readFileSync(filepath);
        const sha256 = crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex");
        // Check duplicate
        const existingDoc = await prisma_1.prisma.document.findUnique({ where: { sha256 } });
        if (existingDoc) {
            // Remove newly uploaded duplicate file to save disk space
            fs_1.default.unlinkSync(filepath);
            res.status(200).json({
                isDuplicate: true,
                message: "Duplicate file detected with matching SHA-256 hash.",
                document: existingDoc,
            });
            return;
        }
        // Call AI Service to validate and detect digital text
        let pageCount = 1;
        let isDigital = false;
        let finalFilePath = filepath;
        try {
            const formData = new URLSearchParams();
            formData.append("doc_path", filepath);
            const validateRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/documents/validate`, formData.toString(), {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
            if (validateRes.data?.data) {
                pageCount = validateRes.data.data.page_count || 1;
                isDigital = validateRes.data.data.is_digital || false;
                if (validateRes.data.data.converted_pdf_path && fs_1.default.existsSync(validateRes.data.data.converted_pdf_path)) {
                    finalFilePath = validateRes.data.data.converted_pdf_path;
                }
            }
        }
        catch (e) {
            console.warn("AI validation service warning:", e.message);
        }
        const doc = await prisma_1.prisma.document.create({
            data: {
                filename: req.file.originalname,
                filepath: finalFilePath,
                sha256,
                fileSizeBytes: req.file.size,
                pageCount,
                isDigital,
                status: "UPLOADED",
                profile: req.body.profile || "BALANCED",
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "UPLOAD_DOCUMENT", "DOCUMENT", doc.id, {
            filename: doc.filename,
            sha256: doc.sha256,
            converted: finalFilePath !== filepath,
        });
        res.status(201).json({ isDuplicate: false, document: doc });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Detect language of text
router.post("/detect-language", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            res.status(400).json({ error: "Text is required for language detection" });
            return;
        }
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/languages/detect`, { text });
        res.json(aiRes.data?.data || aiRes.data);
    }
    catch (err) {
        console.error("Language detection error:", err);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Translate text with formula/option preservation
router.post("/translate", async (req, res) => {
    try {
        const { text, target_lang, source_lang } = req.body;
        if (!text || !text.trim()) {
            res.status(400).json({ error: "Text is required for translation" });
            return;
        }
        if (!target_lang) {
            res.status(400).json({ error: "Target language is required" });
            return;
        }
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/languages/translate`, {
            text,
            target_lang,
            source_lang: source_lang || "auto",
        });
        res.json(aiRes.data?.data || aiRes.data);
    }
    catch (err) {
        console.error("Translation error:", err);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Extract digital text from image document in same language
router.post("/ocr-image", upload.single("image"), async (req, res) => {
    try {
        const imagePath = req.file ? req.file.path : req.body.image_path;
        if (!imagePath || !fs_1.default.existsSync(imagePath)) {
            res.status(400).json({ error: "Image file or valid image_path is required for OCR extraction" });
            return;
        }
        const formData = new URLSearchParams();
        formData.append("image_path", imagePath);
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/documents/ocr-image`, formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        res.json(aiRes.data?.data || aiRes.data);
    }
    catch (err) {
        console.error("Image OCR extraction error:", err);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Ingest document directly from pasted raw text with 100% verbatim source preservation
router.post("/paste-text", async (req, res) => {
    try {
        const { title, rawText, profile } = req.body;
        if (!rawText || !rawText.trim()) {
            res.status(400).json({ error: "Pasted text cannot be empty" });
            return;
        }
        const docTitle = (title && title.trim()) || `Pasted_Document_${new Date().toISOString().slice(0, 10)}`;
        const chosenProfile = profile || "BALANCED";
        // Call Python AI Service to generate high-fidelity PDF from verbatim text
        const genRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/documents/from-text`, {
            title: docTitle,
            raw_text: rawText,
            profile: chosenProfile,
        });
        const genData = genRes.data;
        const sha256 = genData.sha256;
        // Check duplicate
        const existingDoc = await prisma_1.prisma.document.findUnique({ where: { sha256 } });
        if (existingDoc) {
            res.status(200).json({
                isDuplicate: true,
                message: "Duplicate document content detected with matching SHA-256 hash.",
                document: existingDoc,
            });
            return;
        }
        const doc = await prisma_1.prisma.document.create({
            data: {
                filename: genData.filename,
                filepath: genData.doc_path,
                sha256: genData.sha256,
                fileSizeBytes: genData.file_size_bytes,
                pageCount: genData.page_count,
                isDigital: true,
                status: "UPLOADED",
                profile: chosenProfile,
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "INGEST_PASTED_TEXT", "DOCUMENT", doc.id, {
            filename: doc.filename,
            sha256: doc.sha256,
            charCount: rawText.length,
            pageCount: doc.pageCount,
        });
        res.status(201).json({ isDuplicate: false, document: doc });
    }
    catch (err) {
        console.error("POST /documents/paste-text error:", err);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// List documents
router.get("/", async (req, res) => {
    try {
        const docs = await prisma_1.prisma.document.findMany({
            include: {
                pages: {
                    select: { id: true, pageNumber: true, imageUrl: true, confidence: true, needsReview: true, status: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ documents: docs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get single document with pages and regions
router.get("/:id", async (req, res) => {
    try {
        const doc = await prisma_1.prisma.document.findUnique({
            where: { id: req.params.id },
            include: {
                pages: {
                    include: { regions: true },
                    orderBy: { pageNumber: "asc" },
                },
            },
        });
        if (!doc) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        res.json({ document: doc });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Trigger sequential page processing for a document
router.post("/:id/process-page/:pageNum", async (req, res) => {
    try {
        const { id, pageNum } = req.params;
        const pageNumber = parseInt(pageNum, 10);
        const doc = await prisma_1.prisma.document.findUnique({ where: { id } });
        if (!doc) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        // Call AI Service sequentially
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/documents/process-page`, {
            doc_path: doc.filepath,
            doc_id: doc.id,
            page_number: pageNumber,
            profile: doc.profile || "BALANCED",
        });
        const pageData = aiRes.data;
        // Persist DocumentPage in DB
        const page = await prisma_1.prisma.documentPage.upsert({
            where: {
                documentId_pageNumber: { documentId: doc.id, pageNumber },
            },
            update: {
                imageUrl: pageData.page_image,
                width: pageData.width,
                height: pageData.height,
                confidence: pageData.overall_confidence,
                needsReview: pageData.needs_review,
                status: "COMPLETED",
            },
            create: {
                documentId: doc.id,
                pageNumber,
                imageUrl: pageData.page_image,
                width: pageData.width,
                height: pageData.height,
                confidence: pageData.overall_confidence,
                needsReview: pageData.needs_review,
                status: "COMPLETED",
            },
        });
        // Clear old regions and insert new regions
        await prisma_1.prisma.pageRegion.deleteMany({ where: { pageId: page.id } });
        for (const r of pageData.regions || []) {
            await prisma_1.prisma.pageRegion.create({
                data: {
                    pageId: page.id,
                    regionType: r.type,
                    bboxJson: JSON.stringify(r.bbox),
                    rawText: r.raw_text || r.text,
                    processedText: r.text,
                    confidence: r.confidence,
                    readingOrder: r.reading_order || 1,
                    source: r.source || "AI_ENGINE",
                    specializedJson: JSON.stringify(r.specialized_data || {}),
                },
            });
        }
        await prisma_1.prisma.document.update({
            where: { id: doc.id },
            data: { status: "PROCESSING" },
        });
        res.json({ page, extracted: pageData });
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Delete document and associated pages/regions
router.delete("/:id", async (req, res) => {
    try {
        const doc = await prisma_1.prisma.document.findUnique({ where: { id: req.params.id } });
        if (!doc) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        // Attempt to delete physical uploaded file from disk if present
        if (doc.filepath && fs_1.default.existsSync(doc.filepath)) {
            try {
                fs_1.default.unlinkSync(doc.filepath);
            }
            catch (e) {
                console.warn("Could not remove physical uploaded file:", e.message);
            }
        }
        await prisma_1.prisma.document.delete({ where: { id: req.params.id } });
        await (0, audit_1.logAuditAction)(req.user.id, "DELETE_DOCUMENT", "DOCUMENT", doc.id, {
            filename: doc.filename,
        });
        res.json({ success: true, message: `Document "${doc.filename}" deleted successfully` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Export Digital / Extracted / Translated Text to Word (.doc), PDF (.pdf), JSON (.json), or TXT (.txt)
router.post("/export-text", async (req, res) => {
    try {
        const { text, title, format, language, metadata } = req.body;
        if (!text) {
            res.status(400).json({ error: "Text content is required for export" });
            return;
        }
        const docTitle = title || "Document_Text";
        const safeTitle = docTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
        const fmt = (format || "txt").toLowerCase();
        if (fmt === "word" || fmt === "doc" || fmt === "docx") {
            const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${docTitle}</title>
          <style>
            body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 0.8in; }
            h1 { font-size: 16pt; color: #1a365d; border-bottom: 1.5pt solid #2b6cb0; padding-bottom: 4pt; }
            .meta { font-size: 9.5pt; color: #718096; margin-bottom: 14pt; }
            .content { white-space: pre-wrap; font-size: 10.5pt; }
          </style>
        </head>
        <body>
          <h1>${docTitle}</h1>
          <div class="meta">
            ${language ? `<strong>Language:</strong> ${language} &bull; ` : ""}
            <strong>Exported:</strong> ${new Date().toLocaleString()}
          </div>
          <div class="content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</div>
        </body>
        </html>
      `;
            res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.doc"`);
            res.setHeader("Content-Type", "application/msword; charset=utf-8");
            res.send(htmlContent);
            return;
        }
        if (fmt === "pdf") {
            const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/export/text-pdf`, {
                title: docTitle,
                text,
                meta: { language, ...(metadata || {}) },
            }, { responseType: "stream" });
            res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
            res.setHeader("Content-Type", "application/pdf");
            aiRes.data.pipe(res);
            return;
        }
        if (fmt === "json") {
            const jsonData = {
                schemaVersion: "2.0",
                source: "PaperGenerator Offline Document Intelligence",
                title: docTitle,
                language: language || "auto",
                exportedAt: new Date().toISOString(),
                metadata: metadata || {},
                linesCount: text.split("\n").length,
                characterCount: text.length,
                text,
                paragraphs: text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
            };
            res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.json"`);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.send(JSON.stringify(jsonData, null, 2));
            return;
        }
        // Default TXT
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.txt"`);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(text);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Extract raw text from Word (.docx), PDF (.pdf), or text files for translation / editing
router.post("/extract-raw-text", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file provided" });
            return;
        }
        const filepath = req.file.path;
        const ext = path_1.default.extname(req.file.originalname).toLowerCase();
        let text = "";
        if (ext === ".txt" || ext === ".json") {
            text = fs_1.default.readFileSync(filepath, "utf-8");
        }
        else {
            const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/import/extract-raw-text`, {
                file_path: filepath,
            });
            text = aiRes.data.text || "";
        }
        try {
            if (fs_1.default.existsSync(filepath))
                fs_1.default.unlinkSync(filepath);
        }
        catch { }
        res.json({ text, filename: req.file.originalname, length: text.length });
    }
    catch (err) {
        console.error("POST /documents/extract-raw-text error:", err);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
exports.default = router;
