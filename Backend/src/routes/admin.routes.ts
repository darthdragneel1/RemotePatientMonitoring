import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createOrganizationSchema, createInviteSchema } from "../schemas/admin.schema";
  listOrganizations,
  createOrganization,
  deleteOrganization,
  listUsers,
  deleteUser,
  listInvites,
  createInvite,
  revokeInvite,
} from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(Role.SUPER_ADMIN));

adminRouter.get("/organizations", listOrganizations);
adminRouter.post("/organizations", validateBody(createOrganizationSchema), createOrganization);
adminRouter.delete("/organizations/:id", deleteOrganization);

adminRouter.get("/users", listUsers);
adminRouter.delete("/users/:id", deleteUser);

adminRouter.get("/invites", listInvites);
adminRouter.post("/invites", validateBody(createInviteSchema), createInvite);
adminRouter.delete("/invites/:id", revokeInvite);
