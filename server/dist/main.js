"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const config_1 = require("./config");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const questions_routes_1 = __importDefault(require("./routes/questions.routes"));
const snips_routes_1 = __importDefault(require("./routes/snips.routes"));
const papers_routes_1 = __importDefault(require("./routes/papers.routes"));
const omr_routes_1 = __importDefault(require("./routes/omr.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const learning_routes_1 = __importDefault(require("./routes/learning.routes"));
const scientific_routes_1 = __importDefault(require("./routes/scientific.routes"));
const security_routes_1 = __importDefault(require("./routes/security.routes"));
const prisma_1 = require("./prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const storageSync_service_1 = require("./services/storageSync.service");
const securitySettings_service_1 = require("./services/securitySettings.service");
const rbac_service_1 = require("./services/rbac.service");
const app = (0, express_1.default)();
// 1. Request Correlation & Tracing Middleware (Section 28)
app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || (0, uuid_1.v4)();
    const correlationId = req.headers["x-correlation-id"] || requestId;
    req.requestId = requestId;
    req.correlationId = correlationId;
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Correlation-Id", correlationId);
    next();
});
// 2. Modern Cyber Threat Security Headers (Section 29)
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:;");
    next();
});
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// 3. Layered Progressive Rate Limiter (Section 8)
const authAttempts = new Map();
const layeredRateLimiter = (maxReqs = 30, windowMs = 5 * 60 * 1000) => {
    return (req, res, next) => {
        const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
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
const dataDir = path_1.default.resolve(config_1.config.DATA_DIR);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
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
    const subPath = path_1.default.join(dataDir, sub);
    if (!fs_1.default.existsSync(subPath)) {
        fs_1.default.mkdirSync(subPath, { recursive: true });
    }
}
app.use("/data", express_1.default.static(dataDir));
app.use("/storage", express_1.default.static(dataDir));
// 5. Register API routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/security", security_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/documents", documents_routes_1.default);
app.use("/api", questions_routes_1.default);
app.use("/api/snips", snips_routes_1.default);
app.use("/api/papers", papers_routes_1.default);
app.use("/api/omr", omr_routes_1.default);
app.use("/api/system", system_routes_1.default);
app.use("/api/audit-logs", audit_routes_1.default);
app.use("/api/learning", learning_routes_1.default);
app.use("/api/scientific", scientific_routes_1.default);
app.get("/health", (req, res) => {
    res.json({
        status: "HEALTHY",
        service: "PaperGenerator Node.js Backend API",
        version: "1.0.0",
        database: "SQLite (Prisma ORM)",
    });
});
// 6. Global Error Handler (Section 33: Safe errors without leaking internal secrets/stack traces)
app.use((err, req, res, next) => {
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
        await securitySettings_service_1.SecuritySettingsService.initDefaults();
        await rbac_service_1.RbacService.initRoleDefaults();
        const userCount = await prisma_1.prisma.user.count();
        if (userCount === 0) {
            console.log("No users found. Seeding default administrator account...");
            const salt = await bcryptjs_1.default.genSalt(10);
            const hash = await bcryptjs_1.default.hash("Admin@12345", salt);
            const admin = await prisma_1.prisma.user.create({
                data: {
                    email: "admin@school.local",
                    fullName: "System Administrator",
                    passwordHash: hash,
                    role: "SUPER_ADMIN",
                },
            });
            // Default folder taxonomy
            const class10 = await prisma_1.prisma.folder.create({
                data: { name: "Class 10", type: "CLASS" },
            });
            const math = await prisma_1.prisma.folder.create({
                data: { name: "Mathematics", type: "SUBJECT", parentId: class10.id },
            });
            const algebra = await prisma_1.prisma.folder.create({
                data: { name: "Algebra", type: "CHAPTER", parentId: math.id },
            });
            await prisma_1.prisma.folder.create({
                data: { name: "Quadratic Equations", type: "TOPIC", parentId: algebra.id },
            });
            console.log(`Default administrator created: ${admin.email} (Password: Admin@12345)`);
        }
        // Auto-restore any existing papers from physical storage (data/Bank/Qpapers) if database is empty
        await storageSync_service_1.StorageSyncService.restorePapersFromDiskIfEmpty();
        // Synchronize Questions & Question Papers to physical disk storage (data/Bank)
        storageSync_service_1.StorageSyncService.syncAllToDisk().then((res) => {
            console.log(`[Storage Sync] Synced ${res.questionsSummary.syncedQuestions} questions and ${res.papersSummary.syncedPapers} papers to ${res.bankPath}`);
        }).catch((err) => {
            console.error("[Storage Sync Error]:", err.message);
        });
    }
    catch (err) {
        console.error("Database initialization check error:", err);
    }
};
initDatabase().then(() => {
    const port = Number(config_1.config.PORT) || 5010;
    app.listen(port, '0.0.0.0', () => {
        console.log(`Backend Server listening at http://localhost:${port}`);
        console.log(`Connected to AI Microservice at ${config_1.config.AI_SERVICE_URL}`);
    });
});
