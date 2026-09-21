"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
const prisma_1 = require("./prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const storageSync_service_1 = require("./services/storageSync.service");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// Static data serving (diagrams, snips, omr images, documents)
const dataDir = path_1.default.resolve(config_1.config.DATA_DIR);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
app.use("/data", express_1.default.static(dataDir));
// Register API routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/documents", documents_routes_1.default);
app.use("/api", questions_routes_1.default);
app.use("/api/snips", snips_routes_1.default);
app.use("/api/papers", papers_routes_1.default);
app.use("/api/omr", omr_routes_1.default);
app.use("/api/system", system_routes_1.default);
app.use("/api/audit-logs", audit_routes_1.default);
app.use("/api/learning", learning_routes_1.default);
app.get("/health", (req, res) => {
    res.json({
        status: "HEALTHY",
        service: "PaperGenerator Node.js Backend API",
        version: "1.0.0",
        database: "SQLite (Prisma ORM)",
    });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});
// Auto-seed admin on first start if needed
const initDatabase = async () => {
    try {
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
        // Auto-restore any existing papers from physical storage (D:\Recovered_school_app\PAPERGENERATOR\data\Bank\Qpapers) if database is empty
        await storageSync_service_1.StorageSyncService.restorePapersFromDiskIfEmpty();
        // Synchronize Questions & Question Papers to physical disk storage (D:\Recovered_school_app\PAPERGENERATOR\data\Bank)
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
