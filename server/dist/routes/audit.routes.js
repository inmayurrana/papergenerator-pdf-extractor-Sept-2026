"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJwt);
// Get audit logs (Admins only)
router.get("/", (0, auth_1.requireRole)(["SUPER_ADMIN", "ADMIN"]), async (req, res) => {
    try {
        const { action, resourceType, userId, limit } = req.query;
        const where = {};
        if (action)
            where.action = action;
        if (resourceType)
            where.resourceType = resourceType;
        if (userId)
            where.userId = userId;
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, fullName: true, role: true } },
            },
            orderBy: { timestamp: "desc" },
            take: limit ? parseInt(limit, 10) : 100,
        });
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
