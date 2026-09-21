import { prisma } from "../prisma";

export const logAuditAction = async (
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null = null,
  details: Record<string, any> = {}
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        detailsJson: JSON.stringify(details),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};
