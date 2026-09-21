"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditAction = void 0;
const prisma_1 = require("../prisma");
const logAuditAction = async (userId, action, resourceType, resourceId = null, details = {}) => {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                userId,
                action,
                resourceType,
                resourceId,
                detailsJson: JSON.stringify(details),
            },
        });
    }
    catch (err) {
        console.error("Failed to write audit log:", err);
    }
};
exports.logAuditAction = logAuditAction;
