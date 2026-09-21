"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const router = (0, express_1.Router)();
const generateTokens = (user) => {
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.JWT_SECRET, { expiresIn: "8h" });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, config_1.config.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    return { token, refreshToken };
};
// Seed default offline admin if no users exist
router.post("/seed-admin", async (req, res) => {
    try {
        const count = await prisma_1.prisma.user.count();
        if (count > 0) {
            res.json({ message: "Users already exist. Seed skipped." });
            return;
        }
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
        // Seed default sample folder hierarchy (Class 10 -> Mathematics -> Algebra -> Quadratic Equations)
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
        await (0, audit_1.logAuditAction)(admin.id, "SEED_ADMIN", "USER", admin.id, { email: admin.email });
        res.json({ message: "Default Administrator & Class Folders created successfully!", email: admin.email });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.isActive) {
            res.status(401).json({ error: "Invalid credentials or account deactivated" });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const { token, refreshToken } = generateTokens(user);
        await (0, audit_1.logAuditAction)(user.id, "LOGIN", "USER", user.id, { email: user.email });
        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/me", auth_1.authenticateJwt, async (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
