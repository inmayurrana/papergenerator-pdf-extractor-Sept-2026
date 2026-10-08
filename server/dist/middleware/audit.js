"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditActivityMiddleware = exports.logAuditAction = void 0;
const prisma_1 = require("../prisma");
/**
 * Universal audit logger capturing full actor context, IP, User-Agent, and event status
 */
const logAuditAction = async (userId, action, resourceType, resourceId = null, details = {}, options) => {
    try {
        let ip = options?.ipAddress || "";
        let ua = options?.userAgent || "";
        const status = options?.status || "SUCCESS";
        if (options?.req) {
            const req = options.req;
            ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "";
            ua = req.headers["user-agent"] || "";
        }
        await prisma_1.prisma.auditLog.create({
            data: {
                userId,
                action,
                resourceType,
                resourceId,
                detailsJson: JSON.stringify(details),
                ipAddress: ip,
                userAgent: ua,
                status,
            },
        });
    }
    catch (err) {
        console.error("Failed to write audit log:", err);
    }
};
exports.logAuditAction = logAuditAction;
/**
 * Express middleware to automatically log high-value mutations
 */
const auditActivityMiddleware = (actionName, resourceType) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;
            const statusCode = res.statusCode;
            const isSuccess = statusCode >= 200 && statusCode < 400;
            // Extract resource ID if present in params or body
            const resourceId = req.params?.id || req.body?.id || null;
            (0, exports.logAuditAction)(req.user?.id || null, actionName, resourceType, resourceId, {
                method: req.method,
                path: req.originalUrl,
                statusCode,
                params: req.params,
            }, {
                req,
                status: isSuccess ? "SUCCESS" : "FAILED",
            }).catch(() => { });
            return originalSend.call(this, body);
        };
        next();
    };
};
exports.auditActivityMiddleware = auditActivityMiddleware;
