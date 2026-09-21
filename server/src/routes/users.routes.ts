import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { authenticateJwt, requireRole, AuthRequest } from "../middleware/auth";
import { logAuditAction } from "../middleware/audit";

const router = Router();

router.use(authenticateJwt);

// List users (Admins & Content Managers)
router.get("/", requireRole(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        aclRules: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (Admins only)
router.post("/", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Email, password, and full name are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(400).json({ error: "A user with this email already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hash,
        fullName,
        role: role || "TEACHER",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditAction(req.user!.id, "CREATE_USER", "USER", user.id, { email: user.email, role: user.role });
    res.status(201).json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user details, role, or active status
router.put("/:id", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, isActive } = req.body;

    const prevUser = await prisma.user.findUnique({ where: { id } });
    if (!prevUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check email uniqueness if modified
    if (email && email.toLowerCase() !== prevUser.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) {
        res.status(400).json({ error: "Another user with this email already exists" });
        return;
      }
    }

    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (email !== undefined) data.email = email.toLowerCase();
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });

    await logAuditAction(req.user!.id, "UPDATE_USER", "USER", id, {
      prev: { email: prevUser.email, role: prevUser.role, isActive: prevUser.isActive },
      new: { email: updated.email, role: updated.role, isActive: updated.isActive },
    });

    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset user password (Admins only)
router.post("/:id/reset-password", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
      select: { id: true, email: true, fullName: true },
    });

    await logAuditAction(req.user!.id, "RESET_PASSWORD", "USER", id, {
      targetEmail: updated.email,
    });

    res.json({ message: `Password reset successfully for ${updated.fullName} (${updated.email})` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user account (Admins only)
router.delete("/:id", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      res.status(400).json({ error: "You cannot delete your own logged-in account" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete associated ACL rules
    await prisma.aclRule.deleteMany({ where: { userId: id } });

    // Delete user
    await prisma.user.delete({ where: { id } });

    await logAuditAction(req.user!.id, "DELETE_USER", "USER", id, {
      deletedEmail: targetUser.email,
      deletedFullName: targetUser.fullName,
      deletedRole: targetUser.role,
    });

    res.json({ message: `User account ${targetUser.fullName} (${targetUser.email}) deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Assign Folder/Question ACL
router.post("/:id/acl", requireRole(["SUPER_ADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.params;
    const { resource, resourceId, permission } = req.body;

    const rule = await prisma.aclRule.upsert({
      where: {
        userId_resource_resourceId: {
          userId,
          resource: resource || "FOLDER",
          resourceId,
        },
      },
      update: { permission: permission || "READ" },
      create: {
        userId,
        resource: resource || "FOLDER",
        resourceId,
        permission: permission || "READ",
      },
    });

    await logAuditAction(req.user!.id, "SET_ACL", "ACL", rule.id, { userId, resource, resourceId, permission });
    res.json({ rule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
