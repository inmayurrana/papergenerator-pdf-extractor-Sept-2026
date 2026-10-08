"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQuestionsExportAccess = exports.checkPaperAccess = exports.checkFolderAccess = exports.requireRole = exports.authenticateJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = require("../prisma");
const authenticateJwt = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }
    else if (req.query && typeof req.query.token === "string") {
        token = req.query.token;
    }
    if (!token) {
        res.status(401).json({ error: "Unauthorized: Missing authentication token" });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
        const userId = payload.sub || payload.id;
        const sessionId = payload.sessionId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized: Invalid token claims" });
            return;
        }
        // Check if session was revoked (if sessionId exists in token)
        if (sessionId) {
            const session = await prisma_1.prisma.userSession.findUnique({
                where: { id: sessionId },
            });
            if (session && (session.isRevoked || new Date() > session.expiresAt)) {
                res.status(401).json({ error: "Unauthorized: Session has been revoked or expired" });
                return;
            }
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, fullName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: "Unauthorized: User not found or inactive" });
            return;
        }
        req.user = user;
        req.sessionId = sessionId;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
};
exports.authenticateJwt = authenticateJwt;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
            return next(); // Admins have full access
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: "Forbidden: Insufficient privileges" });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const checkFolderAccess = async (userId, userRole, folderId) => {
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN")
        return true;
    if (!folderId)
        return true;
    const acl = await prisma_1.prisma.aclRule.findFirst({
        where: {
            userId,
            resource: "FOLDER",
            resourceId: folderId,
        },
    });
    return acl !== null || userRole === "CONTENT_MANAGER" || userRole === "TEACHER";
};
exports.checkFolderAccess = checkFolderAccess;
const checkPaperAccess = async (userId, userRole, paper, action = "EXPORT") => {
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN")
        return true;
    if (paper.creatorId && paper.creatorId === userId)
        return true;
    const acl = await prisma_1.prisma.aclRule.findFirst({
        where: {
            userId,
            resource: "PAPER",
            resourceId: paper.id,
        },
    });
    return acl !== null;
};
exports.checkPaperAccess = checkPaperAccess;
const checkQuestionsExportAccess = async (userId, userRole, questionIds) => {
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN")
        return true;
    if (!questionIds || questionIds.length === 0) {
        return userRole === "CONTENT_MANAGER" || userRole === "TEACHER";
    }
    const questions = await prisma_1.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, folderId: true, creatorId: true },
    });
    for (const q of questions) {
        if (q.creatorId === userId)
            continue;
        const hasFolder = await (0, exports.checkFolderAccess)(userId, userRole, q.folderId);
        if (!hasFolder)
            return false;
    }
    return true;
};
exports.checkQuestionsExportAccess = checkQuestionsExportAccess;
