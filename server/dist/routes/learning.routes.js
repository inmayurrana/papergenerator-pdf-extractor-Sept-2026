"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Record a correction and learn token/formula rules
router.post("/learn", auth_1.authenticateJwt, async (req, res) => {
    try {
        const { raw_text, corrected_text, image_path, context_domain } = req.body;
        if (!raw_text || !corrected_text) {
            return res.status(400).json({ error: "raw_text and corrected_text are required" });
        }
        const aiRes = await axios_1.default.post(`${config_1.config.AI_SERVICE_URL}/api/learning/learn`, {
            raw_text,
            corrected_text,
            image_path,
            context_domain: context_domain || "GENERAL",
        });
        res.json(aiRes.data);
    }
    catch (err) {
        console.error("Learning error:", err.message);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Get learned rules and stats
router.get("/patterns", auth_1.authenticateJwt, async (req, res) => {
    try {
        const aiRes = await axios_1.default.get(`${config_1.config.AI_SERVICE_URL}/api/learning/patterns`);
        res.json(aiRes.data);
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
// Delete a learned rule
router.delete("/patterns/:id", auth_1.authenticateJwt, async (req, res) => {
    try {
        const aiRes = await axios_1.default.delete(`${config_1.config.AI_SERVICE_URL}/api/learning/patterns/${req.params.id}`);
        res.json(aiRes.data);
    }
    catch (err) {
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});
exports.default = router;
