import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createOrganizationSchema, createInviteSchema } from "../schemas/admin.schema";
import {
  listOrganizations,
  createOrganization,
  listInvites,
  createInvite,
  revokeInvite,
} from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(Role.SUPER_ADMIN));

adminRouter.get("/organizations", listOrganizations);
adminRouter.post("/organizations", validateBody(createOrganizationSchema), createOrganization);

adminRouter.get("/invites", listInvites);
adminRouter.post("/invites", validateBody(createInviteSchema), createInvite);
adminRouter.delete("/invites/:id", revokeInvite);
