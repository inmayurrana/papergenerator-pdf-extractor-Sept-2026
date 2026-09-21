import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { authenticateJwt, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticateJwt);

// Get audit logs (Admins only)
router.get("/", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { action, resourceType, userId, limit } = req.query;
    const where: any = {};

    if (action) where.action = action as string;
    if (resourceType) where.resourceType = resourceType as string;
    if (userId) where.userId = userId as string;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
      orderBy: { timestamp: "desc" },
      take: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
