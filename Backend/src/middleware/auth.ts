import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { COOKIE_NAME, verifyToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

/**
 * Returns a Prisma `where` filter fragment scoping to the caller's org,
 * or an empty object for SUPER_ADMIN (who sees all orgs). Centralizes the
 * one rule that actually enforces tenant isolation, so every device/patient
 * query goes through this instead of repeating the role check per-route.
 */
export function orgScope(req: Request): { orgId?: string } {
  if (!req.user) {
    throw new Error("orgScope called without an authenticated request");
  }
  if (req.user.role === Role.SUPER_ADMIN) {
    return {};
  }
  return { orgId: req.user.orgId ?? "__no_org__" };
}
