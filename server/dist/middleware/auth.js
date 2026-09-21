"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFolderAccess = exports.requireRole = exports.authenticateJwt = void 0;
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
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, role: true, fullName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: "Unauthorized: User not found or inactive" });
            return;
        }
        req.user = user;
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
