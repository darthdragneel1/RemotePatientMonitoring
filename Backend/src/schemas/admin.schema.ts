import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(1),
});

export const createInviteSchema = z.object({
  email: z.email(),
  orgId: z.string().min(1),
  // Invites are always org-scoped roles; SUPER_ADMIN accounts are never
  // created through this flow.
  role: z.enum(["ORG_USER", "ORG_ADMIN"]).default("ORG_USER"),
});

export const acceptInviteSchema = z.object({
  password: z.string().min(8),
});
