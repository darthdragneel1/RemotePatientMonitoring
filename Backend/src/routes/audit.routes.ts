import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";
import { listAuditLogs } from "../controllers/audit.controller";

export const auditRouter = Router();

// Only ORG_ADMIN and SUPER_ADMIN can view audit logs
auditRouter.use(requireAuth, requireRole(Role.ORG_ADMIN, Role.SUPER_ADMIN));
auditRouter.get("/", listAuditLogs);
