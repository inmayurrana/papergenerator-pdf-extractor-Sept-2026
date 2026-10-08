import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../prisma";
import { config } from "../config";
import { Request } from "express";
import { logAuditAction } from "../middleware/audit";
import { SecuritySettingsService } from "./securitySettings.service";

export interface SessionMetadata {
  deviceInfo: string;
  browser: string;
  ipAddress: string;
  userAgent: string;
}

export function parseClientMetadata(req: Request): SessionMetadata {
  const ua = req.headers["user-agent"] || "Unknown Device";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    "127.0.0.1";

  // Simple heuristic for device and browser
  let deviceInfo = "Desktop";
  if (/mobile/i.test(ua)) deviceInfo = "Mobile Phone";
  else if (/tablet|ipad/i.test(ua)) deviceInfo = "Tablet";

  let browser = "Web Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome/i.test(ua)) browser = "Google Chrome";
  else if (/firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";

  return { deviceInfo, browser, ipAddress: ip, userAgent: ua };
}

export class SessionService {
  /**
   * Generates a short-lived access token (5-15 mins) and a rotating refresh token.
   * Creates a tracked UserSession with token family ID and SHA-256 hashed refresh token.
   */
  static async createSession(
    user: { id: string; email: string; role: string },
    req: Request,
    existingFamilyId?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresInMinutes: number;
  }> {
    const familyId = existingFamilyId || uuidv4();
    const rawRefreshToken = crypto.randomBytes(48).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    const meta = parseClientMetadata(req);
    const tokenExpiryMinutes = await SecuritySettingsService.getTokenExpiryMinutes();
    const refreshExpiryDays = 7;
    const expiresAt = new Date(Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000);

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash,
        deviceInfo: meta.deviceInfo,
        browser: meta.browser,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });

    const accessToken = jwt.sign(
      {
        sub: user.id,
        sessionId: session.id,
        email: user.email,
        role: user.role,
        jti: uuidv4(),
      },
      config.JWT_SECRET,
      { expiresIn: `${tokenExpiryMinutes}m` }
    );

    await logAuditAction(
      user.id,
      "SESSION_CREATED",
      "SESSION",
      session.id,
      {
        familyId,
        deviceInfo: meta.deviceInfo,
        browser: meta.browser,
        tokenExpiryMinutes,
      },
      { req, status: "SUCCESS" }
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      sessionId: session.id,
      expiresInMinutes: tokenExpiryMinutes,
    };
  }

  /**
   * Refreshes an access token while rotating the refresh token.
   * Detects reuse of invalidated tokens: if a previously used token is submitted again,
   * ALL sessions in the token family are revoked immediately!
   */
  static async rotateSession(
    rawRefreshToken: string,
    req: Request
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresInMinutes: number;
    user: { id: string; email: string; fullName: string; role: string };
  }> {
    if (!rawRefreshToken) {
      throw new Error("Missing refresh token");
    }

    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    // Look up session by token hash
    const session = await prisma.userSession.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new Error("Invalid refresh token");
    }

    // Reuse detection: If the session was already revoked, a token reuse attack is happening!
    if (session.isRevoked) {
      // Invalidate the entire token family
      await prisma.userSession.updateMany({
        where: { familyId: session.familyId },
        data: { isRevoked: true },
      });

      await logAuditAction(
        session.userId,
        "REFRESH_TOKEN_REUSE_DETECTED",
        "SECURITY",
        session.id,
        {
          familyId: session.familyId,
          securitySeverity: "CRITICAL",
          message: "Attempted reuse of already rotated refresh token. Revoking entire token family.",
        },
        { req, status: "BLOCKED" }
      );

      throw new Error("Token reuse detected: security violation. All sessions have been revoked.");
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new Error("Refresh token expired");
    }

    if (!session.user.isActive) {
      throw new Error("User account is inactive");
    }

    // Revoke old session token as part of rotation
    await prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true, lastUsedAt: new Date() },
    });

    // Create new session within same family
    const nextSession = await this.createSession(session.user, req, session.familyId);

    await logAuditAction(
      session.userId,
      "REFRESH_TOKEN_ROTATED",
      "SESSION",
      nextSession.sessionId,
      {
        familyId: session.familyId,
        previousSessionId: session.id,
      },
      { req, status: "SUCCESS" }
    );

    return {
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken,
      expiresInMinutes: nextSession.expiresInMinutes,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role,
      },
    };
  }

  /**
   * Revoke current session (Logout)
   */
  static async revokeSession(sessionId: string, userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions for a user (Logout all devices)
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions EXCEPT the current one (Logout other devices)
   */
  static async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isRevoked: false,
      },
      data: { isRevoked: true },
    });
  }

  /**
   * List active sessions for user
   */
  static async listUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      browser: s.browser,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.id === currentSessionId,
    }));
  }
}
