import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "./auth";

export interface AuditOptions {
  req?: Request;
  status?: "SUCCESS" | "FAILED" | "BLOCKED";
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Universal audit logger capturing full actor context, IP, User-Agent, and event status
 */
export const logAuditAction = async (
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null = null,
  details: Record<string, any> = {},
  options?: AuditOptions
) => {
  try {
    let ip = options?.ipAddress || "";
    let ua = options?.userAgent || "";
    const status = options?.status || "SUCCESS";

    if (options?.req) {
      const req = options.req;
      ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || req.ip || "";
      ua = (req.headers["user-agent"] as string) || "";
    }

    await prisma.auditLog.create({
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
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};

/**
 * Express middleware to automatically log high-value mutations
 */
export const auditActivityMiddleware = (actionName: string, resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (body?: any): Response {
      res.send = originalSend;
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 400;

      // Extract resource ID if present in params or body
      const resourceId = req.params?.id || req.body?.id || null;

      logAuditAction(
        req.user?.id || null,
        actionName,
        resourceType,
        resourceId,
        {
          method: req.method,
          path: req.originalUrl,
          statusCode,
          params: req.params,
        },
        {
          req,
          status: isSuccess ? "SUCCESS" : "FAILED",
        }
      ).catch(() => {});

      return originalSend.call(this, body);
    };

    next();
  };
};
