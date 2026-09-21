"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const router = (0, express_1.Router)();
const imageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.resolve(config_1.config.DATA_DIR, "diagrams");
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `img-${uniqueSuffix}${ext}`);
    },
});
const uploadImage = (0, multer_1.default)({
    storage: imageStorage,
    limits: { fileSize: 20 * 1024 * 1024 },
});
const docUploadStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.resolve(config_1.config.DATA_DIR, "uploads");
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `import-${uniqueSuffix}${ext}`);
    },
});
const uploadDoc = (0, multer_1.default)({
    storage: docUploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
});
// Helper to convert any image path or URL to offline Base64 Data URI for Word Embedding
function resolveImageToBase64(imgUrl) {
    if (!imgUrl || typeof imgUrl !== "string")
        return null;
    if (imgUrl.startsWith("data:image/"))
        return imgUrl;
    try {
        let cleanPath = imgUrl.replace(/^[/\\]+/, "");
        if (cleanPath.startsWith("api/"))
            cleanPath = cleanPath.substring(4);
        if (cleanPath.startsWith("data/"))
            cleanPath = cleanPath.substring(5);
        const candidates = [
            path_1.default.resolve(config_1.config.DATA_DIR, cleanPath),
            path_1.default.resolve(config_1.config.DATA_DIR, "diagrams", path_1.default.basename(cleanPath)),
            path_1.default.resolve(config_1.config.DATA_DIR, "uploads", path_1.default.basename(cleanPath)),
            path_1.default.resolve(process.cwd(), "data", cleanPath),
            path_1.default.resolve(process.cwd(), "data", "diagrams", path_1.default.basename(cleanPath)),
            path_1.default.resolve(process.cwd(), "data", "uploads", path_1.default.basename(cleanPath)),
            path_1.default.resolve(process.cwd(), "..", "data", cleanPath),
            path_1.default.resolve(process.cwd(), "..", "data", "diagrams", path_1.default.basename(cleanPath)),
            path_1.default.resolve(process.cwd(), "..", "data", "uploads", path_1.default.basename(cleanPath)),
            path_1.default.resolve("D:/Recovered_school_app/PAPERGENERATOR/data", cleanPath),
            path_1.default.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/diagrams", path_1.default.basename(cleanPath)),
            path_1.default.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/uploads", path_1.default.basename(cleanPath)),
        ];
        for (const cand of candidates) {
            if (fs_1.default.existsSync(cand) && fs_1.default.statSync(cand).isFile()) {
                const ext = path_1.default.extname(cand).toLowerCase().replace(".", "");
                const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/png";
                const buf = fs_1.default.readFileSync(cand);
                return `data:${mime};base64,${buf.toString("base64")}`;
            }
        }
    }
    catch (e) {
        // Ignore resolution errors
    }
    return imgUrl;
}
router.use(auth_1.authenticateJwt);
// Upload question/option image asset
router.post("/questions/upload-image", uploadImage.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No image file uploaded" });
            return;
        }
        const relativeUrl = `/data/diagrams/${req.file.filename}`;
        res.json({ url: relativeUrl, filename: req.file.filename });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- FOLDERS (Taxonomy: Class -> Subject -> Chapter -> Topic) ---
