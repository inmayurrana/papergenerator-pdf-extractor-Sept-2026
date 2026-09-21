import { Router, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { config } from "../config";
import { authenticateJwt, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";
import { StorageSyncService } from "../services/storageSync.service";

const router = Router();

router.use(authenticateJwt);

// List question papers
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const papers = await prisma.questionPaper.findMany({
      include: {
        creator: { select: { id: true, fullName: true } },
        snapshots: { select: { id: true, version: true, finalizedAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ papers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single paper
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const paper = await prisma.questionPaper.findUnique({
      where: { id: req.params.id },
      include: {
        snapshots: {
          include: { omrTemplates: true },
          orderBy: { version: "desc" },
        },
      },
    });
    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }
    res.json({ paper });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create question paper
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      examCode,
      schoolName,
      schoolLogoUrl,
      instructions,
      watermark,
      maxMarks,
      durationMinutes,
      examDate,
      examTime,
      canvasLayout,
      currentMarks,
    } = req.body;

    if (!title || !examCode) {
      res.status(400).json({ error: "Title and Exam Code are required" });
      return;
    }

    let finalCanvasLayout: any = canvasLayout || {};
    if (typeof finalCanvasLayout === "string") {
      try { finalCanvasLayout = JSON.parse(finalCanvasLayout); } catch {}
    }
    if (!finalCanvasLayout.settings) finalCanvasLayout.settings = {};
    if (req.body.className) finalCanvasLayout.settings.className = req.body.className;
    if (req.body.subjectName) finalCanvasLayout.settings.subjectName = req.body.subjectName;

    const paper = await prisma.questionPaper.create({
      data: {
        title,
        examCode,
        schoolName: schoolName || "ACADEMY HIGH SCHOOL",
        schoolLogoUrl: schoolLogoUrl || "",
        instructions: instructions || "1. Answer all questions.\n2. Use blue or black pen only.",
        watermark: watermark || "",
        maxMarks: maxMarks !== undefined ? parseInt(maxMarks, 10) : 100,
        currentMarks: currentMarks !== undefined ? parseInt(currentMarks, 10) : 0,
        durationMinutes: durationMinutes || 180,
        examDate: examDate || new Date().toISOString().split("T")[0],
        examTime: examTime || "10:00 AM - 01:00 PM",
        canvasLayoutJson: JSON.stringify(finalCanvasLayout),
        creatorId: req.user!.id,
      },
    });

    const syncPath = await StorageSyncService.syncPaperToDisk(paper.id);

    await logAuditAction(req.user!.id, "CREATE_PAPER", "PAPER", paper.id, {
      title: paper.title,
      examCode: paper.examCode,
    });

    res.status(201).json({ paper, syncPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update paper / canvas layout
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.examCode !== undefined) data.examCode = body.examCode;
    if (body.schoolName !== undefined) data.schoolName = body.schoolName;
    if (body.schoolLogoUrl !== undefined) data.schoolLogoUrl = body.schoolLogoUrl;
    if (body.instructions !== undefined) data.instructions = body.instructions;
    if (body.watermark !== undefined) data.watermark = body.watermark;
    if (body.maxMarks !== undefined) data.maxMarks = parseInt(body.maxMarks, 10);
    if (body.currentMarks !== undefined) data.currentMarks = parseInt(body.currentMarks, 10);
    if (body.durationMinutes !== undefined) data.durationMinutes = parseInt(body.durationMinutes, 10);
    if (body.examDate !== undefined) data.examDate = body.examDate;
    if (body.examTime !== undefined) data.examTime = body.examTime;

    if (body.canvasLayout !== undefined || body.canvasLayoutJson !== undefined || body.className !== undefined || body.subjectName !== undefined) {
      const rawLayout = body.canvasLayout !== undefined ? body.canvasLayout : body.canvasLayoutJson;
      let layoutObj: any = {};
      if (rawLayout) {
        layoutObj = typeof rawLayout === "string" ? JSON.parse(rawLayout) : rawLayout;
      } else {
        const existing = await prisma.questionPaper.findUnique({ where: { id }, select: { canvasLayoutJson: true } });
        try { layoutObj = JSON.parse(existing?.canvasLayoutJson || "{}"); } catch {}
      }
      if (!layoutObj.settings) layoutObj.settings = {};
      if (body.className) layoutObj.settings.className = body.className;
      if (body.subjectName) layoutObj.settings.subjectName = body.subjectName;
      data.canvasLayoutJson = JSON.stringify(layoutObj);
    }

    const paper = await prisma.questionPaper.update({
      where: { id },
      data,
    });

    const syncPath = await StorageSyncService.syncPaperToDisk(paper.id);

    res.json({ paper, syncPath });
  } catch (err: any) {
    console.error("PUT /papers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Finalize Question Paper and generate Immutable Snapshot
router.post("/:id/finalize", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminOverride, questionsSnapshot, answerKey } = req.body;
    const paper = await prisma.questionPaper.findUnique({ where: { id } });

    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    // Mark management check: Current question marks must match Max Marks
    const maxMarks = paper.maxMarks;
    const currentMarks = paper.currentMarks;

    if (maxMarks !== currentMarks && !adminOverride) {
      const diff = maxMarks - currentMarks;
      const msg = diff > 0
        ? `Marks mismatch: ${diff} marks remaining to reach Maximum Marks (${maxMarks}). Current total is ${currentMarks}.`
        : `Marks mismatch: Current marks (${currentMarks}) exceed Maximum Marks (${maxMarks}) by ${Math.abs(diff)} marks.`;

      res.status(400).json({
        error: msg,
        maxMarks,
        currentMarks,
        diff,
      });
      return;
    }

    // Get current version count for this paper
    const versionCount = await prisma.paperSnapshot.count({ where: { paperId: id } });
    const newVersion = versionCount + 1;

    // Create immutable snapshot payload
    const snapshotPayload = {
      version: newVersion,
      paperMeta: {
        title: paper.title,
        examCode: paper.examCode,
        schoolName: paper.schoolName,
        schoolLogoUrl: paper.schoolLogoUrl,
        instructions: paper.instructions,
        maxMarks: paper.maxMarks,
        durationMinutes: paper.durationMinutes,
        examDate: paper.examDate,
        examTime: paper.examTime,
      },
      canvasLayout: JSON.parse(paper.canvasLayoutJson || "{}"),
      questions: questionsSnapshot || [],
      answerKey: answerKey || {},
      finalizedAt: new Date().toISOString(),
    };

    const snapshot = await prisma.paperSnapshot.create({
      data: {
        paperId: id,
        version: newVersion,
        snapshotDataJson: JSON.stringify(snapshotPayload),
        finalizedById: req.user!.id,
      },
    });

    await prisma.questionPaper.update({
      where: { id },
      data: { status: "FINALIZED" },
    });

    await StorageSyncService.syncPaperToDisk(id);

    await logAuditAction(req.user!.id, "FINALIZE_PAPER", "PAPER_SNAPSHOT", snapshot.id, {
      paperId: id,
      version: newVersion,
      maxMarks: paper.maxMarks,
    });

    res.json({
      message: "Question Paper finalized and immutable snapshot created successfully!",
      snapshot,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete question paper
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.questionPaper.delete({ where: { id } });
    await logAuditAction(req.user!.id, "DELETE_PAPER", "PAPER", id);
    res.json({ message: "Question paper deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clone / Duplicate question paper
router.post("/:id/clone", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const sourcePaper = await prisma.questionPaper.findUnique({ where: { id } });
    if (!sourcePaper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    const clonedPaper = await prisma.questionPaper.create({
      data: {
        title: `Copy of ${sourcePaper.title}`,
        examCode: `${sourcePaper.examCode}-SET2`,
        schoolName: sourcePaper.schoolName,
        schoolLogoUrl: sourcePaper.schoolLogoUrl,
        instructions: sourcePaper.instructions,
        watermark: sourcePaper.watermark,
        maxMarks: sourcePaper.maxMarks,
        currentMarks: sourcePaper.currentMarks,
        durationMinutes: sourcePaper.durationMinutes,
        examDate: sourcePaper.examDate,
        examTime: sourcePaper.examTime,
        status: "DRAFT",
        canvasLayoutJson: sourcePaper.canvasLayoutJson,
        creatorId: req.user!.id,
      },
    });

    await StorageSyncService.syncPaperToDisk(clonedPaper.id);

    await logAuditAction(req.user!.id, "CLONE_PAPER", "PAPER", clonedPaper.id, {
      sourceId: id,
      newTitle: clonedPaper.title,
    });

    res.status(201).json({ paper: clonedPaper });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all Question Papers & Question Bank to Physical Disk Storage (D:\Recovered_school_app\PAPERGENERATOR\data\Bank)
router.post("/sync-storage", async (req: AuthRequest, res: Response) => {
  try {
    const summary = await StorageSyncService.syncAllToDisk();
    res.json({
      status: "SUCCESS",
      message: "Synchronized all Question Bank questions and Question Papers to physical disk storage successfully!",
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Paper to Excel / CSV
router.get("/:id/export/excel", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const paper = await prisma.questionPaper.findUnique({ where: { id } });
    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    const layout = JSON.parse(paper.canvasLayoutJson || "{}");
    const questions: any[] = layout.questions || [];

    const escapeCsv = (str: string = "") => {
      const clean = str.replace(/"/g, '""').replace(/\r?\n/g, " ");
      return `"${clean}"`;
    };

    const headerMetadata = [
      `"EXAMINATION QUESTION PAPER"`,
      `"School / Institute:","${paper.schoolName}"`,
      `"Paper Title:","${paper.title}"`,
      `"Exam Code:","${paper.examCode}"`,
      `"Maximum Marks:","${paper.maxMarks}"`,
      `"Duration:","${paper.durationMinutes} Minutes"`,
      `"Date & Time:","${paper.examDate} (${paper.examTime})"`,
      `"Instructions:","${paper.instructions.replace(/\r?\n/g, ' | ')}"`,
      `""`,
    ];

    const tableHeaders = [
      "Q#",
      "Question Text",
      "Option (1)",
      "Option (2)",
      "Option (3)",
      "Option (4)",
      "Correct Answer",
      "Marks",
    ];

    const rows = questions.map((q, idx) => {
      const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
      const opt1 = opts[0]?.text || "";
      const opt2 = opts[1]?.text || "";
      const opt3 = opts[2]?.text || "";
      const opt4 = opts[3]?.text || "";

      return [
        `"Q${idx + 1}"`,
        escapeCsv(q.questionText || q.question_text || ""),
        escapeCsv(opt1),
        escapeCsv(opt2),
        escapeCsv(opt3),
        escapeCsv(opt4),
        escapeCsv(q.correctAnswer || ""),
        q.marks || 1,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [...headerMetadata, tableHeaders.join(","), ...rows].join("\r\n");
    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.csv"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to convert any image path or URL to offline Base64 Data URI for Word Embedding
function resolveImageToBase64(imgUrl?: string | null): string | null {
  if (!imgUrl || typeof imgUrl !== "string") return null;
  if (imgUrl.startsWith("data:image/")) return imgUrl;

  try {
    let cleanPath = imgUrl.replace(/^[/\\]+/, "");
    if (cleanPath.startsWith("api/")) cleanPath = cleanPath.substring(4);
    if (cleanPath.startsWith("data/")) cleanPath = cleanPath.substring(5);

    const candidates = [
      path.resolve(config.DATA_DIR, cleanPath),
      path.resolve(config.DATA_DIR, "diagrams", path.basename(cleanPath)),
      path.resolve(config.DATA_DIR, "snips", path.basename(cleanPath)),
      path.resolve(config.DATA_DIR, "uploads", path.basename(cleanPath)),
      path.resolve(process.cwd(), "data", cleanPath),
      path.resolve(process.cwd(), "data", "diagrams", path.basename(cleanPath)),
      path.resolve(process.cwd(), "data", "snips", path.basename(cleanPath)),
      path.resolve(process.cwd(), "data", "uploads", path.basename(cleanPath)),
      path.resolve(process.cwd(), "..", "data", cleanPath),
      path.resolve(process.cwd(), "..", "data", "diagrams", path.basename(cleanPath)),
      path.resolve(process.cwd(), "..", "data", "snips", path.basename(cleanPath)),
      path.resolve(process.cwd(), "..", "data", "uploads", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data", cleanPath),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/diagrams", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/snips", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/uploads", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data", cleanPath),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data/diagrams", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data/snips", path.basename(cleanPath)),
      path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data/uploads", path.basename(cleanPath)),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const ext = path.extname(cand).toLowerCase().replace(".", "");
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/png";
        const buf = fs.readFileSync(cand);
        return `data:${mime};base64,${buf.toString("base64")}`;
      }
    }
  } catch (e: any) {
    console.warn("Could not resolve image to base64 for Word export:", imgUrl, e.message);
  }

  return imgUrl;
}

// Export Paper to Microsoft Word (.doc)
router.get("/:id/export/word", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const paper = await prisma.questionPaper.findUnique({ where: { id } });
    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    const layout = JSON.parse(paper.canvasLayoutJson || "{}");
    const settings = layout.settings || {};
    const questions: any[] = layout.questions || [];

    const schoolLogoUrl = paper.schoolLogoUrl || settings.schoolLogoUrl;
    const schoolLogoB64 = resolveImageToBase64(schoolLogoUrl);

    let topMm = 15, rightMm = 18, bottomMm = 15, leftMm = 18;
    if (settings.pageMargin === 'custom') {
      topMm = settings.marginTop !== undefined ? settings.marginTop : 15;
      rightMm = settings.marginRight !== undefined ? settings.marginRight : 18;
      bottomMm = settings.marginBottom !== undefined ? settings.marginBottom : 15;
      leftMm = settings.marginLeft !== undefined ? settings.marginLeft : 18;
    } else if (settings.pageMargin === 'zero') {
      topMm = 4; rightMm = 5; bottomMm = 4; leftMm = 5;
    } else if (settings.pageMargin === 'narrow') {
      topMm = 8; rightMm = 10; bottomMm = 8; leftMm = 10;
    } else if (settings.pageMargin === 'wide') {
      topMm = 25; rightMm = 25; bottomMm = 25; leftMm = 25;
    } else {
      topMm = 15; rightMm = 18; bottomMm = 15; leftMm = 18;
    }

    const fontMap: Record<string, string> = {
      serif: "'Times New Roman', Times, Georgia, Cambria, serif",
      cm: "'Latin Modern Roman', 'Computer Modern Roman', 'Times New Roman', serif",
      calibri: "Calibri, 'Segoe UI', Candara, sans-serif",
      sans: "Arial, Helvetica, 'Liberation Sans', sans-serif",
      cambria: "Cambria, 'Times New Roman', Georgia, serif",
      georgia: "Georgia, 'Times New Roman', serif",
      garamond: "Garamond, 'EB Garamond', Baskerville, serif",
      verdana: "Verdana, Geneva, Tahoma, sans-serif",
      trebuchet: "'Trebuchet MS', 'Lucida Grande', sans-serif",
      bookman: "'Book Antiqua', 'Palatino Linotype', Palatino, serif",
      dejavu: "'Lucida Sans', 'DejaVu Sans', sans-serif",
      monospace: "'Courier New', Courier, monospace",
    };
    const fontFamilyCss = fontMap[settings.fontFamily] || "'Times New Roman', Times, serif";
    const bodyFontSize = settings.fontSize || (settings.baseFontSizePt ? `${settings.baseFontSizePt}pt` : '10pt');

    // Generate clean HTML-based MS Word format with fully embedded Base64 images
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${paper.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 210mm 297mm;
            margin: ${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm;
            mso-page-orientation: portrait;
          }
          @page Section1 {
            size: 210mm 297mm;
            margin: ${topMm}mm ${rightMm}mm ${bottomMm}mm ${leftMm}mm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          body { font-family: ${fontFamilyCss}; font-size: ${bodyFontSize}; line-height: 1.35; color: #000; margin: 0; padding: 0; }
          .school-title { font-size: 18pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 3pt; }
          .exam-title { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 6pt; color: #1a365d; }
          .meta-table { width: 100%; font-size: 10pt; font-weight: bold; margin-top: 4pt; }
          .candidate-box { border: 1pt solid #000; padding: 8pt; margin-bottom: 14pt; font-size: 10pt; background: #fafafa; }
          .roll-box { display: inline-block; width: 16pt; height: 16pt; border: 1pt solid #000; margin-left: 2pt; text-align: center; vertical-align: middle; }
          .instructions { font-size: 9pt; border-top: 0.5pt solid #ccc; padding-top: 4pt; margin-top: 4pt; color: #333; }
          .question-block { margin-bottom: 12pt; page-break-inside: avoid; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 8pt; }
          .q-stem { font-weight: 500; font-size: 1em; margin-bottom: 4pt; }
          .q-marks { float: right; font-weight: bold; font-family: monospace; color: #2d3748; }
          .diagram-container { margin: 6pt 0; text-align: left; }
          .diagram-img { max-height: 200pt; max-width: 450pt; width: auto; border: 0.5pt solid #cbd5e0; margin: 4pt 0; }
          .options-grid { margin-left: 15pt; margin-top: 4pt; font-size: 0.95em; }
          .opt-item { display: inline-block; min-width: 22%; margin-right: 15pt; margin-bottom: 4pt; vertical-align: top; }
          .opt-img { max-height: 45pt; width: auto; display: block; margin-top: 2pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
        ${schoolLogoB64 ? `
          <div style="text-align: center; margin-bottom: 8pt;">
            <img src="${schoolLogoB64}" style="max-height: 60pt; max-width: 150pt; width: auto;" alt="School Logo" />
          </div>
        ` : ''}
        <div class="school-title">${paper.schoolName || 'DELHI PUBLIC SCHOOL'}</div>
        <div class="exam-title">${paper.title}</div>
        <table class="meta-table">
          <tr>
            <td><strong>EXAM CODE:</strong> ${paper.examCode}</td>
            <td style="text-align:center;"><strong>TIME ALLOWED:</strong> ${paper.durationMinutes} MINS</td>
            <td style="text-align:right;"><strong>MAX MARKS:</strong> ${paper.maxMarks}</td>
          </tr>
          ${(settings.customHeaderFields || []).length > 0 ? `
            <tr>
              <td colspan="3" style="padding-top: 3pt; font-size: 9.5pt;">
                ${(settings.customHeaderFields || []).map((f: any) => `<strong>${f.label}:</strong> ${f.value}`).join(' &nbsp;|&nbsp; ')}
              </td>
            </tr>
          ` : ''}
        </table>
        <hr style="border: 1pt solid #000; margin: 6pt 0 12pt 0;" />

        <div class="candidate-box">
          <table style="width:100%;">
            <tr>
              <td><strong>Candidate Name:</strong> ___________________________________</td>
              <td style="text-align:right;">
                <strong>Roll No:</strong>
                <span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span><span class="roll-box"></span>
              </td>
            </tr>
            ${(settings.customCandidateFields || []).length > 0 ? `
              <tr>
                <td colspan="2" style="padding-top: 4pt;">
                  ${(settings.customCandidateFields || []).map((cf: any) => `<strong>${cf.label}:</strong> ${cf.placeholder}`).join(' &nbsp;&nbsp;&nbsp;&nbsp; ')}
                </td>
              </tr>
            ` : ''}
          </table>
          ${paper.instructions ? `<div class="instructions"><strong>General Instructions:</strong><br/>${paper.instructions.replace(/\n/g, '<br/>')}</div>` : ''}
        </div>

        <div class="questions-container">
          ${(() => {
            let qCounter = 0;
            return questions.map((q) => {
              if (q.type === 'section') {
                const isSectionHidden = q.hideSection !== undefined ? q.hideSection : !!settings.hideAllSections;
                if (isSectionHidden) return '';
                return `
                  <div style="font-size: 13pt; font-weight: bold; text-align: ${q.align === 'left' ? 'left' : 'center'}; text-transform: uppercase; margin: 14pt 0 4pt 0; border-bottom: 1.5pt solid #000; padding-bottom: 3pt;">
                    ${q.title || ''}
                    ${q.subtitle ? `<div style="font-size: 9.5pt; font-weight: normal; font-style: italic; color: #444; margin-top: 2pt;">${q.subtitle}</div>` : ''}
                  </div>
                `;
              }
              if (q.type === 'note') {
                return `
                  <div style="font-size: 10pt; font-style: italic; background: #f7fafc; border: 0.5pt solid #e2e8f0; padding: 4pt 8pt; margin: 6pt 0; color: #333;">
                    ${q.text || ''}
                  </div>
                `;
              }
              if (q.type === 'space') {
                const spaceH = q.height || 60;
                const style = q.spaceStyle || 'blank';
                if (style === 'rough') {
                  return `
                    <div style="border: 1pt dashed #718096; height: ${spaceH}px; margin: 8pt 0; display: flex; align-items: center; justify-content: center; text-align: center; color: #718096; font-size: 8.5pt; font-family: monospace; line-height: ${spaceH}px;">
                      &mdash; SPACE FOR ROUGH WORK &mdash;
                    </div>
                  `;
                }
                if (style === 'ruled') {
                  const lineCount = Math.max(1, Math.floor(spaceH / 22));
                  const lines = Array.from({ length: lineCount }).map(() => `<div style="border-bottom: 1pt dashed #cbd5e0; height: 20px; width: 100%;"></div>`).join('');
                  return `<div style="height: ${spaceH}px; margin: 8pt 0;">${lines}</div>`;
                }
                return `<div style="height: ${spaceH}px; margin: 6pt 0;"></div>`;
              }

              qCounter++;
              const currentQNum = qCounter;
              const opts = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.options || [];
              const diagrams = typeof q.diagramsJson === 'string' ? JSON.parse(q.diagramsJson) : q.diagrams || [];
              const showMarks = (q.hideMarks !== undefined ? !q.hideMarks : (settings.showQuestionMarks !== false)) && Number(q.marks) > 0;
              const showOpts = (q.hideOptions !== undefined ? !q.hideOptions : !settings.hideAllOptions) && opts.length > 0;
              const blankLines = q.blankLinesCount !== undefined && q.blankLinesCount !== null
                ? q.blankLinesCount
                : (q.blankSpaceHeight ? Math.round(q.blankSpaceHeight / 22) : 0);

              return `
                <div class="question-block" ${q.customFontSize ? `style="font-size: ${q.customFontSize}pt;"` : ''}>
                  <div class="q-stem">
                    ${showMarks ? `<span class="q-marks">[${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}]</span>` : ''}
                    <strong>Q${currentQNum}.</strong> ${q.questionText || q.question_text || ''}
                  </div>

                  ${diagrams.length > 0 ? `
                    <div class="diagram-container">
                      ${diagrams.map((d: any) => {
                        const imgUrl = typeof d === 'string' ? d : d.relative_url || d.url || '';
                        const b64 = resolveImageToBase64(imgUrl);
                        return b64 ? `<img src="${b64}" class="diagram-img" alt="Figure" />` : '';
                      }).join('')}
                    </div>
                  ` : ''}

                  ${showOpts ? `
                    <div class="options-grid">
                      ${opts.map((opt: any) => {
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

                  ${(blankLines > 0 || (q.blankSpaceHeight && q.blankSpaceHeight > 0)) ? `
                    <div style="margin-top: 6pt;">
                      ${q.blankSpaceStyle === 'rough' ? `
                        <div style="height: ${blankLines ? blankLines * 22 : q.blankSpaceHeight}px; border: 1pt dashed #718096; text-align: center; font-size: 8pt; color: #718096; font-family: monospace; line-height: ${blankLines ? blankLines * 22 : q.blankSpaceHeight}px;">
                          &mdash; SPACE FOR ROUGH WORK &mdash;
                        </div>
                      ` : q.blankSpaceStyle === 'blank' ? `
                        <div style="height: ${blankLines ? blankLines * 22 : q.blankSpaceHeight}px;"></div>
                      ` : `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 4pt;">
                          ${Array.from({ length: blankLines || 1 }).map(() => `
                            <tr>
                              <td style="border-bottom: 1pt dashed #a0aec0; height: 18pt;">&nbsp;</td>
                            </tr>
                          `).join('')}
                        </table>
                      `}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('');
          })()}
        </div>

        <!-- Answer Key & Marking Scheme Appendix -->
        <div style="page-break-before: always;"></div>
        <div style="font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 4pt; color: #276749;">
          EXAMINATION ANSWER KEY &amp; MARKING SCHEME
        </div>
        <div style="text-align: center; font-size: 11pt; color: #4a5568; margin-bottom: 12pt;">
          <strong>Paper:</strong> ${paper.title} &bull; <strong>Exam Code:</strong> ${paper.examCode} &bull; <strong>Max Marks:</strong> ${paper.maxMarks}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16pt; font-size: 10pt;">
          <tr style="background: #e6fffa;">
            ${questions.filter((q) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').slice(0, 10).map((q, idx) => `<th style="border: 1pt solid #cbd5e0; padding: 4pt 8pt; text-align: center;">Q${idx + 1}</th>`).join('')}
          </tr>
          <tr>
            ${questions.filter((q) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').slice(0, 10).map((q) => `<td style="border: 1pt solid #cbd5e0; padding: 4pt 8pt; text-align: center;"><strong>${q.correctAnswer || '-'}</strong></td>`).join('')}
          </tr>
        </table>

        ${questions.filter((q) => q.type !== 'section' && q.type !== 'note' && q.type !== 'space').map((q, idx) => `
          <div style="background: #f0fff4; border-left: 3pt solid #38a169; padding: 6pt 10pt; margin-top: 6pt; margin-bottom: 10pt;">
            <div style="font-weight: bold; color: #22543d; font-size: 10pt; margin-bottom: 2pt;">
              Q${idx + 1}. Correct Answer: (${q.correctAnswer || 'Not Specified'}) &bull; [${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}]
            </div>
            <div style="font-size: 9.5pt; color: #2d3748;">
              ${q.explanation ? q.explanation.replace(/\n/g, '<br/>') : 'Full marks awarded for correct response.'}
            </div>
          </div>
        `).join('')}
        </div>
      </body>
      </html>
    `;

    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.doc"`);
    res.setHeader("Content-Type", "application/msword; charset=utf-8");
    res.send(htmlContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Question Paper to JSON (Universal Portable Format for External Apps)
router.get("/:id/export/json", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const paper = await prisma.questionPaper.findUnique({
      where: { id },
      include: { creator: { select: { fullName: true, email: true } } },
    });

    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    const layout = JSON.parse(paper.canvasLayoutJson || "{}");
    const questions: any[] = layout.questions || [];

    const exportData = {
      schemaVersion: "2.0",
      source: "PaperGenerator Offline Examination Platform",
      exportedAt: new Date().toISOString(),
      paper: {
        id: paper.id,
        title: paper.title,
        examCode: paper.examCode,
        schoolName: paper.schoolName,
        schoolLogoUrl: paper.schoolLogoUrl,
        instructions: paper.instructions,
        watermark: paper.watermark,
        maxMarks: paper.maxMarks,
        currentMarks: paper.currentMarks,
        durationMinutes: paper.durationMinutes,
        examDate: paper.examDate,
        examTime: paper.examTime,
        status: paper.status,
        settings: layout.settings || {},
      },
      questions: questions.map((q, idx) => ({
        questionNumber: String(q.questionNumber || idx + 1),
        questionText: q.questionText || q.question_text || "",
        options: typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [],
        correctAnswer: q.correctAnswer || "",
        explanation: q.explanation || "",
        marks: q.marks || 1,
        difficulty: q.difficulty || "MEDIUM",
        diagrams: typeof q.diagramsJson === "string" ? JSON.parse(q.diagramsJson) : q.diagrams || [],
      })),
    };

    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_export.json"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export Question Paper to PDF via PyMuPDF AI Engine
router.get("/:id/export/pdf", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { withAnswers } = req.query;
    const paper = await prisma.questionPaper.findUnique({ where: { id } });

    if (!paper) {
      res.status(404).json({ error: "Question paper not found" });
      return;
    }

    const layout = JSON.parse(paper.canvasLayoutJson || "{}");
    const questions: any[] = layout.questions || [];

    const paperData = {
      title: paper.title,
      examCode: paper.examCode,
      schoolName: paper.schoolName,
      maxMarks: paper.maxMarks,
      durationMinutes: paper.durationMinutes,
      examDate: paper.examDate,
      instructions: paper.instructions,
      questions: questions.map((q, idx) => ({
        questionNumber: String(q.questionNumber || idx + 1),
        questionText: q.questionText || q.question_text || "",
        options: typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [],
        correctAnswer: q.correctAnswer || "",
        explanation: q.explanation || "",
        marks: q.marks || 1,
      })),
    };

    const aiRes = await axios.post(
      `${config.AI_SERVICE_URL}/api/export/paper-pdf`,
      {
        paper_data: paperData,
        include_answers: withAnswers === "true" || withAnswers === "1",
      },
      { responseType: "stream" }
    );

    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    aiRes.data.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import Question Paper from JSON File or Payload
router.post("/import/json", async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body;
    const pData = payload.paper || payload;
    const questionsList = payload.questions || pData.questions || [];

    if (!pData.title) {
      res.status(400).json({ error: "Paper title is required in import JSON" });
      return;
    }

    const uniqueSuffix = Date.now().toString(36).toUpperCase();
    const examCode = pData.examCode ? `${pData.examCode}-IMP` : `EXAM-${uniqueSuffix}`;

    const canvasLayout = {
      settings: pData.settings || {},
      questions: questionsList.map((q: any, idx: number) => ({
        id: `q-imp-${idx + 1}-${Date.now()}`,
        questionNumber: String(q.questionNumber || idx + 1),
        questionText: q.questionText || q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: String(q.correctAnswer || q.answer || "").toUpperCase(),
        explanation: q.explanation || "",
        marks: parseInt(q.marks || 1, 10) || 1,
        difficulty: q.difficulty || "MEDIUM",
        diagrams: Array.isArray(q.diagrams) ? q.diagrams : [],
      })),
    };

    const totalMarks = canvasLayout.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

    const paper = await prisma.questionPaper.create({
      data: {
        title: pData.title.endsWith("(Imported)") ? pData.title : `${pData.title} (Imported)`,
        examCode,
        schoolName: pData.schoolName || "DELHI PUBLIC SCHOOL",
        schoolLogoUrl: pData.schoolLogoUrl || "",
        instructions: pData.instructions || "1. Answer all questions.",
        watermark: pData.watermark || "",
        maxMarks: pData.maxMarks || totalMarks || 100,
        currentMarks: totalMarks,
        durationMinutes: pData.durationMinutes || 180,
        examDate: pData.examDate || new Date().toISOString().split("T")[0],
        examTime: pData.examTime || "10:00 AM - 01:00 PM",
        status: "DRAFT",
        canvasLayoutJson: JSON.stringify(canvasLayout),
        creatorId: req.user!.id,
      },
    });

    await StorageSyncService.syncPaperToDisk(paper.id);

    await logAuditAction(req.user!.id, "IMPORT_PAPER_JSON", "PAPER", paper.id, {
      title: paper.title,
      questionsCount: canvasLayout.questions.length,
    });

    res.status(201).json({
      status: "SUCCESS",
      paper,
      message: `Imported paper "${paper.title}" with ${canvasLayout.questions.length} questions successfully!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
