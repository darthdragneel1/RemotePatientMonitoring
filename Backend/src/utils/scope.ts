import { Request } from "express";
import { Role } from "@prisma/client";

export class ScopeError extends Error {}

/**
 * Resolves which org a new Patient/Device should belong to: SUPER_ADMIN
 * must specify one explicitly (they have no org of their own), org users
 * always get their own orgId regardless of what the request body says.
 */
export function resolveCreateOrgId(req: Request, bodyOrgId?: string): string {
  const user = req.user!;
  if (user.role === Role.SUPER_ADMIN) {
    if (!bodyOrgId) {
      throw new ScopeError("orgId is required when creating as SUPER_ADMIN");
    }
    return bodyOrgId;
  }
  if (!user.orgId) {
    throw new ScopeError("Authenticated user has no organization");
  }
  return user.orgId;
}