router.get("/folders", async (req, res) => {
    try {
        const folders = await prisma_1.prisma.folder.findMany({
            include: {
                children: {
                    include: {
                        children: {
                            include: {
                                children: true,
                            },
                        },
                    },
                },
                _count: { select: { questions: true } },
            },
            where: { parentId: null }, // Root classes
            orderBy: { name: "asc" },
        });
        res.json({ folders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/folders", async (req, res) => {
    try {
        const { name, type, parentId } = req.body;
        if (!name || !type) {
            res.status(400).json({ error: "Folder name and type (CLASS, SUBJECT, CHAPTER, TOPIC) are required" });
            return;
        }
        const folder = await prisma_1.prisma.folder.create({
            data: { name, type, parentId: parentId || null },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "CREATE_FOLDER", "FOLDER", folder.id, { name, type, parentId });
        res.status(201).json({ folder });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/folders/:id", async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const folder = await prisma_1.prisma.folder.update({
            where: { id: req.params.id },
            data: {
                name: name !== undefined ? name : undefined,
                parentId: parentId !== undefined ? parentId : undefined,
            },
        });
        res.json({ folder });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete("/folders/:id", async (req, res) => {
    try {
        await prisma_1.prisma.folder.delete({ where: { id: req.params.id } });
        await (0, audit_1.logAuditAction)(req.user.id, "DELETE_FOLDER", "FOLDER", req.params.id);
        res.json({ message: "Folder and its subfolders deleted" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- QUESTIONS ---
// Check duplicates across the entire Question Bank with Multi-Modal (Text + Options + Diagrams) Matching
router.get("/questions/check-duplicates", async (req, res) => {
    try {
        const questions = await prisma_1.prisma.question.findMany({
            include: {
                folder: { select: { id: true, name: true, type: true } },
            },
            orderBy: { createdAt: "asc" }, // Canonical is the older original creation
        });
        const normalize = (t) => (t || "")
            .toLowerCase()
            .replace(/^(?:q(?:uestion)?[\s\.]*\d+|\d+[\.\)]|q\.?\d+)\s*/i, "")
            .replace(/[^a-z0-9]/g, "");
        const getOptionsNorm = (q) => {
            try {
                const opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [];
                return opts
                    .map((o) => normalize(o.text || "") + (o.imageUrl ? `@img:${o.imageUrl}` : ""))
                    .filter(Boolean)
                    .join("###");
            }
            catch {
                return "";
            }
        };
        const getDiagramsNorm = (q) => {
            try {
                const diags = typeof q.diagramsJson === "string" ? JSON.parse(q.diagramsJson) : q.diagrams || [];
                return diags
                    .map((d) => (d.relative_url || "").trim())
                    .filter(Boolean)
                    .sort()
                    .join("###");
            }
            catch {
                return "";
            }
        };
        const duplicateGroups = [];
        const processedIds = new Set();
        for (let i = 0; i < questions.length; i++) {
            const qA = questions[i];
            if (processedIds.has(qA.id))
                continue;
            const normA = normalize(qA.questionText);
            const optsA = getOptionsNorm(qA);
            const diagsA = getDiagramsNorm(qA);
            const currentDups = [];
            for (let j = i + 1; j < questions.length; j++) {
                const qB = questions[j];
                if (processedIds.has(qB.id))
                    continue;
                const normB = normalize(qB.questionText);
                const optsB = getOptionsNorm(qB);
                const diagsB = getDiagramsNorm(qB);
                // 1. Exact Question Text Match
                if (normA && normB && normA.length >= 6 && normA === normB) {
                    currentDups.push({
                        question: qB,
                        similarity: 100,
                        reason: "100% Exact Text & Formula Match",
                    });
                    processedIds.add(qB.id);
                }
                // 2. Exact Options Match (Handles image questions or empty text)
                else if (optsA && optsB && optsA.length >= 10 && optsA === optsB) {
                    currentDups.push({
                        question: qB,
                        similarity: 100,
                        reason: "100% Exact MCQ Options Match",
                    });
                    processedIds.add(qB.id);
                }
                // 3. Exact Diagram Image URL Match
                else if (diagsA && diagsB && diagsA.length >= 5 && diagsA === diagsB) {
                    currentDups.push({
                        question: qB,
                        similarity: 100,
                        reason: "100% Exact Diagram & Snippet Match",
                    });
                    processedIds.add(qB.id);
                }
                // 4. Near-Identical Text Match
                else if (normA &&
                    normB &&
                    normA.length >= 20 &&
                    normB.length >= 20 &&
                    (normA.includes(normB) || normB.includes(normA))) {
                    currentDups.push({
                        question: qB,
                        similarity: 90,
                        reason: "Near-Identical Substring / Formatting Match",
                    });
                    processedIds.add(qB.id);
                }
            }
            if (currentDups.length > 0) {
                processedIds.add(qA.id);
                duplicateGroups.push({
                    canonical: qA,
                    duplicates: currentDups,
                });
            }
        }
        const totalDuplicateCount = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
        res.json({
            duplicateGroups,
            totalDuplicateCount,
            totalQuestionsScanned: questions.length,
        });
    }
    catch (err) {
        console.error("Duplicate check error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Batch Clean All Duplicates in Question Bank (Keeps Canonical Originals)
router.post("/questions/delete-all-duplicates", async (req, res) => {
    try {
        const questions = await prisma_1.prisma.question.findMany({
            orderBy: { createdAt: "asc" },
        });
        const normalize = (t) => (t || "")
            .toLowerCase()
            .replace(/^(?:q(?:uestion)?[\s\.]*\d+|\d+[\.\)]|q\.?\d+)\s*/i, "")
            .replace(/[^a-z0-9]/g, "");
        const getOptionsNorm = (q) => {
            try {
                const opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [];
                return opts
                    .map((o) => normalize(o.text || "") + (o.imageUrl ? `@img:${o.imageUrl}` : ""))
                    .filter(Boolean)
                    .join("###");
            }
            catch {
                return "";
            }
        };
        const getDiagramsNorm = (q) => {
            try {
                const diags = typeof q.diagramsJson === "string" ? JSON.parse(q.diagramsJson) : q.diagrams || [];
                return diags
                    .map((d) => (d.relative_url || "").trim())
                    .filter(Boolean)
                    .sort()
                    .join("###");
            }
            catch {
                return "";
            }
        };
        const duplicateIdsToDelete = [];
        const processedIds = new Set();
        for (let i = 0; i < questions.length; i++) {
            const qA = questions[i];
            if (processedIds.has(qA.id))
                continue;
            const normA = normalize(qA.questionText);
            const optsA = getOptionsNorm(qA);
            const diagsA = getDiagramsNorm(qA);
            for (let j = i + 1; j < questions.length; j++) {
                const qB = questions[j];
                if (processedIds.has(qB.id))
                    continue;
                const normB = normalize(qB.questionText);
                const optsB = getOptionsNorm(qB);
                const diagsB = getDiagramsNorm(qB);
                const isExactText = normA && normB && normA.length >= 6 && normA === normB;
                const isExactOpts = optsA && optsB && optsA.length >= 10 && optsA === optsB;
                const isExactDiags = diagsA && diagsB && diagsA.length >= 5 && diagsA === diagsB;
                const isNearText = normA &&
                    normB &&
                    normA.length >= 20 &&
                    normB.length >= 20 &&
                    (normA.includes(normB) || normB.includes(normA));
                if (isExactText || isExactOpts || isExactDiags || isNearText) {
                    duplicateIdsToDelete.push(qB.id);
                    processedIds.add(qB.id);
                }
            }
            processedIds.add(qA.id);
        }
        if (duplicateIdsToDelete.length > 0) {
            await prisma_1.prisma.question.deleteMany({
                where: { id: { in: duplicateIdsToDelete } },
            });
        }
        res.json({
            status: "SUCCESS",
            deletedCount: duplicateIdsToDelete.length,
            deletedIds: duplicateIdsToDelete,
        });
    }
    catch (err) {
        console.error("Batch delete duplicates error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Get questions (Filtered by folder, search, tags, ACL)
router.get("/questions", async (req, res) => {
    try {
        const { folderId, search, difficulty } = req.query;
        const user = req.user;
        const whereClause = {};
        if (folderId)
            whereClause.folderId = folderId;
        if (difficulty)
            whereClause.difficulty = difficulty;
        if (search) {
            whereClause.questionText = { contains: search };
        }
        // ACL / Restricted check: Non-admins cannot see restricted questions unless explicitly permitted
        if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
            whereClause.OR = [
                { isRestricted: false },
                { creatorId: user.id },
            ];
        }
        const questions = await prisma_1.prisma.question.findMany({
            where: whereClause,
            include: {
                folder: { select: { id: true, name: true, type: true } },
                creator: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ questions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create question
router.post("/questions", async (req, res) => {
    try {
        const body = req.body;
        const qText = body.questionText || body.question_text || "";
        const qNum = String(body.questionNumber || body.question_number || "1");
        const q = await prisma_1.prisma.question.create({
            data: {
                folderId: body.folderId || null,
                creatorId: req.user.id,
                questionNumber: qNum,
                questionText: qText,
                subquestionsJson: JSON.stringify(body.subquestions || []),
                optionsJson: JSON.stringify(body.options || []),
                correctAnswer: body.correctAnswer || body.correct_answer || "",
                explanation: body.explanation || "",
                marks: body.marks !== undefined ? parseInt(body.marks, 10) : 1,
                negativeMarks: body.negativeMarks !== undefined
                    ? parseFloat(body.negativeMarks)
                    : body.negative_marks !== undefined
                        ? parseFloat(body.negative_marks)
                        : 0.0,
                difficulty: body.difficulty || "MEDIUM",
                tagsJson: JSON.stringify(body.tags || []),
                formulasJson: JSON.stringify(body.formulas || []),
                diagramsJson: JSON.stringify(body.diagrams || []),
                isRestricted: Boolean(body.isRestricted),
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "CREATE_QUESTION", "QUESTION", q.id, {
            questionText: (q.questionText || "").substring(0, 80),
            marks: q.marks,
        });
        res.status(201).json({ question: q });
    }
    catch (err) {
        console.error("POST /questions Error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Batch create / import questions (e.g. from Pasted Text) with 100% verbatim fidelity
router.post("/questions/batch", async (req, res) => {
    try {
        const { folderId, questions } = req.body;
        if (!Array.isArray(questions) || questions.length === 0) {
            res.status(400).json({ error: "Questions array is required and cannot be empty" });
            return;
        }
        const createdQuestions = await prisma_1.prisma.$transaction(questions.map((q, idx) => {
            const qText = q.questionText || q.question_text || "";
            const qNum = String(q.questionNumber || q.question_number || idx + 1);
            return prisma_1.prisma.question.create({
                data: {
                    folderId: folderId || q.folderId || null,
                    creatorId: req.user.id,
                    questionNumber: qNum,
                    questionText: qText,
                    subquestionsJson: JSON.stringify(q.subquestions || []),
                    optionsJson: JSON.stringify(q.options || []),
                    correctAnswer: q.correctAnswer || q.correct_answer || "",
                    explanation: q.explanation || "",
                    marks: q.marks !== undefined ? parseInt(q.marks, 10) : 1,
                    negativeMarks: q.negativeMarks !== undefined
                        ? parseFloat(q.negativeMarks)
                        : q.negative_marks !== undefined
                            ? parseFloat(q.negative_marks)
                            : 0.0,
                    difficulty: q.difficulty || "MEDIUM",
                    tagsJson: JSON.stringify(q.tags || []),
                    formulasJson: JSON.stringify(q.formulas || []),
                    diagramsJson: JSON.stringify(q.diagrams || []),
                    isRestricted: Boolean(q.isRestricted),
                },
            });
        }));
        await (0, audit_1.logAuditAction)(req.user.id, "BATCH_IMPORT_QUESTIONS", "QUESTION", "BATCH", {
            count: createdQuestions.length,
            folderId: folderId || null,
        });
        res.status(201).json({
            message: `Successfully imported ${createdQuestions.length} questions verbatim.`,
            count: createdQuestions.length,
            questions: createdQuestions,
        });
    }
    catch (err) {
        console.error("POST /questions/batch Error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Update question
router.put("/questions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const data = {};
        if (body.folderId !== undefined)
            data.folderId = body.folderId || null;
        if (body.questionNumber !== undefined || body.question_number !== undefined) {
            data.questionNumber = String(body.questionNumber || body.question_number);
        }
        if (body.questionText !== undefined || body.question_text !== undefined) {
            data.questionText = body.questionText || body.question_text || "";
        }
        if (body.correctAnswer !== undefined || body.correct_answer !== undefined) {
            data.correctAnswer = body.correctAnswer || body.correct_answer || "";
        }
        if (body.explanation !== undefined)
            data.explanation = body.explanation || "";
        if (body.marks !== undefined)
            data.marks = parseInt(body.marks, 10) || 1;
        if (body.negativeMarks !== undefined || body.negative_marks !== undefined) {
            data.negativeMarks = parseFloat(body.negativeMarks ?? body.negative_marks) || 0.0;
        }
        if (body.difficulty !== undefined)
            data.difficulty = body.difficulty;
        if (body.isRestricted !== undefined)
            data.isRestricted = Boolean(body.isRestricted);
        if (body.isApproved !== undefined)
            data.isApproved = Boolean(body.isApproved);
        if (body.subquestions !== undefined)
            data.subquestionsJson = JSON.stringify(body.subquestions || []);
        if (body.options !== undefined)
            data.optionsJson = JSON.stringify(body.options || []);
        if (body.tags !== undefined)
            data.tagsJson = JSON.stringify(body.tags || []);
        if (body.formulas !== undefined)
            data.formulasJson = JSON.stringify(body.formulas || []);
        if (body.diagrams !== undefined)
            data.diagramsJson = JSON.stringify(body.diagrams || []);
        const q = await prisma_1.prisma.question.update({
            where: { id },
            data,
        });
        await (0, audit_1.logAuditAction)(req.user.id, "UPDATE_QUESTION", "QUESTION", id, {
            questionNumber: q.questionNumber,
        });
        res.json({ question: q });
    }
    catch (err) {
        console.error("PUT /questions/:id Error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Delete question
router.delete("/questions/:id", async (req, res) => {
    try {
        await prisma_1.prisma.question.delete({ where: { id: req.params.id } });
        await (0, audit_1.logAuditAction)(req.user.id, "DELETE_QUESTION", "QUESTION", req.params.id);
        res.json({ message: "Question deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Duplicate Question Detection (Preserves security: does not leak restricted questions)
router.post("/questions/check-duplicate", async (req, res) => {
    try {
        const { questionText } = req.body;
        if (!questionText) {
            res.json({ duplicates: [] });
            return;
        }
        const cleanInput = questionText.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
        const inputWords = new Set(cleanInput.split(/\s+/).filter(Boolean));
        const allQuestions = await prisma_1.prisma.question.findMany({
            select: {
                id: true,
                questionText: true,
                isRestricted: true,
                creatorId: true,
                marks: true,
            },
        });
        const user = req.user;
        const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
        const matches = [];
        for (const q of allQuestions) {
            const qWords = new Set(q.questionText.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().split(/\s+/).filter(Boolean));
            // Jaccard similarity
            const intersection = new Set([...inputWords].filter((x) => qWords.has(x)));
            const union = new Set([...inputWords, ...qWords]);
            const similarity = union.size > 0 ? intersection.size / union.size : 0;
            if (similarity >= 0.70) {
                const canView = isAdmin || !q.isRestricted || q.creatorId === user.id;
                if (canView) {
                    matches.push({
                        id: q.id,
                        questionText: q.questionText,
                        similarity: Math.round(similarity * 100),
                        isRestricted: q.isRestricted,
                    });
                }
                else {
                    matches.push({
                        id: q.id,
                        questionText: "Possible duplicate detected, but you do not have permission to view it.",
                        similarity: Math.round(similarity * 100),
                        isRestricted: true,
                        masked: true,
                    });
                }
            }
        }
        res.json({ duplicates: matches });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Export Questions to JSON (Standard Universal Format v2.0 for Cross-App Interoperability)
router.get("/questions/export/json", async (req, res) => {
    try {
        const { folderId } = req.query;
        const where = {};
        if (folderId)
            where.folderId = folderId;
        const [questions, folder] = await Promise.all([
            prisma_1.prisma.question.findMany({
                where,
                include: { folder: true },
                orderBy: { createdAt: "asc" },
            }),
            folderId ? prisma_1.prisma.folder.findUnique({ where: { id: folderId } }) : null,
        ]);
        const exportData = {
            schemaVersion: "2.0",
            source: "PaperGenerator Offline Examination Platform",
            exportedAt: new Date().toISOString(),
            folder: folder ? { id: folder.id, name: folder.name, type: folder.type } : null,
            totalQuestions: questions.length,
            questions: questions.map((q) => ({
                id: q.id,
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                options: JSON.parse(q.optionsJson || "[]"),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
                negativeMarks: q.negativeMarks,
                difficulty: q.difficulty,
                folder: q.folder ? { id: q.folder.id, name: q.folder.name, type: q.folder.type } : null,
                diagrams: JSON.parse(q.diagramsJson || "[]"),
                tags: JSON.parse(q.tagsJson || "[]"),
                formulas: JSON.parse(q.formulasJson || "[]"),
            })),
        };
        const safeTitle = (folder?.name || "question_bank").replace(/[^a-zA-Z0-9_-]/g, "_");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_export.json"`);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.send(JSON.stringify(exportData, null, 2));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Export Questions & Answers to Microsoft Word (.doc) with complete Solutions & Option diagrams
router.get("/questions/export/word", async (req, res) => {
    try {
        const { folderId } = req.query;
        const where = {};
        if (folderId)
            where.folderId = folderId;
        const [questions, folder] = await Promise.all([
            prisma_1.prisma.question.findMany({
                where,
                include: { folder: true },
                orderBy: { createdAt: "asc" },
            }),
            folderId ? prisma_1.prisma.folder.findUnique({ where: { id: folderId } }) : null,
        ]);
        const folderTitle = folder ? `${folder.name} (${folder.type})` : "Universal Question Bank";
        const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${folderTitle} - Questions & Answers</title>
        <style>
          body { font-family: 'Calibri', 'Times New Roman', 'Arial', sans-serif; font-size: 11pt; line-height: 1.35; color: #000; margin: 0.8in; }
          .main-title { font-size: 18pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 4pt; color: #1a365d; }
          .sub-title { font-size: 12pt; text-align: center; font-weight: bold; color: #4a5568; margin-bottom: 8pt; }
          .meta-box { border: 1pt solid #cbd5e0; background: #f7fafc; padding: 6pt 10pt; font-size: 9.5pt; margin-bottom: 14pt; }
          .sec-header { font-size: 13pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5pt solid #2b6cb0; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 10pt; color: #2b6cb0; }
          .question-block { margin-bottom: 12pt; page-break-inside: avoid; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 8pt; }
          .q-stem { font-weight: 500; font-size: 11pt; margin-bottom: 4pt; }
          .q-marks { float: right; font-weight: bold; font-family: monospace; color: #2d3748; }
          .diagram-img { max-height: 180pt; max-width: 450pt; width: auto; border: 0.5pt solid #cbd5e0; margin: 4pt 0; }
          .options-grid { margin-left: 15pt; margin-top: 4pt; font-size: 10pt; }
          .opt-item { display: inline-block; min-width: 22%; margin-right: 15pt; margin-bottom: 4pt; vertical-align: top; }
          .opt-img { max-height: 40pt; width: auto; display: block; margin-top: 2pt; }
          .sol-block { background: #f0fff4; border-left: 3pt solid #38a169; padding: 6pt 10pt; margin-top: 8pt; margin-bottom: 12pt; }
          .sol-header { font-weight: bold; color: #22543d; font-size: 10pt; margin-bottom: 2pt; }
          .sol-text { font-size: 9.5pt; color: #2d3748; }
          .ans-grid-table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 9.5pt; }
          .ans-grid-table td { border: 1pt solid #cbd5e0; padding: 4pt 8pt; text-align: center; }
          .ans-grid-table th { border: 1pt solid #cbd5e0; background: #ebf8ff; padding: 5pt 8pt; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="main-title">QUESTION BANK &amp; COMPLETE SOLUTIONS</div>
        <div class="sub-title">${folderTitle}</div>
        <div class="meta-box">
          <strong>Taxonomy Folder:</strong> ${folderTitle} &bull; 
          <strong>Total Questions:</strong> ${questions.length} &bull; 
          <strong>Export Date:</strong> ${new Date().toLocaleDateString()}
        </div>

        <div class="sec-header">PART I: EXAMINATION QUESTIONS &amp; OPTIONS</div>
        <div class="questions-container">
          ${questions.map((q, idx) => {
            const opts = JSON.parse(q.optionsJson || "[]");
            const diagrams = JSON.parse(q.diagramsJson || "[]");
            return `
              <div class="question-block">
                <div class="q-stem">
                  <span class="q-marks">[${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
                  <strong>Q${idx + 1}.</strong> ${q.questionText || ''}
                </div>

                ${diagrams.length > 0 ? `
                  <div style="margin: 4pt 0;">
                    ${diagrams.map((d) => {
                const imgUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                const b64 = resolveImageToBase64(imgUrl);
                return b64 ? `<img src="${b64}" class="diagram-img" alt="Diagram" />` : '';
            }).join('')}
                  </div>
                ` : ''}

                ${opts.length > 0 ? `
                  <div class="options-grid">
                    ${opts.map((opt) => {
                const optB64 = resolveImageToBase64(opt.imageUrl);
                return `
                        <span class="opt-item">
                          <strong>(${opt.key})</strong> ${opt.text || ''}
                          ${optB64 ? `<br/><img src="${optB64}" class="opt-img" alt="Option Image" />` : ''}
                        </span>
                      `;
            }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
        }).join('')}
        </div>

        <div style="page-break-before: always;"></div>
        <div class="sec-header" style="color: #276749; border-bottom-color: #276749;">PART II: ANSWER KEY &amp; DETAILED SOLUTIONS</div>

        <table class="ans-grid-table">
          <tr>
            ${questions.slice(0, 10).map((q, idx) => `<th>Q${idx + 1}</th>`).join('')}
          </tr>
          <tr>
            ${questions.slice(0, 10).map((q) => `<td><strong>${q.correctAnswer || '-'}</strong></td>`).join('')}
          </tr>
        </table>

        ${questions.map((q, idx) => `
          <div class="sol-block">
            <div class="sol-header">Q${idx + 1}. Correct Answer: (${q.correctAnswer || 'Not Specified'}) &bull; [${q.marks} Mark${q.marks > 1 ? 's' : ''}]</div>
            <div class="sol-text">${q.explanation ? q.explanation.replace(/\n/g, '<br/>') : 'Full marks awarded for correct answer choice.'}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
        const safeTitle = (folder?.name || "Question_Bank").replace(/[^a-zA-Z0-9_-]/g, "_");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_Questions_and_Answers.doc"`);
        res.setHeader("Content-Type", "application/msword; charset=utf-8");
        res.send(htmlContent);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Export Questions & Answers to PDF (via PyMuPDF AI Engine)
router.get("/questions/export/pdf", async (req, res) => {
    try {
        const { folderId, includeAnswers } = req.query;
        const where = {};
        if (folderId)
            where.folderId = folderId;
        const [questions, folder] = await Promise.all([
            prisma_1.prisma.question.findMany({
                where,
                include: { folder: true },
                orderBy: { createdAt: "asc" },
            }),
            folderId ? prisma_1.prisma.folder.findUnique({ where: { id: folderId } }) : null,
        ]);
        const formatted = questions.map((q) => ({
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            options: JSON.parse(q.optionsJson || "[]"),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            marks: q.marks,
            difficulty: q.difficulty,
        }));
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/export/questions-pdf`, {
            questions: formatted,
            title: folder ? `${folder.name} - Question Bank` : "Question Bank & Answer Solutions",
            folder_name: folder ? `${folder.name} (${folder.type})` : "Universal Question Bank",
            include_answers: includeAnswers !== "false",
        }, { responseType: "stream" });
        const safeTitle = (folder?.name || "Question_Bank").replace(/[^a-zA-Z0-9_-]/g, "_");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_Questions_and_Answers.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        aiRes.data.pipe(res);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Import Questions & Answers from JSON (Direct Payload or JSON File)
router.post("/questions/import/json", async (req, res) => {
    try {
        const { folderId, questions: incomingQuestions } = req.body;
        const rawList = Array.isArray(incomingQuestions)
            ? incomingQuestions
            : Array.isArray(req.body)
                ? req.body
                : incomingQuestions?.questions || [];
        if (!rawList || rawList.length === 0) {
            res.status(400).json({ error: "No questions provided. Send an array of questions or { questions: [...] }" });
            return;
        }
        const createdQuestions = [];
        for (let idx = 0; idx < rawList.length; idx++) {
            const q = rawList[idx];
            const qText = q.questionText || q.question || q.stem || q.text || q.prompt || "";
            if (!qText.trim())
                continue;
            // Normalize options
            let normalizedOpts = [];
            if (Array.isArray(q.options)) {
                normalizedOpts = q.options.map((opt, oIdx) => {
                    if (typeof opt === "string") {
                        const keys = ["A", "B", "C", "D", "E", "F"];
                        return { key: keys[oIdx] || String(oIdx + 1), text: opt };
                    }
                    return {
                        key: opt.key || opt.label || ["A", "B", "C", "D"][oIdx] || String(oIdx + 1),
                        text: opt.text || opt.value || opt.content || "",
                        imageUrl: opt.imageUrl || opt.image || "",
                    };
                });
            }
            else if (q.options && typeof q.options === "object") {
                normalizedOpts = Object.entries(q.options).map(([k, v]) => ({
                    key: k.toUpperCase(),
                    text: String(v),
                }));
            }
            const created = await prisma_1.prisma.question.create({
                data: {
                    folderId: folderId || q.folderId || null,
                    creatorId: req.user.id,
                    questionNumber: String(q.questionNumber || q.qNum || idx + 1),
                    questionText: qText,
                    optionsJson: JSON.stringify(normalizedOpts),
                    correctAnswer: String(q.correctAnswer || q.answer || q.correct || q.key || "").trim().toUpperCase(),
                    explanation: String(q.explanation || q.solution || q.rationale || q.hint || ""),
                    marks: parseInt(q.marks || q.mark || q.pts || 1, 10) || 1,
                    negativeMarks: parseFloat(q.negativeMarks || q.negative || 0.0) || 0.0,
                    difficulty: q.difficulty || "MEDIUM",
                    tagsJson: JSON.stringify(Array.isArray(q.tags) ? q.tags : []),
                    formulasJson: JSON.stringify(Array.isArray(q.formulas) ? q.formulas : []),
                    diagramsJson: JSON.stringify(Array.isArray(q.diagrams) ? q.diagrams : []),
                },
            });
            createdQuestions.push(created);
        }
        await (0, audit_1.logAuditAction)(req.user.id, "IMPORT_QUESTIONS_JSON", "QUESTION", undefined, {
            count: createdQuestions.length,
            folderId,
        });
        res.status(201).json({
            status: "SUCCESS",
            count: createdQuestions.length,
            message: `Successfully imported ${createdQuestions.length} questions and answers into Question Bank.`,
            questions: createdQuestions,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Import & Extract Questions from Word (.docx) or PDF (.pdf) File
router.post("/questions/import/file", uploadDoc.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No Word (.docx) or PDF (.pdf) file uploaded" });
            return;
        }
        const { folderId, dryRun } = req.body;
        // Send file path to Python AI Microservice parser
        const params = new URLSearchParams();
        params.append("file_path", req.file.path);
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/import/parse-questions-file`, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const parsedQuestions = aiRes.data.questions || [];
        if (dryRun === "true" || dryRun === true) {
            // Just preview parsed questions without inserting
            res.json({
                status: "SUCCESS",
                count: parsedQuestions.length,
                questions: parsedQuestions,
                preview: true,
            });
            return;
        }
        // Persist into database
        const createdQuestions = [];
        for (let idx = 0; idx < parsedQuestions.length; idx++) {
            const q = parsedQuestions[idx];
            if (!q.questionText?.trim())
                continue;
            const created = await prisma_1.prisma.question.create({
                data: {
                    folderId: folderId || null,
                    creatorId: req.user.id,
                    questionNumber: String(q.questionNumber || idx + 1),
                    questionText: q.questionText,
                    optionsJson: JSON.stringify(q.options || []),
                    correctAnswer: String(q.correctAnswer || "").trim().toUpperCase(),
                    explanation: String(q.explanation || ""),
                    marks: parseInt(q.marks || 1, 10) || 1,
                    difficulty: q.difficulty || "MEDIUM",
                },
            });
            createdQuestions.push(created);
        }
        await (0, audit_1.logAuditAction)(req.user.id, "IMPORT_QUESTIONS_FILE", "QUESTION", undefined, {
            filename: req.file.originalname,
            count: createdQuestions.length,
            folderId,
        });
        res.status(201).json({
            status: "SUCCESS",
            count: createdQuestions.length,
            message: `Extracted and imported ${createdQuestions.length} questions and answers from ${req.file.originalname}!`,
            questions: createdQuestions,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Export Questions to CSV with UTF-8 BOM for full Multi-Language (Hindi, Sanskrit, Punjabi, Urdu, etc.) support in Excel
router.get("/questions/export/csv", async (req, res) => {
    try {
        const { folderId } = req.query;
        const where = {};
        if (folderId)
            where.folderId = folderId;
        const questions = await prisma_1.prisma.question.findMany({
            where,
            include: { folder: true },
            orderBy: { createdAt: "asc" },
        });
        const escapeCsv = (str = "") => {
            const clean = str.replace(/"/g, '""').replace(/\r?\n/g, " ");
            return `"${clean}"`;
        };
        const headers = [
            "Question Number",
            "Question Text",
            "Option (1)",
            "Option (2)",
            "Option (3)",
            "Option (4)",
            "Correct Answer",
            "Marks",
            "Difficulty",
            "Folder / Subject",
            "Explanation",
        ];
        const rows = questions.map((q) => {
            const opts = JSON.parse(q.optionsJson || "[]");
            const opt1 = opts[0]?.text || "";
            const opt2 = opts[1]?.text || "";
            const opt3 = opts[2]?.text || "";
            const opt4 = opts[3]?.text || "";
            return [
                escapeCsv(q.questionNumber),
                escapeCsv(q.questionText),
                escapeCsv(opt1),
                escapeCsv(opt2),
                escapeCsv(opt3),
                escapeCsv(opt4),
                escapeCsv(q.correctAnswer),
                q.marks,
                escapeCsv(q.difficulty),
                escapeCsv(q.folder?.name || "General"),
                escapeCsv(q.explanation),
            ].join(",");
        });
        // Prepend UTF-8 BOM (\uFEFF) so Excel correctly displays Hindi, Sanskrit, Punjabi, Urdu, etc.
        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
        res.setHeader("Content-Disposition", 'attachment; filename="question_bank_export.csv"');
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.send(csvContent);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
