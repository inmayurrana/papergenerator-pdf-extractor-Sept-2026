import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { config } from "../config";

export class StorageSyncService {
  private static getBaseBankDir(): string {
    const dataDir = path.resolve(config.DATA_DIR);
    const bankDir = path.join(dataDir, "Bank");
    if (!fs.existsSync(bankDir)) {
      fs.mkdirSync(bankDir, { recursive: true });
    }
    return bankDir;
  }

  private static getQuestionsBankDir(): string {
    const dir = path.join(this.getBaseBankDir(), "QuestionsBank");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static getQPapersDir(): string {
    const dir = path.join(this.getBaseBankDir(), "Qpapers");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static sanitize(str: string = ""): string {
    return str.replace(/[\\/:*?"<>|]/g, "_").trim() || "General";
  }

  public static resolveImageToBase64(imgUrl?: string | null): string | null {
    if (!imgUrl || typeof imgUrl !== "string") return null;
    if (imgUrl.startsWith("data:image/")) return imgUrl;

    try {
      let cleanPath = imgUrl.replace(/^[/\\]+/, "");
      if (cleanPath.startsWith("api/")) cleanPath = cleanPath.substring(4);
      if (cleanPath.startsWith("data/")) cleanPath = cleanPath.substring(5);

      const candidates = [
        path.resolve(config.DATA_DIR, cleanPath),
        path.resolve(config.DATA_DIR, "diagrams", path.basename(cleanPath)),
        path.resolve(config.DATA_DIR, "uploads", path.basename(cleanPath)),
        path.resolve(process.cwd(), "data", cleanPath),
        path.resolve(process.cwd(), "data", "diagrams", path.basename(cleanPath)),
        path.resolve(process.cwd(), "data", "uploads", path.basename(cleanPath)),
        path.resolve(process.cwd(), "..", "data", cleanPath),
        path.resolve(process.cwd(), "..", "data", "diagrams", path.basename(cleanPath)),
        path.resolve(process.cwd(), "..", "data", "uploads", path.basename(cleanPath)),
        path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data", cleanPath),
        path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/diagrams", path.basename(cleanPath)),
        path.resolve("D:/Recovered_school_app/PAPERGENERATOR/data/uploads", path.basename(cleanPath)),
        path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data", cleanPath),
        path.resolve("D:/Recovered_school_app/PAPERGENERATOR/server/data/diagrams", path.basename(cleanPath)),
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
      console.warn("Could not resolve image to base64 for storage sync:", imgUrl, e.message);
    }

    return imgUrl;
  }

  /**
   * Resolves the Class and Subject names for a given Folder
   */
  private static async resolveFolderHierarchy(folderId: string | null): Promise<{ className: string; subjectName: string }> {
    if (!folderId) {
      return { className: "General", subjectName: "General" };
    }

    try {
      let f: any = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!f) return { className: "General", subjectName: "General" };

      let className = "General";
      let subjectName = "General";

      while (f) {
        if (f.type === "CLASS") {
          className = this.sanitize(f.name);
        } else if (f.type === "SUBJECT" && subjectName === "General") {
          subjectName = this.sanitize(f.name);
        }
        if (f.parentId) {
          f = await prisma.folder.findUnique({ where: { id: f.parentId } });
        } else {
          break;
        }
      }

      return { className, subjectName };
    } catch {
      return { className: "General", subjectName: "General" };
    }
  }

  /**
   * Sync all Questions from Database to D:\Recovered_school_app\PAPERGENERATOR\data\Bank\QuestionsBank\<Class>\<Subject>\
   */
  public static async syncAllQuestionsToDisk(): Promise<{ syncedClasses: number; syncedQuestions: number; targetDir: string }> {
    const questions = await prisma.question.findMany({
      include: { folder: true },
      orderBy: { createdAt: "asc" },
    });

    const grouped: { [key: string]: { className: string; subjectName: string; questions: any[] } } = {};

    for (const q of questions) {
      const { className, subjectName } = await this.resolveFolderHierarchy(q.folderId);
      const groupKey = `${className}___${subjectName}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = { className, subjectName, questions: [] };
      }
      grouped[groupKey].questions.push(q);
    }

    const qBankBaseDir = this.getQuestionsBankDir();

    for (const groupKey of Object.keys(grouped)) {
      const { className, subjectName, questions: groupQs } = grouped[groupKey];
      const targetDir = path.join(qBankBaseDir, className, subjectName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 1. Write structured JSON
      const jsonExport = groupQs.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: JSON.parse(q.optionsJson || "[]"),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks,
        difficulty: q.difficulty,
        diagrams: JSON.parse(q.diagramsJson || "[]"),
        tags: JSON.parse(q.tagsJson || "[]"),
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }));

      fs.writeFileSync(path.join(targetDir, "questions.json"), JSON.stringify(jsonExport, null, 2), "utf8");

      // 2. Write UTF-8 BOM CSV (Excel Compatible)
      const escapeCsv = (str: string = "") => `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      const headers = ["Q#", "Question Text", "Option (1)", "Option (2)", "Option (3)", "Option (4)", "Correct Answer", "Marks", "Difficulty", "Explanation"];
      const rows = groupQs.map((q) => {
        const opts = JSON.parse(q.optionsJson || "[]");
        return [
          escapeCsv(q.questionNumber),
          escapeCsv(q.questionText),
          escapeCsv(opts[0]?.text || ""),
          escapeCsv(opts[1]?.text || ""),
          escapeCsv(opts[2]?.text || ""),
          escapeCsv(opts[3]?.text || ""),
          escapeCsv(q.correctAnswer),
          q.marks,
          escapeCsv(q.difficulty),
          escapeCsv(q.explanation),
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      fs.writeFileSync(path.join(targetDir, "questions.csv"), csvContent, "utf8");
    }

    return {
      syncedClasses: Object.keys(grouped).length,
      syncedQuestions: questions.length,
      targetDir: qBankBaseDir,
    };
  }

  /**
   * Sync a single Question Paper to D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers\<Class>\<Subject>\
   */
  public static async syncPaperToDisk(paperId: string): Promise<string | null> {
    const paper = await prisma.questionPaper.findUnique({ where: { id: paperId } });
    if (!paper) return null;

    const layout = JSON.parse(paper.canvasLayoutJson || "{}");
    const settings = layout.settings || {};
    const className = this.sanitize(settings.className || "Class 12");
    const subjectName = this.sanitize(settings.subjectName || "Physics");
    const questions: any[] = layout.questions || [];

    const targetDir = path.join(this.getQPapersDir(), className, subjectName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeTitle = this.sanitize(paper.title);
    const safeExamCode = this.sanitize(paper.examCode);
    const baseFileName = `${safeTitle}_${safeExamCode}`;

    // 1. Write structured JSON
    const jsonPayload = {
      id: paper.id,
      title: paper.title,
      examCode: paper.examCode,
      schoolName: paper.schoolName,
      className,
      subjectName,
      maxMarks: paper.maxMarks,
      durationMinutes: paper.durationMinutes,
      examDate: paper.examDate,
      examTime: paper.examTime,
      instructions: paper.instructions,
      status: paper.status,
      canvasLayout: layout,
      questions,
      updatedAt: paper.updatedAt,
    };
    fs.writeFileSync(path.join(targetDir, `${baseFileName}.json`), JSON.stringify(jsonPayload, null, 2), "utf8");

    // 2. Write CSV / Excel
    const escapeCsv = (str: string = "") => `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const headerMetadata = [
      `"EXAMINATION QUESTION PAPER"`,
      `"School / Institute:","${paper.schoolName}"`,
      `"Paper Title:","${paper.title}"`,
      `"Exam Code:","${paper.examCode}"`,
      `"Class & Subject:","${className} > ${subjectName}"`,
      `"Maximum Marks:","${paper.maxMarks}"`,
      `"Duration:","${paper.durationMinutes} Minutes"`,
      `"Instructions:","${paper.instructions.replace(/\r?\n/g, " | ")}"`,
      `""`,
    ];
    const tableHeaders = ["Q#", "Question Text", "Option (1)", "Option (2)", "Option (3)", "Option (4)", "Correct Answer", "Marks"];
    const rows = questions.map((q, idx) => {
      const opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [];
      const showMarks = (q.hideMarks !== undefined ? !q.hideMarks : (settings.showQuestionMarks !== false)) && Number(q.marks) > 0;
      const showOpts = (q.hideOptions !== undefined ? !q.hideOptions : !settings.hideAllOptions);
      return [
        `"Q${idx + 1}"`,
        escapeCsv(q.questionText || q.question_text || ""),
        showOpts ? escapeCsv(opts[0]?.text || "") : `""`,
        showOpts ? escapeCsv(opts[1]?.text || "") : `""`,
        showOpts ? escapeCsv(opts[2]?.text || "") : `""`,
        showOpts ? escapeCsv(opts[3]?.text || "") : `""`,
        escapeCsv(q.correctAnswer || ""),
        showMarks ? (q.marks || 1) : `""`,
      ].join(",");
    });
    const csvContent = "\uFEFF" + [...headerMetadata, tableHeaders.join(","), ...rows].join("\r\n");
    fs.writeFileSync(path.join(targetDir, `${baseFileName}.csv`), csvContent, "utf8");

    // 3. Write Word (.doc) with Base64 embedded images
    const schoolLogoUrl = paper.schoolLogoUrl || settings.schoolLogoUrl;
    const schoolLogoB64 = this.resolveImageToBase64(schoolLogoUrl);

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

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${paper.title}</title>
        <style>
          body { font-family: ${fontFamilyCss}; font-size: ${bodyFontSize}; line-height: 1.35; color: #000; margin: 0.8in; }
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
        ${schoolLogoB64 ? `
          <div style="text-align: center; margin-bottom: 8pt;">
            <img src="${schoolLogoB64}" style="max-height: 60pt; max-width: 150pt; width: auto;" alt="School Logo" />
          </div>
        ` : ''}
        <div class="school-title">${paper.schoolName || "DELHI PUBLIC SCHOOL"}</div>
        <div class="exam-title">${paper.title}</div>
        <table class="meta-table">
          <tr>
            <td><strong>CLASS & SUBJECT:</strong> ${className} &gt; ${subjectName}</td>
            <td style="text-align:center;"><strong>TIME:</strong> ${paper.durationMinutes} MINS</td>
            <td style="text-align:right;"><strong>MAX MARKS:</strong> ${paper.maxMarks}</td>
          </tr>
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
          </table>
          ${paper.instructions ? `<div class="instructions"><strong>General Instructions:</strong><br/>${paper.instructions.replace(/\n/g, "<br/>")}</div>` : ""}
        </div>

        <div class="questions-container">
          ${(() => {
            let qCounter = 0;
            return questions
              .map((q) => {
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
                const opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.options || [];
                const diagrams = typeof q.diagramsJson === "string" ? JSON.parse(q.diagramsJson) : q.diagrams || [];
                const showMarks = (q.hideMarks !== undefined ? !q.hideMarks : (settings.showQuestionMarks !== false)) && Number(q.marks) > 0;
                const showOpts = (q.hideOptions !== undefined ? !q.hideOptions : !settings.hideAllOptions) && opts.length > 0;
                const blankLines = q.blankLinesCount !== undefined && q.blankLinesCount !== null
                  ? q.blankLinesCount
                  : (q.blankSpaceHeight ? Math.round(q.blankSpaceHeight / 22) : 0);

                return `
              <div class="question-block" ${q.customFontSize ? `style="font-size: ${q.customFontSize}pt;"` : ''}>
                <div class="q-stem">
                  ${showMarks ? `<span class="q-marks">[${q.marks || 1} Mark${(q.marks || 1) > 1 ? "s" : ""}]</span>` : ""}
                  <strong>Q${currentQNum}.</strong> ${q.questionText || q.question_text || ""}
                </div>

                ${diagrams.length > 0 ? `
                  <div class="diagram-container">
                    ${diagrams.map((d: any) => {
                      const imgUrl = typeof d === "string" ? d : d.relative_url || d.url || "";
                      const b64 = StorageSyncService.resolveImageToBase64(imgUrl);
                      return b64 ? `<img src="${b64}" class="diagram-img" alt="Figure" />` : "";
                    }).join("")}
                  </div>
                ` : ""}

                ${
                  showOpts
                    ? `
                  <div class="options-grid">
                    ${opts
                      .map((opt: any) => {
                        const optB64 = StorageSyncService.resolveImageToBase64(opt.imageUrl);
                        return `
                          <span class="opt-item">
                            <strong>(${opt.key})</strong> ${opt.text || ""}
                            ${optB64 ? `<br/><img src="${optB64}" class="opt-img" alt="Option Image" />` : ""}
                          </span>
                        `;
                      })
                      .join("")}
                  </div>
                `
                    : ""
                }

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
              })
              .join("");
          })()}
        </div>
      </body>
      </html>
    `;
    fs.writeFileSync(path.join(targetDir, `${baseFileName}.doc`), wordHtml, "utf8");

    return path.join(targetDir, baseFileName);
  }

  /**
   * Sync all Question Papers from Database to D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers\<Class>\<Subject>\
   */
  public static async syncAllPapersToDisk(): Promise<{ syncedPapers: number; targetDir: string }> {
    const papers = await prisma.questionPaper.findMany();
    for (const p of papers) {
      await this.syncPaperToDisk(p.id);
    }
    return {
      syncedPapers: papers.length,
      targetDir: this.getQPapersDir(),
    };
  }

  /**
   * Full Sync for both Questions and Papers to Physical Storage
   */
  public static async syncAllToDisk(): Promise<{
    questionsSummary: { syncedClasses: number; syncedQuestions: number; targetDir: string };
    papersSummary: { syncedPapers: number; targetDir: string };
    bankPath: string;
  }> {
    const questionsSummary = await this.syncAllQuestionsToDisk();
    const papersSummary = await this.syncAllPapersToDisk();
    return {
      questionsSummary,
      papersSummary,
      bankPath: this.getBaseBankDir(),
    };
  }

  /**
   * Automatically import and restore any existing Question Papers found on physical disk
   * (D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers\...) into the Database if table is empty.
   */
  public static async restorePapersFromDiskIfEmpty(): Promise<number> {
    try {
      const existingCount = await prisma.questionPaper.count();
      if (existingCount > 0) return existingCount;

      const qpapersDir = this.getQPapersDir();
      if (!fs.existsSync(qpapersDir)) return 0;

      const defaultAdmin = await prisma.user.findFirst();
      if (!defaultAdmin) return 0;

      const jsonFiles: string[] = [];
      const findJsonFiles = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            findJsonFiles(full);
          } else if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith(".")) {
            jsonFiles.push(full);
          }
        }
      };
      findJsonFiles(qpapersDir);

      let imported = 0;
      for (const filePath of jsonFiles) {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
          const title = content.title && content.title.trim() ? content.title.trim() : "Examination Paper";
          const examCode = content.examCode && content.examCode.trim() ? content.examCode.trim() : "EXAM-101";
          const existing = await prisma.questionPaper.findFirst({
            where: { title, examCode },
          });
          if (!existing) {
            await prisma.questionPaper.create({
              data: {
                title,
                examCode,
                schoolName: content.schoolName || "DELHI PUBLIC SCHOOL",
                maxMarks: Number(content.maxMarks) || 70,
                currentMarks: Number(content.currentMarks) || 0,
                durationMinutes: Number(content.durationMinutes) || 180,
                examDate: content.examDate || new Date().toISOString().split("T")[0],
                examTime: content.examTime || "09:00 AM - 12:00 PM",
                instructions: content.instructions || "",
                status: content.status || "DRAFT",
                canvasLayoutJson: JSON.stringify(content.canvasLayout || { questions: content.questions || [] }),
                creatorId: defaultAdmin.id,
              },
            });
            imported++;
          }
        } catch (err: any) {
          console.warn(`Could not parse paper from ${filePath}:`, err.message);
        }
      }

      console.log(`[Storage Restore] Restored ${imported} question papers from disk into Database!`);
      return imported;
    } catch (e: any) {
      console.error("[Storage Restore Error]:", e.message);
      return 0;
    }
  }
}
