"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJwt);
// Get real-time system hardware usage (CPU %, RAM MB, VRAM, active jobs, loaded models)
router.get("/resources", async (req, res) => {
    try {
        const aiRes = await axios_1.default.get(`${config_1.config.AI_SERVICE_URL}/api/resource-status`);
        res.json(aiRes.data);
    }
    catch (err) {
        res.status(500).json({
            error: "AI Service offline or unreachable",
            details: err.message,
        });
    }
});
// List all installed and configured AI / OCR engine adapters
router.get("/models", async (req, res) => {
    try {
        const aiRes = await axios_1.default.get(`${config_1.config.AI_SERVICE_URL}/api/models`);
        res.json({ models: aiRes.data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Manually unload models to release RAM/VRAM immediately
router.post("/models/unload", (0, auth_1.requireRole)(["SUPER_ADMIN", "ADMIN"]), async (req, res) => {
    try {
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/models/unload`);
        await (0, audit_1.logAuditAction)(req.user.id, "UNLOAD_MODELS", "SYSTEM", null, { action: "MANUAL_MEMORY_RELEASE" });
        res.json(aiRes.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
