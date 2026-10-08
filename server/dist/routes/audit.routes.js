"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJwt);
/**
 * GET /api/audit-logs
 * Filterable stream of all application activities with actor, IP, User-Agent, and status
 */
router.get("/", (0, auth_1.requireRole)(["SUPER_ADMIN", "ADMIN"]), async (req, res) => {
    try {
        const { action, resourceType, userId, status, search, limit } = req.query;
        const where = {};
        if (action)
            where.action = action;
        if (resourceType)
            where.resourceType = resourceType;
        if (userId)
            where.userId = userId;
        if (status)
            where.status = status;
        if (search && typeof search === "string" && search.trim()) {
            const q = search.trim();
            where.OR = [
                { action: { contains: q } },
                { resourceType: { contains: q } },
                { ipAddress: { contains: q } },
                { userAgent: { contains: q } },
                { user: { fullName: { contains: q } } },
                { user: { email: { contains: q } } },
            ];
        }
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, fullName: true, role: true } },
            },
            orderBy: { timestamp: "desc" },
            take: limit ? parseInt(limit, 10) : 150,
        });
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/audit-logs/stats
 * Summary metrics of security and user activity events
 */
router.get("/stats", (0, auth_1.requireRole)(["SUPER_ADMIN", "ADMIN"]), async (req, res) => {
    try {
        const now = new Date();
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [totalEvents, securityEvents24h, blockedEvents24h, failedEvents24h] = await Promise.all([
            prisma_1.prisma.auditLog.count(),
            prisma_1.prisma.auditLog.count({
                where: {
                    resourceType: { in: ["AUTH", "SECURITY"] },
                    timestamp: { gte: past24h },
                },
            }),
            prisma_1.prisma.auditLog.count({
                where: {
                    status: "BLOCKED",
                    timestamp: { gte: past24h },
                },
            }),
            prisma_1.prisma.auditLog.count({
                where: {
                    status: "FAILED",
                    timestamp: { gte: past24h },
                },
            }),
        ]);
        res.json({
            totalEvents,
            securityEvents24h,
            blockedEvents24h,
            failedEvents24h,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/audit-logs/export
 * Downloads the full audit log in CSV format for compliance auditing
 */
router.get("/export", (0, auth_1.requireRole)(["SUPER_ADMIN", "ADMIN"]), async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            include: {
                user: { select: { email: true, fullName: true, role: true } },
            },
            orderBy: { timestamp: "desc" },
            take: 2000,
        });
        const headers = [
            "Timestamp",
            "Action",
            "Resource Type",
            "Resource ID",
            "Status",
            "User Email",
            "User Name",
            "IP Address",
            "User Agent",
            "Details",
        ];
        const rows = logs.map((log) => [
            `"${log.timestamp.toISOString()}"`,
            `"${log.action.replace(/"/g, '""')}"`,
            `"${log.resourceType.replace(/"/g, '""')}"`,
            `"${log.resourceId || ""}"`,
            `"${log.status}"`,
            `"${log.user?.email || "Anonymous/System"}"`,
            `"${log.user?.fullName || ""}"`,
            `"${log.ipAddress || ""}"`,
            `"${(log.userAgent || "").replace(/"/g, '""')}"`,
            `"${log.detailsJson.replace(/"/g, '""')}"`,
        ]);
        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="audit_trail_report.csv"');
        res.send(csvContent);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
