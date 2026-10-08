import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../prisma";
import { config } from "../config";
import { authenticateJwt, requireRole, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";
import { SecuritySettingsService } from "../services/securitySettings.service";
import { RbacService, PERMISSIONS } from "../services/rbac.service";

const router = Router();

// Configure multer for custom login logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(path.resolve(config.DATA_DIR), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `login_logo_${Date.now()}${ext}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * GET /api/security/branding
 * Public endpoint to fetch Login Page branding & logo without requiring authentication
 */
router.get("/branding", async (req: Request, res: Response) => {
  try {
    const branding = await SecuritySettingsService.getLoginBranding();
    res.json(branding);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Protect all following administration routes with JWT and Role checks
router.use(authenticateJwt);

/**
 * PUT /api/security/branding
 * Allows administrators to edit the login page title, subtitle, logo URL, and footer texts
 */
router.put("/branding", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, logoUrl, logoBase64, footerLeft, footerRight } = req.body;
    const updates: Record<string, string> = {};

    if (title !== undefined) {
      const cleanTitle = String(title).trim() || "PaperGen AI Intelligence";
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_TITLE", cleanTitle);
      updates.title = cleanTitle;
    }

    if (subtitle !== undefined) {
      const cleanSub = String(subtitle).trim();
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_SUBTITLE", cleanSub);
      updates.subtitle = cleanSub;
    }

    // Handle base64 image data upload
    if (logoBase64 && typeof logoBase64 === "string" && logoBase64.startsWith("data:image/")) {
      const matches = logoBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const filename = `login_logo_${Date.now()}.${ext}`;
        const uploadDir = path.join(path.resolve(config.DATA_DIR), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        const newLogoUrl = `/data/uploads/${filename}`;
        await SecuritySettingsService.updateSetting("LOGIN_PAGE_LOGO_URL", newLogoUrl);
        updates.logoUrl = newLogoUrl;
      }
    } else if (logoUrl !== undefined) {
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_LOGO_URL", String(logoUrl).trim());
      updates.logoUrl = String(logoUrl).trim();
    }

    if (footerLeft !== undefined) {
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_FOOTER_LEFT", String(footerLeft).trim());
      updates.footerLeft = String(footerLeft).trim();
    }

    if (footerRight !== undefined) {
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_FOOTER_RIGHT", String(footerRight).trim());
      updates.footerRight = String(footerRight).trim();
    }

    await logAuditAction(
      req.user!.id,
      "UPDATE_LOGIN_BRANDING",
      "SECURITY",
      null,
      { updates },
      { req, status: "SUCCESS" }
    );

    const branding = await SecuritySettingsService.getLoginBranding();
    res.json({
      message: "Login page branding updated successfully",
      branding,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/branding/logo
 * Uploads a logo file for the login page (PNG, JPG, SVG, WebP)
 */
router.post(
  "/branding/logo",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  logoUpload.single("logo"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const logoUrl = `/data/uploads/${req.file.filename}`;
      await SecuritySettingsService.updateSetting("LOGIN_PAGE_LOGO_URL", logoUrl);

      await logAuditAction(
        req.user!.id,
        "UPLOAD_LOGIN_LOGO",
        "SECURITY",
        null,
        { filename: req.file.filename, logoUrl },
        { req, status: "SUCCESS" }
      );

      res.json({
        message: "Login page logo uploaded successfully",
        logoUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/security/settings
 * Retrieves all security settings (Token expiry, lockout, rate limits)
 */
router.get("/settings", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await SecuritySettingsService.getAllSettings();
    const tokenExpiryMinutes = await SecuritySettingsService.getTokenExpiryMinutes();
    const maxFailedAttempts = await SecuritySettingsService.getMaxFailedAttempts();
    const lockoutMinutes = await SecuritySettingsService.getLockoutDurationMinutes();
    const requireChallenge = await SecuritySettingsService.isLoginChallengeRequired();
    const branding = await SecuritySettingsService.getLoginBranding();

    res.json({
      settings,
      branding,
      parsed: {
        tokenExpiryMinutes,
        maxFailedAttempts,
        lockoutMinutes,
        requireChallenge,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/security/settings
 * Updates security policies (Token Expiry minutes, Lockout policy, etc.)
 */
router.put("/settings", requireRole(["SUPER_ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { tokenExpiryMinutes, maxFailedAttempts, lockoutMinutes, requireChallenge } = req.body;
    const updates: Record<string, string> = {};

    if (tokenExpiryMinutes !== undefined) {
      const num = parseInt(tokenExpiryMinutes, 10);
      if (isNaN(num) || num < 1 || num > 1440) {
        res.status(400).json({ error: "Token expiry must be between 1 and 1440 minutes (24 hours)" });
        return;
      }
      await SecuritySettingsService.updateSetting("TOKEN_EXPIRY_MINUTES", num.toString());
      updates.TOKEN_EXPIRY_MINUTES = num.toString();
    }

    if (maxFailedAttempts !== undefined) {
      const num = parseInt(maxFailedAttempts, 10);
      if (isNaN(num) || num < 1 || num > 50) {
        res.status(400).json({ error: "Max failed attempts must be between 1 and 50" });
        return;
      }
      await SecuritySettingsService.updateSetting("MAX_FAILED_ATTEMPTS", num.toString());
      updates.MAX_FAILED_ATTEMPTS = num.toString();
    }

    if (lockoutMinutes !== undefined) {
      const num = parseInt(lockoutMinutes, 10);
      if (isNaN(num) || num < 1 || num > 1440) {
        res.status(400).json({ error: "Lockout duration must be between 1 and 1440 minutes" });
        return;
      }
      await SecuritySettingsService.updateSetting("LOCKOUT_DURATION_MINUTES", num.toString());
      updates.LOCKOUT_DURATION_MINUTES = num.toString();
    }

    if (requireChallenge !== undefined) {
      const boolVal = Boolean(requireChallenge).toString();
      await SecuritySettingsService.updateSetting("REQUIRE_LOGIN_CHALLENGE", boolVal);
      updates.REQUIRE_LOGIN_CHALLENGE = boolVal;
    }

    await logAuditAction(
      req.user!.id,
      "UPDATE_SECURITY_SETTINGS",
      "SECURITY",
      null,
      { updates },
      { req, status: "SUCCESS" }
    );

    res.json({
      message: "Security settings updated successfully",
      updates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/roles
 * Lists all roles and their configured permission mappings
 */
router.get("/roles", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const rolesWithPermissions = await RbacService.getAllRolesWithPermissions();
    const availablePermissions = Object.values(PERMISSIONS);
    res.json({
      roles: rolesWithPermissions,
      availablePermissions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/security/roles/:role
 * Updates permissions assigned to a role (Audits changes)
 */
router.put("/roles/:role", requireRole(["SUPER_ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: "Permissions must be an array of strings" });
      return;
    }

    const oldPermissions = await RbacService.getPermissionsForRole(role);
    await RbacService.updateRolePermissions(role, permissions);

    await logAuditAction(
      req.user!.id,
      "ROLE_CHANGED",
      "ROLE",
      role,
      {
        role,
        previousPermissions: oldPermissions,
        newPermissions: permissions,
      },
      { req, status: "SUCCESS" }
    );

    res.json({
      message: `Permissions for role '${role}' updated successfully`,
      role,
      permissions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/unlock-user/:id
 * Unlocks a locked user account manually (Admin only)
 */
router.post("/unlock-user/:id", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    await logAuditAction(
      req.user!.id,
      "UNLOCK_USER",
      "USER",
      id,
      {
        targetEmail: user.email,
        unlockedBy: req.user!.email,
      },
      { req, status: "SUCCESS" }
    );

    res.json({
      message: `Account for ${user.fullName} (${user.email}) has been unlocked successfully.`,
      user: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/stats
 * Overview of locked accounts, security posture, and recent incidents
 */
router.get("/stats", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const lockedCount = await prisma.user.count({
      where: {
        lockedUntil: {
          gt: now,
        },
      },
    });

    const recentFailedLogins = await prisma.auditLog.count({
      where: {
        action: {
          in: ["LOGIN_FAILED", "LOGIN_CHALLENGE_FAILED", "ACCOUNT_LOCKED", "LOGIN_LOCKED_ATTEMPT", "REFRESH_TOKEN_REUSE_DETECTED"],
        },
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24h
        },
      },
    });

    const tokenExpiryMinutes = await SecuritySettingsService.getTokenExpiryMinutes();
    const lockoutMinutes = await SecuritySettingsService.getLockoutDurationMinutes();
    const requireChallenge = await SecuritySettingsService.isLoginChallengeRequired();

    res.json({
      lockedUsersCount: lockedCount,
      failedAttempts24h: recentFailedLogins,
      tokenExpiryMinutes,
      lockoutMinutes,
      requireChallenge,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
