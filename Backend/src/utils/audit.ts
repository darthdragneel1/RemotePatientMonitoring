import { Request } from "express";
import { prisma } from "../db/prisma";

export async function logAuditEvent(
  action: string,
  params: {
    req?: Request;
    userId?: string;
    userEmail?: string;
    orgId?: string | null;
    target?: string;
    targetId?: string;
    details?: any;
  }
) {
  try {
    const userId = params.userId ?? params.req?.user?.userId;
    const orgId = params.orgId !== undefined ? params.orgId : (params.req?.user?.orgId ?? null);
    
    let userEmail = params.userEmail;
    if (!userEmail && userId) {
       const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
       if (user) userEmail = user.email;
    }

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        userEmail,
        orgId,
        target: params.target,
        targetId: params.targetId,
        details: params.details ?? null,
      }
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
