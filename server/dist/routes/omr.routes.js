"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.resolve(config_1.config.DATA_DIR, "omr");
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `omr_scan_${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
router.use(auth_1.authenticateJwt);
// List all generated OMR templates
router.get("/templates", async (req, res) => {
    try {
        const templates = await prisma_1.prisma.oMRTemplate.findMany({
            include: {
                snapshot: {
                    include: {
                        paper: { select: { id: true, title: true, examCode: true, schoolName: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ templates });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generate OMR template from paper or snapshot
router.post("/generate-template", async (req, res) => {
    try {
        const { paperId, snapshotId, examCode, title, totalQuestions, optionsPerQuestion, customAnswerKey } = req.body;
        let targetSnapshotId = snapshotId;
        let mergedAnswerKey = customAnswerKey || {};
        if (paperId) {
            const paper = await prisma_1.prisma.questionPaper.findUnique({ where: { id: paperId } });
            if (!paper) {
                res.status(404).json({ error: "Question paper not found" });
                return;
            }
            const layout = JSON.parse(paper.canvasLayoutJson || "{}");
            const questions = layout.questions || [];
            // Merge existing answers from layout
            questions.forEach((q, i) => {
                const qNum = String(i + 1);
                if (mergedAnswerKey[qNum]) {
                    q.correctAnswer = mergedAnswerKey[qNum];
                }
                else if (q.correctAnswer) {
                    mergedAnswerKey[qNum] = q.correctAnswer;
                }
            });
            // Update question paper canvas layout if custom answer key was provided
            if (customAnswerKey && Object.keys(customAnswerKey).length > 0) {
                await prisma_1.prisma.questionPaper.update({
                    where: { id: paperId },
                    data: {
                        canvasLayoutJson: JSON.stringify({ ...layout, questions }),
                    },
                });
                // Also update individual Question bank records if question IDs are present
                for (const q of questions) {
                    if (q.id && q.correctAnswer) {
                        try {
                            await prisma_1.prisma.question.update({
                                where: { id: q.id },
                                data: { correctAnswer: q.correctAnswer },
                            });
                        }
                        catch { }
                    }
                }
            }
            // Find existing snapshot or create one automatically
            let existingSnap = await prisma_1.prisma.paperSnapshot.findFirst({
                where: { paperId },
                orderBy: { version: "desc" },
            });
            if (!existingSnap) {
                const count = await prisma_1.prisma.paperSnapshot.count({ where: { paperId } });
                const snapshotPayload = {
                    version: count + 1,
                    paperMeta: {
                        title: paper.title,
                        examCode: paper.examCode,
                        schoolName: paper.schoolName,
                        maxMarks: paper.maxMarks,
                        durationMinutes: paper.durationMinutes,
                    },
                    canvasLayout: { ...layout, questions },
                    questions,
                    answerKey: mergedAnswerKey,
                    finalizedAt: new Date().toISOString(),
                };
                existingSnap = await prisma_1.prisma.paperSnapshot.create({
                    data: {
                        paperId,
                        version: count + 1,
                        snapshotDataJson: JSON.stringify(snapshotPayload),
                        finalizedById: req.user.id,
                    },
                });
            }
            else if (customAnswerKey) {
                // Update snapshot answer key
                const snapData = JSON.parse(existingSnap.snapshotDataJson);
                snapData.answerKey = { ...snapData.answerKey, ...mergedAnswerKey };
                existingSnap = await prisma_1.prisma.paperSnapshot.update({
                    where: { id: existingSnap.id },
                    data: { snapshotDataJson: JSON.stringify(snapData) },
                });
            }
            targetSnapshotId = existingSnap.id;
        }
        if (!targetSnapshotId) {
            res.status(400).json({ error: "paperId or snapshotId is required" });
            return;
        }
        const snapshot = await prisma_1.prisma.paperSnapshot.findUnique({ where: { id: targetSnapshotId } });
        if (!snapshot) {
            res.status(404).json({ error: "Paper snapshot not found" });
            return;
        }
        const snapshotData = JSON.parse(snapshot.snapshotDataJson);
        const finalAnswerKey = { ...snapshotData.answerKey, ...mergedAnswerKey };
        const qCount = totalQuestions || (snapshotData.questions?.length || 30);
        const eCode = examCode || snapshotData.paperMeta?.examCode || "EXAM-101";
        const sheetTitle = title || `${snapshotData.paperMeta?.title || 'EXAM'} - OMR SHEET`;
        // Call AI Service OMR generator with full answer key for master sheet generation
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/omr/generate`, {
            exam_title: sheetTitle,
            exam_code: eCode,
            total_questions: qCount,
            options_per_question: optionsPerQuestion || 4,
            answer_key: finalAnswerKey,
        });
        const tmplData = aiRes.data.data;
        const template = await prisma_1.prisma.oMRTemplate.create({
            data: {
                snapshotId: targetSnapshotId,
                examCode: eCode,
                title: sheetTitle,
                totalQuestions: qCount,
                optionsPerQuestion: optionsPerQuestion || 4,
                imageUrl: tmplData.relative_url,
                templateMetadataJson: JSON.stringify(tmplData),
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "GENERATE_OMR_TEMPLATE", "OMR_TEMPLATE", template.id, {
            examCode: template.examCode,
            totalQuestions: template.totalQuestions,
            answerKeyCount: Object.keys(finalAnswerKey).length,
        });
        res.status(201).json({ template, answerKey: finalAnswerKey });
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Detect candidate Name and Roll Number from uploaded OMR sheet using AI OCR
router.post("/detect-candidate-info", upload.single("omrImage"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No OMR image uploaded" });
            return;
        }
        const filepath = path_1.default.resolve(req.file.path);
        try {
            const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/omr/detect-candidate-info`, {
                omr_image_path: filepath,
            });
            res.json({
                candidateInfo: aiRes.data?.data || { student_name: "", roll_number: "", found: false },
            });
        }
        catch (aiErr) {
            console.warn("AI candidate detection warning:", aiErr.message);
            res.json({
                candidateInfo: { student_name: "", roll_number: "", found: false },
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Upload and evaluate scanned OMR image
router.post("/evaluate", upload.single("omrImage"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No OMR image uploaded" });
            return;
        }
        const { templateId, studentName, rollNumber, positiveMarks, negativeMarks } = req.body;
        if (!templateId) {
            res.status(400).json({ error: "templateId is required" });
            return;
        }
        const template = await prisma_1.prisma.oMRTemplate.findUnique({
            where: { id: templateId },
            include: { snapshot: true },
        });
        if (!template) {
            res.status(404).json({ error: "OMR template not found" });
            return;
        }
        const snapshotData = JSON.parse(template.snapshot.snapshotDataJson);
        const answerKey = snapshotData.answerKey || {};
        const templateMetadata = JSON.parse(template.templateMetadataJson);
        let finalStudentName = (studentName || "").trim();
        let finalRollNumber = (rollNumber || "").trim();
        // If student name or roll number was left blank by user, run auto-detection
        if (!finalStudentName || !finalRollNumber) {
            try {
                const detectRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/omr/detect-candidate-info`, {
                    omr_image_path: req.file.path,
                });
                const cand = detectRes.data?.data;
                if (cand) {
                    if (!finalStudentName && cand.student_name)
                        finalStudentName = cand.student_name;
                    if (!finalRollNumber && cand.roll_number)
                        finalRollNumber = cand.roll_number;
                }
            }
            catch (e) {
                console.warn("Auto-detect candidate fallback warning:", e.message);
            }
        }
        if (!finalStudentName)
            finalStudentName = "Student Candidate";
        if (!finalRollNumber)
            finalRollNumber = "N/A";
        // Call AI Service OpenCV Evaluator
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/omr/evaluate`, {
            omr_image_path: req.file.path,
            template_metadata: templateMetadata,
            answer_key: answerKey,
            positive_marks: positiveMarks !== undefined ? parseFloat(positiveMarks) : 1.0,
            negative_marks: negativeMarks !== undefined ? parseFloat(negativeMarks) : 0.0,
        });
        const evalData = aiRes.data.data;
        const evaluation = await prisma_1.prisma.oMREvaluation.create({
            data: {
                templateId,
                studentName: finalStudentName,
                rollNumber: finalRollNumber,
                scannedImageUrl: `/data/omr/${path_1.default.basename(req.file.path)}`,
                annotatedImageUrl: evalData.annotated_image_url,
                totalQuestions: evalData.total_questions,
                attemptedCount: evalData.attempted,
                correctCount: evalData.correct,
                incorrectCount: evalData.incorrect,
                unattemptedCount: evalData.unattempted,
                invalidCount: evalData.invalid_multiple,
                uncertainCount: evalData.uncertain,
                rawMarks: evalData.raw_marks,
                negativeMarks: evalData.negative_marks,
                finalScore: evalData.final_score,
                maxMarks: evalData.max_marks,
                percentage: evalData.percentage,
                detailedResultsJson: JSON.stringify(evalData.question_results),
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "EVALUATE_OMR", "OMR_EVALUATION", evaluation.id, {
            studentName: evaluation.studentName,
            rollNumber: evaluation.rollNumber,
            finalScore: evaluation.finalScore,
            percentage: evaluation.percentage,
        });
        res.status(201).json({ evaluation, results: evalData });
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// List evaluations
router.get("/evaluations", async (req, res) => {
    try {
        const { templateId } = req.query;
        const where = {};
        if (templateId)
            where.templateId = templateId;
        const evaluations = await prisma_1.prisma.oMREvaluation.findMany({
            where,
            include: {
                template: { select: { id: true, examCode: true, title: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ evaluations });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Manual teacher override for uncertain marks
router.put("/evaluations/:id/review", async (req, res) => {
    try {
        const { id } = req.params;
        const { finalScore, detailedResults } = req.body;
        const evaluation = await prisma_1.prisma.oMREvaluation.update({
            where: { id },
            data: {
                finalScore: finalScore !== undefined ? parseFloat(finalScore) : undefined,
                detailedResultsJson: detailedResults ? JSON.stringify(detailedResults) : undefined,
                isReviewed: true,
                reviewedById: req.user.id,
                reviewedAt: new Date(),
            },
        });
        await (0, audit_1.logAuditAction)(req.user.id, "REVIEW_OMR", "OMR_EVALUATION", id, {
            newScore: finalScore,
            reviewerId: req.user.id,
        });
        res.json({ evaluation });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
