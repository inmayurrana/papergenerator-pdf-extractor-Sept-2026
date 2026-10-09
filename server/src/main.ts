import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
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
import securityRoutes from "./routes/security.routes";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { StorageSyncService } from "./services/storageSync.service";
import { SecuritySettingsService } from "./services/securitySettings.service";
import { RbacService } from "./services/rbac.service";

const app = express();

// 1. Request Correlation & Tracing Middleware (Section 28)
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  const correlationId = (req.headers["x-correlation-id"] as string) || requestId;

  (req as any).requestId = requestId;
  (req as any).correlationId = correlationId;

  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Correlation-Id", correlationId);
  next();
});

// 2. Modern Cyber Threat Security Headers (Section 29)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:;"
  );
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// 3. Layered Progressive Rate Limiter (Section 8)
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const layeredRateLimiter = (maxReqs = 30, windowMs = 5 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";
    const key = `${clientIp}:${req.path}`;
    const now = Date.now();

    const entry = authAttempts.get(key);
    if (!entry || now > entry.resetAt) {
      authAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxReqs) {
      const waitSec = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        error: `Too many requests from this network. Please wait ${Math.ceil(waitSec / 60)} minute(s) before trying again.`,
        remainingSeconds: waitSec,
      });
      return;
    }

    entry.count++;
    next();
  };
};

app.use("/api/auth/login", layeredRateLimiter(25, 5 * 60 * 1000));
app.use("/api/auth/refresh", layeredRateLimiter(60, 5 * 60 * 1000));
app.use("/api/auth/google/callback", layeredRateLimiter(30, 5 * 60 * 1000));
app.use("/api/auth/captcha/challenge", layeredRateLimiter(45, 5 * 60 * 1000));

// 4. Static data serving (diagrams, snips, omr images, documents, uploads, Bank)
const dataDir = path.resolve(config.DATA_DIR);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const storageSubdirs = [
  "uploads",
  "documents",
  "diagrams",
  "snips",
  "omr",
  "exports",
  "formulas",
  "Bank",
  "Bank/QuestionsBank",
  "Bank/Qpapers",
];
for (const sub of storageSubdirs) {
  const subPath = path.join(dataDir, sub);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
  }
}
app.use("/data", express.static(dataDir));
app.use("/storage", express.static(dataDir));

// 5. Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/security", securityRoutes);
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

// 6. Global Error Handler (Section 33: Safe errors without leaking internal secrets/stack traces)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle Multer upload errors gracefully
  if (err instanceof multer.MulterError || err?.name === "MulterError") {
    console.warn(`[Multer Error] ${err.code}: ${err.message} (field: ${err.field})`);
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxMb = Math.round(config.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));
      res.status(413).json({
        error: `Uploaded file exceeds the maximum allowed limit of ${maxMb}MB. Please compress the document or upload a smaller file.`,
        code: "LIMIT_FILE_SIZE",
        maxSizeMb: maxMb,
        field: err.field,
      });
      return;
    }
    res.status(400).json({
      error: `File upload failed: ${err.message}`,
      code: err.code,
      field: err.field,
    });
    return;
  }

  console.error("Unhandled Server Error:", err);
  const safeMessage = process.env.NODE_ENV === "production"
    ? "An unexpected system error occurred. Please try again."
    : err.message || "Internal Server Error";
  res.status(err.status || 500).json({
    error: safeMessage,
  });
});

// Auto-seed admin and default RBAC matrix on first start if needed
const initDatabase = async () => {
  try {
    // 0. Initialize default security settings & RBAC defaults
    await SecuritySettingsService.initDefaults();
    await RbacService.initRoleDefaults();

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

    // Auto-restore any existing papers from physical storage (data/Bank/Qpapers) if database is empty
    await StorageSyncService.restorePapersFromDiskIfEmpty();

    // Synchronize Questions & Question Papers to physical disk storage (data/Bank)
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
