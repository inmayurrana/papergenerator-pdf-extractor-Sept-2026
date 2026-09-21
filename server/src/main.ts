import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import documentsRoutes from "./routes/documents.routes";
import questionsRoutes from "./routes/questions.routes";
import snipsRoutes from "./routes/snips.routes";
import papersRoutes from "./routes/papers.routes";
import omrRoutes from "./routes/omr.routes";
import systemRoutes from "./routes/system.routes";
import auditRoutes from "./routes/audit.routes";
import learningRoutes from "./routes/learning.routes";
import scientificRoutes from "./routes/scientific.routes";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { StorageSyncService } from "./services/storageSync.service";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static data serving (diagrams, snips, omr images, documents)
const dataDir = path.resolve(config.DATA_DIR);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
app.use("/data", express.static(dataDir));

// Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api", questionsRoutes);
app.use("/api/snips", snipsRoutes);
app.use("/api/papers", papersRoutes);
app.use("/api/omr", omrRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/scientific", scientificRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "HEALTHY",
    service: "PaperGenerator Node.js Backend API",
    version: "1.0.0",
    database: "SQLite (Prisma ORM)",
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Auto-seed admin on first start if needed
const initDatabase = async () => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("No users found. Seeding default administrator account...");
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("Admin@12345", salt);

      const admin = await prisma.user.create({
        data: {
          email: "admin@school.local",
          fullName: "System Administrator",
          passwordHash: hash,
          role: "SUPER_ADMIN",
        },
      });

      // Default folder taxonomy
      const class10 = await prisma.folder.create({
        data: { name: "Class 10", type: "CLASS" },
      });
      const math = await prisma.folder.create({
        data: { name: "Mathematics", type: "SUBJECT", parentId: class10.id },
      });
      const algebra = await prisma.folder.create({
        data: { name: "Algebra", type: "CHAPTER", parentId: math.id },
      });
      await prisma.folder.create({
        data: { name: "Quadratic Equations", type: "TOPIC", parentId: algebra.id },
      });

      console.log(`Default administrator created: ${admin.email} (Password: Admin@12345)`);
    }

    // Auto-restore any existing papers from physical storage (D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers) if database is empty
    await StorageSyncService.restorePapersFromDiskIfEmpty();

    // Synchronize Questions & Question Papers to physical disk storage (D:\Recovered_school_app\PAPERGENERATOR\data\Bank)
    StorageSyncService.syncAllToDisk().then((res) => {
      console.log(`[Storage Sync] Synced ${res.questionsSummary.syncedQuestions} questions and ${res.papersSummary.syncedPapers} papers to ${res.bankPath}`);
    }).catch((err) => {
      console.error("[Storage Sync Error]:", err.message);
    });
  } catch (err) {
    console.error("Database initialization check error:", err);
  }
};

initDatabase().then(() => {
  const port = Number(config.PORT) || 5010;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend Server listening at http://localhost:${port}`);
    console.log(`Connected to AI Microservice at ${config.AI_SERVICE_URL}`);
  });
});
