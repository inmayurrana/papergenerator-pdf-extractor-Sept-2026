import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
  sessionId?: string;
}

export const authenticateJwt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as any;
    const userId = payload.sub || payload.id;
    const sessionId = payload.sessionId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized: Invalid token claims" });
      return;
    }

    // Check if session was revoked (if sessionId exists in token)
    if (sessionId) {
      const session = await prisma.userSession.findUnique({
        where: { id: sessionId },
      });
      if (session && (session.isRevoked || new Date() > session.expiresAt)) {
        res.status(401).json({ error: "Unauthorized: Session has been revoked or expired" });
        return;
      }
    }

    const user = await prisma.user.findUnique({
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
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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

export const checkFolderAccess = async (
  userId: string,
  userRole: string,
  folderId: string | null
): Promise<boolean> => {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  if (!folderId) return true;

  const acl = await prisma.aclRule.findFirst({
    where: {
      userId,
      resource: "FOLDER",
      resourceId: folderId,
    },
  });

  return acl !== null || userRole === "CONTENT_MANAGER" || userRole === "TEACHER";
};

export const checkPaperAccess = async (
  userId: string,
  userRole: string,
  paper: { id: string; creatorId?: string | null },
  action: "READ" | "WRITE" | "EXPORT" = "EXPORT"
): Promise<boolean> => {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  if (paper.creatorId && paper.creatorId === userId) return true;

  const acl = await prisma.aclRule.findFirst({
    where: {
      userId,
      resource: "PAPER",
      resourceId: paper.id,
    },
  });

  return acl !== null;
};

export const checkQuestionsExportAccess = async (
  userId: string,
  userRole: string,
  questionIds?: string[]
): Promise<boolean> => {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  if (!questionIds || questionIds.length === 0) {
    return userRole === "CONTENT_MANAGER" || userRole === "TEACHER";
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, folderId: true, creatorId: true },
  });

  for (const q of questions) {
    if (q.creatorId === userId) continue;
    const hasFolder = await checkFolderAccess(userId, userRole, q.folderId);
    if (!hasFolder) return false;
  }

  return true;
};
