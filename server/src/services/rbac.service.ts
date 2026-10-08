import { prisma } from "../prisma";

export const PERMISSIONS = {
  // Documents
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_DELETE: "documents.delete",
  DOCUMENTS_EXPORT: "documents.export",

  // Math & Scientific
  MATH_REVIEW: "math.review",
  MATH_VERIFY: "math.verify",
  MATH_EDIT: "math.edit",

  // Questions
  QUESTIONS_VIEW: "questions.view",
  QUESTIONS_CREATE: "questions.create",
  QUESTIONS_EDIT: "questions.edit",
  QUESTIONS_DELETE: "questions.delete",

  // Question Bank
  QUESTIONBANK_VIEW: "questionbank.view",
  QUESTIONBANK_CREATE: "questionbank.create",
  QUESTIONBANK_EDIT: "questionbank.edit",

  // OMR
  OMR_GENERATE: "omr.generate",
  OMR_EVALUATE: "omr.evaluate",

  // Users & Roles
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DISABLE: "users.disable",
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",

  // Audit & Settings
  AUDIT_VIEW: "audit.view",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Built-in default permissions matrix for standard roles
 */
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.DOCUMENTS_EXPORT,
    PERMISSIONS.MATH_REVIEW,
    PERMISSIONS.MATH_VERIFY,
    PERMISSIONS.MATH_EDIT,
    PERMISSIONS.QUESTIONS_VIEW,
    PERMISSIONS.QUESTIONS_CREATE,
    PERMISSIONS.QUESTIONS_EDIT,
    PERMISSIONS.QUESTIONS_DELETE,
    PERMISSIONS.QUESTIONBANK_VIEW,
    PERMISSIONS.QUESTIONBANK_CREATE,
    PERMISSIONS.QUESTIONBANK_EDIT,
    PERMISSIONS.OMR_GENERATE,
    PERMISSIONS.OMR_EVALUATE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
  ],
  TEACHER: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.MATH_REVIEW,
    PERMISSIONS.QUESTIONS_VIEW,
    PERMISSIONS.QUESTIONS_CREATE,
    PERMISSIONS.QUESTIONS_EDIT,
    PERMISSIONS.QUESTIONBANK_VIEW,
    PERMISSIONS.QUESTIONBANK_CREATE,
    PERMISSIONS.OMR_GENERATE,
    PERMISSIONS.OMR_EVALUATE,
  ],
  REVIEWER: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.MATH_REVIEW,
    PERMISSIONS.MATH_VERIFY,
    PERMISSIONS.QUESTIONS_VIEW,
    PERMISSIONS.QUESTIONBANK_VIEW,
  ],
  CONTENT_EDITOR: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.MATH_REVIEW,
    PERMISSIONS.MATH_EDIT,
    PERMISSIONS.QUESTIONS_VIEW,
    PERMISSIONS.QUESTIONS_CREATE,
    PERMISSIONS.QUESTIONS_EDIT,
    PERMISSIONS.QUESTIONBANK_VIEW,
    PERMISSIONS.QUESTIONBANK_CREATE,
    PERMISSIONS.QUESTIONBANK_EDIT,
  ],
  VIEWER: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.QUESTIONS_VIEW,
    PERMISSIONS.QUESTIONBANK_VIEW,
    PERMISSIONS.MATH_REVIEW,
  ],
};

export class RbacService {
  /**
   * Initializes default role permissions in the database if empty
   */
  static async initRoleDefaults(): Promise<void> {
    try {
      const count = await prisma.rolePermission.count();
      if (count === 0) {
        const records: { role: string; permission: string }[] = [];
        for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
          for (const permission of perms) {
            records.push({ role, permission });
          }
        }
        await prisma.rolePermission.createMany({
          data: records,
        });
      }
    } catch (err) {
      console.warn("RbacService: Default init warning:", err);
    }
  }

  /**
   * Returns all active permissions for a given role (checking DB overrides first)
   */
  static async getPermissionsForRole(role: string): Promise<string[]> {
    if (role === "SUPER_ADMIN") {
      return Object.values(PERMISSIONS);
    }

    try {
      const dbPerms = await prisma.rolePermission.findMany({
        where: { role },
        select: { permission: true },
      });

      if (dbPerms.length > 0) {
        return dbPerms.map((p) => p.permission);
      }
    } catch (e) {
      // Fallback to in-memory defaults
    }

    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
  }

  /**
   * Verifies if a role has the specified permission
   */
  static async hasPermission(role: string, permission: string): Promise<boolean> {
    if (role === "SUPER_ADMIN") return true;

    const perms = await this.getPermissionsForRole(role);
    return perms.includes(permission);
  }

  /**
   * Retrieves all roles with their configured permissions for administration
   */
  static async getAllRolesWithPermissions() {
    const roles = ["SUPER_ADMIN", "ADMIN", "TEACHER", "REVIEWER", "CONTENT_EDITOR", "VIEWER"];
    const result: Record<string, string[]> = {};
    for (const r of roles) {
      result[r] = await this.getPermissionsForRole(r);
    }
    return result;
  }

  /**
   * Updates permissions for a configurable role
   */
  static async updateRolePermissions(role: string, permissions: string[]): Promise<void> {
    if (role === "SUPER_ADMIN") {
      throw new Error("Cannot modify SUPER_ADMIN permissions");
    }

    // Delete existing
    await prisma.rolePermission.deleteMany({
      where: { role },
    });

    // Insert new
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ role, permission: p })),
    });
  }
}
