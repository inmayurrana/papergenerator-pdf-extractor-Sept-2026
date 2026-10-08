"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const captcha_service_1 = require("../services/captcha.service");
const securitySettings_service_1 = require("../services/securitySettings.service");
const session_service_1 = require("../services/session.service");
const googleAuth_service_1 = require("../services/googleAuth.service");
const rbac_service_1 = require("../services/rbac.service");
const router = (0, express_1.Router)();
// Store temporary OAuth states in memory (TTL 10 min)
const oauthStateCache = new Map();
/**
 * GET /api/auth/captcha/challenge
 * Issues a fresh on-premise local cryptographic challenge
 */
router.get("/captcha/challenge", (req, res) => {
    try {
        const challenge = captcha_service_1.CaptchaService.generateLocalChallenge();
        res.json(challenge);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to generate security challenge: " + err.message });
    }
});
/**
 * Legacy PoW challenge compatibility route
 */
router.get("/challenge", (req, res) => {
    try {
        const challenge = captcha_service_1.CaptchaService.generateLocalChallenge();
        res.json(challenge);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to generate security challenge: " + err.message });
    }
});
/**
 * POST /api/auth/seed-admin
 * Initializes default administrator account and base folder taxonomy
 */
router.post("/seed-admin", async (req, res) => {
    try {
        const count = await prisma_1.prisma.user.count();
        if (count > 0) {
            res.json({ message: "Users already exist. Seed skipped." });
            return;
        }
        const saltRounds = await securitySettings_service_1.SecuritySettingsService.getBcryptSaltRounds();
        const salt = await bcryptjs_1.default.genSalt(saltRounds);
        const hash = await bcryptjs_1.default.hash("Admin@12345", salt);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: "admin@school.local",
                fullName: "System Administrator",
                passwordHash: hash,
                role: "SUPER_ADMIN",
            },
        });
        // Seed default sample folder hierarchy
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
        // Initialize default RBAC permissions
        await rbac_service_1.RbacService.initRoleDefaults();
        await (0, audit_1.logAuditAction)(admin.id, "SEED_ADMIN", "USER", admin.id, { email: admin.email, saltRounds }, { req, status: "SUCCESS" });
        res.json({
            message: "Default Administrator & Class Folders created successfully!",
            email: admin.email,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/auth/login
 * Production-grade authentication with:
 * - Email / Password verification
 * - Server-side CAPTCHA verification (adaptive risk triggering)
 * - Progressive lockout protection (5-minute window)
 * - Tracked Session creation with rotating refresh token & short-lived access token
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password, captchaId, captchaAnswer, captchaToken, captchaExpiresAt, 
        // Legacy challenge params compatibility
        challengeId, nonce, } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        // 1. Fetch User & Account Status
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        // 2. Adaptive Risk & CAPTCHA Enforcement
        const isCaptchaNeeded = await captcha_service_1.CaptchaService.isCaptchaRequired(normalizedEmail, user?.failedLoginAttempts || 0);
        const activeChallengeId = captchaId || challengeId;
        const activeAnswer = captchaAnswer !== undefined ? captchaAnswer : nonce;
        if (isCaptchaNeeded || activeChallengeId) {
            if (!activeChallengeId || activeAnswer === undefined) {
                // Return a fresh challenge to client
                const challenge = captcha_service_1.CaptchaService.generateLocalChallenge();
                res.status(400).json({
                    error: "Security verification required. Please solve the challenge to continue.",
                    captchaRequired: true,
                    challenge,
                });
                return;
            }
            // Verify challenge server-side
            const verification = captcha_service_1.CaptchaService.verify(activeChallengeId, String(activeAnswer), captchaToken || "", Number(captchaExpiresAt || Date.now() + 60000));
            if (!verification.valid) {
                await (0, audit_1.logAuditAction)(user?.id || null, "CAPTCHA_FAILURE", "AUTH", null, { email: normalizedEmail, reason: verification.reason }, { req, status: "BLOCKED" });
                const newChallenge = captcha_service_1.CaptchaService.generateLocalChallenge();
                res.status(400).json({
                    error: verification.reason || "CAPTCHA verification failed. Please try again.",
                    captchaRequired: true,
                    challenge: newChallenge,
                });
                return;
            }
        }
        if (!user) {
            // Timing attack countermeasure: perform dummy bcrypt check
            await bcryptjs_1.default.compare(password, "$2a$12$e8kIF5663661159986325u3abcdefghijklmnopqrstuv");
            await (0, audit_1.logAuditAction)(null, "LOGIN_FAILED", "AUTH", null, { email: normalizedEmail, reason: "Account not found" }, { req, status: "FAILED" });
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        if (!user.isActive) {
            await (0, audit_1.logAuditAction)(user.id, "LOGIN_BLOCKED", "AUTH", user.id, { email: user.email, reason: "Account is deactivated" }, { req, status: "BLOCKED" });
            res.status(401).json({ error: "Account deactivated. Please contact your administrator." });
            return;
        }
        // 3. Check Account Lockout (5 minutes lockout policy)
        const now = new Date();
        if (user.lockedUntil && user.lockedUntil > now) {
            const remainingSec = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
            const remainingMin = Math.ceil(remainingSec / 60);
            await (0, audit_1.logAuditAction)(user.id, "LOGIN_LOCKED_ATTEMPT", "AUTH", user.id, { email: user.email, remainingSeconds: remainingSec }, { req, status: "BLOCKED" });
            res.status(423).json({
                error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMin} minute(s).`,
                isLocked: true,
                remainingSeconds: remainingSec,
                lockedUntil: user.lockedUntil,
            });
            return;
        }
        // 4. Verify Password
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            const maxAttempts = await securitySettings_service_1.SecuritySettingsService.getMaxFailedAttempts(); // default: 5
            const lockoutDuration = await securitySettings_service_1.SecuritySettingsService.getLockoutDurationMinutes(); // default: 5
            const currentFailed = (user.failedLoginAttempts || 0) + 1;
            if (currentFailed >= maxAttempts) {
                // Lock the account for 5 minutes!
                const lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
                await prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedLoginAttempts: currentFailed,
                        lockedUntil: lockUntil,
                    },
                });
                await (0, audit_1.logAuditAction)(user.id, "ACCOUNT_LOCKED", "AUTH", user.id, {
                    email: user.email,
                    failedAttempts: currentFailed,
                    lockoutMinutes: lockoutDuration,
                    lockedUntil: lockUntil,
                }, { req, status: "BLOCKED" });
                res.status(423).json({
                    error: `Multiple failed attempts. Account has been locked for ${lockoutDuration} minutes to prevent unauthorized access.`,
                    isLocked: true,
                    remainingSeconds: lockoutDuration * 60,
                    lockedUntil: lockUntil,
                });
                return;
            }
            else {
                await prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: currentFailed },
                });
                const remaining = maxAttempts - currentFailed;
                await (0, audit_1.logAuditAction)(user.id, "LOGIN_FAILED", "AUTH", user.id, {
                    email: user.email,
                    failedAttempts: currentFailed,
                    remainingAttempts: remaining,
                }, { req, status: "FAILED" });
                res.status(401).json({
                    error: `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`,
                    remainingAttempts: remaining,
                    captchaRequired: currentFailed >= 2,
                    challenge: currentFailed >= 2 ? captcha_service_1.CaptchaService.generateLocalChallenge() : undefined,
                });
                return;
            }
        }
        // 5. Success: Clear failed attempts and update last login
        const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket.remoteAddress ||
            req.ip ||
            "";
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIp: clientIp,
            },
        });
        // 6. Create Server-side Tracked Session with Short-Lived Access Token & Rotating Refresh Token
        const sessionResult = await session_service_1.SessionService.createSession(user, req);
        const permissions = await rbac_service_1.RbacService.getPermissionsForRole(user.role);
        await (0, audit_1.logAuditAction)(user.id, "LOGIN_SUCCESS", "AUTH", user.id, {
            email: user.email,
            role: user.role,
            sessionId: sessionResult.sessionId,
        }, { req, status: "SUCCESS" });
        res.json({
            token: sessionResult.accessToken,
            refreshToken: sessionResult.refreshToken,
            sessionId: sessionResult.sessionId,
            expiresInMinutes: sessionResult.expiresInMinutes,
            permissions,
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
/**
 * POST /api/auth/refresh
 * Validates and rotates refresh token, detects reuse of revoked tokens
 */
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: "Refresh token is required" });
            return;
        }
        const rotated = await session_service_1.SessionService.rotateSession(refreshToken, req);
        const permissions = await rbac_service_1.RbacService.getPermissionsForRole(rotated.user.role);
        res.json({
            token: rotated.accessToken,
            refreshToken: rotated.refreshToken,
            expiresInMinutes: rotated.expiresInMinutes,
            permissions,
            user: rotated.user,
        });
    }
    catch (err) {
        res.status(401).json({ error: err.message || "Invalid or expired refresh token" });
    }
});
/**
 * POST /api/auth/logout
 * Revokes current session
 */
router.post("/logout", auth_1.authenticateJwt, async (req, res) => {
    try {
        if (req.user) {
            if (req.sessionId) {
                await session_service_1.SessionService.revokeSession(req.sessionId, req.user.id);
            }
            await (0, audit_1.logAuditAction)(req.user.id, "LOGOUT", "AUTH", req.user.id, { email: req.user.email, sessionId: req.sessionId }, { req, status: "SUCCESS" });
        }
        res.json({ message: "Logged out successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/auth/logout-all
 * Revokes all sessions across all devices for this user
 */
router.post("/logout-all", auth_1.authenticateJwt, async (req, res) => {
    try {
        if (req.user) {
            await session_service_1.SessionService.revokeAllSessions(req.user.id);
            await (0, audit_1.logAuditAction)(req.user.id, "LOGOUT_ALL", "AUTH", req.user.id, { email: req.user.email }, { req, status: "SUCCESS" });
        }
        res.json({ message: "All sessions have been revoked." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/auth/logout-others
 * Revokes all sessions except the current one
 */
router.post("/logout-others", auth_1.authenticateJwt, async (req, res) => {
    try {
        if (req.user && req.sessionId) {
            await session_service_1.SessionService.revokeOtherSessions(req.user.id, req.sessionId);
            await (0, audit_1.logAuditAction)(req.user.id, "LOGOUT_OTHERS", "AUTH", req.user.id, { currentSessionId: req.sessionId }, { req, status: "SUCCESS" });
        }
        res.json({ message: "All other sessions have been logged out." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/auth/sessions
 * Lists active sessions and devices for the authenticated user
 */
router.get("/sessions", auth_1.authenticateJwt, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const sessions = await session_service_1.SessionService.listUserSessions(req.user.id, req.sessionId);
        res.json({ sessions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * DELETE /api/auth/sessions/:id
 * Revokes a specific session by ID
 */
router.delete("/sessions/:id", auth_1.authenticateJwt, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        await session_service_1.SessionService.revokeSession(req.params.id, req.user.id);
        await (0, audit_1.logAuditAction)(req.user.id, "SESSION_REVOKED", "SESSION", req.params.id, {}, { req, status: "SUCCESS" });
        res.json({ message: "Session revoked successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/auth/google/url
 * Issues Google OAuth2 authorization URL with PKCE
 */
router.get("/google/url", (req, res) => {
    try {
        const authData = googleAuth_service_1.GoogleAuthService.generateAuthUrl();
        // Cache state/nonce/verifier for 10 minutes
        oauthStateCache.set(authData.state, {
            state: authData.state,
            nonce: authData.nonce,
            codeVerifier: authData.codeVerifier,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });
        res.json({ url: authData.url, state: authData.state });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to generate Google SSO URL: " + err.message });
    }
});
/**
 * POST /api/auth/google/callback
 * Exchanges authorization code, validates ID token with Google OIDC, creates session
 */
router.post("/google/callback", async (req, res) => {
    try {
        const { code, state } = req.body;
        if (!code || !state) {
            res.status(400).json({ error: "Missing authorization code or state" });
            return;
        }
        const cached = oauthStateCache.get(state);
        if (!cached || Date.now() > cached.expiresAt) {
            res.status(400).json({ error: "Authentication state expired or invalid." });
            return;
        }
        oauthStateCache.delete(state);
        const user = await googleAuth_service_1.GoogleAuthService.handleCallback(code, state, cached.state, cached.nonce, cached.codeVerifier, req);
        const sessionResult = await session_service_1.SessionService.createSession(user, req);
        const permissions = await rbac_service_1.RbacService.getPermissionsForRole(user.role);
        res.json({
            token: sessionResult.accessToken,
            refreshToken: sessionResult.refreshToken,
            sessionId: sessionResult.sessionId,
            expiresInMinutes: sessionResult.expiresInMinutes,
            permissions,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (err) {
        res.status(401).json({ error: err.message || "Google authentication failed" });
    }
});
/**
 * GET /api/auth/permissions
 * Retrieves the currently authenticated user's permissions
 */
router.get("/permissions", auth_1.authenticateJwt, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const permissions = await rbac_service_1.RbacService.getPermissionsForRole(req.user.role);
    res.json({ role: req.user.role, permissions });
});
/**
 * GET /api/auth/me
 * Returns current authenticated user and session validity
 */
router.get("/me", auth_1.authenticateJwt, async (req, res) => {
    const tokenExpiryMinutes = await securitySettings_service_1.SecuritySettingsService.getTokenExpiryMinutes();
    const permissions = req.user ? await rbac_service_1.RbacService.getPermissionsForRole(req.user.role) : [];
    res.json({
        user: req.user,
        sessionId: req.sessionId,
        permissions,
        tokenExpiryMinutes,
    });
});
exports.default = router;
