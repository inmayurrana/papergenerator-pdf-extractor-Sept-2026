import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { RbacService, Permission } from "../services/rbac.service";
import { logAuditAction } from "./audit";

export type ResourceChecker = (req: AuthRequest) => Promise<boolean>;

/**
 * Centralized RBAC Middleware
 * Enforces granular permissions and optional resource-level scoping
 */
export const requirePermission = (permission: Permission | string, resourceChecker?: ResourceChecker) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Missing authentication" });
      return;
    }

    // 1. Check Role Permission
    const hasPerm = await RbacService.hasPermission(req.user.role, permission);
    if (!hasPerm) {
      await logAuditAction(
        req.user.id,
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "SECURITY",
        null,
        {
          requiredPermission: permission,
          userRole: req.user.role,
          path: req.originalUrl,
          method: req.method,
        },
        { req, status: "BLOCKED" }
      );

      res.status(403).json({
        error: `Forbidden: You do not possess the required permission (${permission})`,
      });
      return;
    }

    // 2. Check Resource-level Scoping (if applicable)
    if (resourceChecker) {
      try {
        const allowed = await resourceChecker(req);
        if (!allowed) {
          await logAuditAction(
            req.user.id,
            "IDOR_ACCESS_BLOCKED",
            "SECURITY",
            req.params?.id || null,
            {
              permission,
              userRole: req.user.role,
              path: req.originalUrl,
              reason: "Resource-level access restriction (Class/Subject/Owner mismatch)",
            },
            { req, status: "BLOCKED" }
          );

          res.status(403).json({
            error: "Forbidden: You do not have permission to access this specific resource scope",
          });
          return;
        }
      } catch (err: any) {
        res.status(500).json({ error: "Internal resource authorization evaluation error" });
        return;
      }
    }

    next();
  };
};
