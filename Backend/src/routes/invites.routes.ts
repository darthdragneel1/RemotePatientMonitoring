import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { acceptInviteSchema } from "../schemas/admin.schema";
import { getInvite, acceptInvite } from "../controllers/invites.controller";

// Public: authenticated by the token in the URL, not a login session.
export const invitesRouter = Router();

invitesRouter.get("/:token", getInvite);
invitesRouter.post("/:token/accept", validateBody(acceptInviteSchema), acceptInvite);
