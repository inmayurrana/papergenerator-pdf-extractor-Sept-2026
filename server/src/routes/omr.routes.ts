import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import { prisma } from "../prisma";
import { config } from "../config";
import { authenticateJwt, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.resolve(config.DATA_DIR, "omr");
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `omr_scan_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

router.use(authenticateJwt);

// List all generated OMR templates
router.get("/templates", async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.oMRTemplate.findMany({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate OMR template from paper or snapshot
router.post("/generate-template", async (req: AuthRequest, res: Response) => {
  try {
    const { paperId, snapshotId, examCode, title, totalQuestions, optionsPerQuestion, customAnswerKey } = req.body;
    let targetSnapshotId = snapshotId;

    let mergedAnswerKey: { [key: string]: string } = customAnswerKey || {};

    if (paperId) {
      const paper = await prisma.questionPaper.findUnique({ where: { id: paperId } });
      if (!paper) {
        res.status(404).json({ error: "Question paper not found" });
        return;
      }

      const layout = JSON.parse(paper.canvasLayoutJson || "{}");
      const questions: any[] = layout.questions || [];
      
      // Merge existing answers from layout
      questions.forEach((q, i) => {
        const qNum = String(i + 1);
        if (mergedAnswerKey[qNum]) {
          q.correctAnswer = mergedAnswerKey[qNum];
        } else if (q.correctAnswer) {
          mergedAnswerKey[qNum] = q.correctAnswer;
        }
      });

      // Update question paper canvas layout if custom answer key was provided
      if (customAnswerKey && Object.keys(customAnswerKey).length > 0) {
        await prisma.questionPaper.update({
          where: { id: paperId },
          data: {
            canvasLayoutJson: JSON.stringify({ ...layout, questions }),
          },
        });

        // Also update individual Question bank records if question IDs are present
        for (const q of questions) {
          if (q.id && q.correctAnswer) {
            try {
              await prisma.question.update({
                where: { id: q.id },
                data: { correctAnswer: q.correctAnswer },
              });
            } catch {}
          }
        }
      }

      // Find existing snapshot or create one automatically
      let existingSnap = await prisma.paperSnapshot.findFirst({
        where: { paperId },
        orderBy: { version: "desc" },
      });

      if (!existingSnap) {
        const count = await prisma.paperSnapshot.count({ where: { paperId } });
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
        existingSnap = await prisma.paperSnapshot.create({
          data: {
            paperId,
            version: count + 1,
            snapshotDataJson: JSON.stringify(snapshotPayload),
            finalizedById: req.user!.id,
          },
        });
      } else if (customAnswerKey) {
        // Update snapshot answer key
        const snapData = JSON.parse(existingSnap.snapshotDataJson);
        snapData.answerKey = { ...snapData.answerKey, ...mergedAnswerKey };
        existingSnap = await prisma.paperSnapshot.update({
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

    const snapshot = await prisma.paperSnapshot.findUnique({ where: { id: targetSnapshotId } });
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
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/omr/generate`, {
      exam_title: sheetTitle,
      exam_code: eCode,
      total_questions: qCount,
      options_per_question: optionsPerQuestion || 4,
      answer_key: finalAnswerKey,
    });

    const tmplData = aiRes.data.data;

    const template = await prisma.oMRTemplate.create({
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

    await logAuditAction(req.user!.id, "GENERATE_OMR_TEMPLATE", "OMR_TEMPLATE", template.id, {
      examCode: template.examCode,
      totalQuestions: template.totalQuestions,
      answerKeyCount: Object.keys(finalAnswerKey).length,
    });

    res.status(201).json({ template, answerKey: finalAnswerKey });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// Detect candidate Name and Roll Number from uploaded OMR sheet using AI OCR
router.post("/detect-candidate-info", upload.single("omrImage"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No OMR image uploaded" });
      return;
    }

    const filepath = path.resolve(req.file.path);
    try {
      const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/omr/detect-candidate-info`, {
        omr_image_path: filepath,
      });

      res.json({
        candidateInfo: aiRes.data?.data || { student_name: "", roll_number: "", found: false },
      });
    } catch (aiErr: any) {
      console.warn("AI candidate detection warning:", aiErr.message);
      res.json({
        candidateInfo: { student_name: "", roll_number: "", found: false },
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and evaluate scanned OMR image
router.post("/evaluate", upload.single("omrImage"), async (req: AuthRequest, res: Response) => {
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

    const template = await prisma.oMRTemplate.findUnique({
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
        const detectRes = await axios.post(`${config.AI_SERVICE_URL}/api/omr/detect-candidate-info`, {
          omr_image_path: req.file.path,
        });
        const cand = detectRes.data?.data;
        if (cand) {
          if (!finalStudentName && cand.student_name) finalStudentName = cand.student_name;
          if (!finalRollNumber && cand.roll_number) finalRollNumber = cand.roll_number;
        }
      } catch (e: any) {
        console.warn("Auto-detect candidate fallback warning:", e.message);
      }
    }

    if (!finalStudentName) finalStudentName = "Student Candidate";
    if (!finalRollNumber) finalRollNumber = "N/A";

    // Call AI Service OpenCV Evaluator
    const aiRes = await axios.post(`${config.AI_SERVICE_URL}/api/omr/evaluate`, {
      omr_image_path: req.file.path,
      template_metadata: templateMetadata,
      answer_key: answerKey,
      positive_marks: positiveMarks !== undefined ? parseFloat(positiveMarks) : 1.0,
      negative_marks: negativeMarks !== undefined ? parseFloat(negativeMarks) : 0.0,
    });

    const evalData = aiRes.data.data;

    const evaluation = await prisma.oMREvaluation.create({
      data: {
        templateId,
        studentName: finalStudentName,
        rollNumber: finalRollNumber,
        scannedImageUrl: `/data/omr/${path.basename(req.file.path)}`,
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

    await logAuditAction(req.user!.id, "EVALUATE_OMR", "OMR_EVALUATION", evaluation.id, {
      studentName: evaluation.studentName,
      rollNumber: evaluation.rollNumber,
      finalScore: evaluation.finalScore,
      percentage: evaluation.percentage,
    });

    res.status(201).json({ evaluation, results: evalData });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// List evaluations
router.get("/evaluations", async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.query;
    const where: any = {};
    if (templateId) where.templateId = templateId as string;

    const evaluations = await prisma.oMREvaluation.findMany({
      where,
      include: {
        template: { select: { id: true, examCode: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ evaluations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual teacher override for uncertain marks
router.put("/evaluations/:id/review", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { finalScore, detailedResults } = req.body;

    const evaluation = await prisma.oMREvaluation.update({
      where: { id },
      data: {
        finalScore: finalScore !== undefined ? parseFloat(finalScore) : undefined,
        detailedResultsJson: detailedResults ? JSON.stringify(detailedResults) : undefined,
        isReviewed: true,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    await logAuditAction(req.user!.id, "REVIEW_OMR", "OMR_EVALUATION", id, {
      newScore: finalScore,
      reviewerId: req.user!.id,
    });

    res.json({ evaluation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
