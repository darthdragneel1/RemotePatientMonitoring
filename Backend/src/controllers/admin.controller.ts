import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { generateInviteToken } from "../utils/inviteToken";
import { sendInviteEmail } from "../utils/email";
import { logAuditEvent } from "../utils/audit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function listOrganizations(_req: Request, res: Response) {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
  });
  res.json({ organizations });
}

export async function createOrganization(req: Request, res: Response) {
  const organization = await prisma.organization.create({
    data: req.body,
  });

  logAuditEvent("CREATE_ORG", {
    req,
    orgId: organization.id,
    target: "Organization",
    targetId: organization.id,
    details: { name: organization.name },
  });

  res.status(201).json({ organization });
}

export async function deleteOrganization(req: Request, res: Response) {
  const orgId = param(req, "id");
  try {
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    
    if (existing) {
      logAuditEvent("DELETE_ORG", {
        req,
        orgId: existing.id,
        target: "Organization",
        targetId: existing.id,
        details: { name: existing.name },
      });
    }

    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: "Cannot delete organization. Ensure all associated users and patients are removed first." });
  }
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: { org: { select: { id: true, name: true } } },
  });
  res.json({ users });
}

export async function deleteUser(req: Request, res: Response) {
  const userId = param(req, "id");
  if (req.user?.userId === userId) {
    return res.status(400).json({ error: "Cannot delete your own account." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    
    if (existing) {
      logAuditEvent("DELETE_USER", {
        req,
        orgId: existing.orgId,
        target: "User",
        targetId: existing.id,
        details: { email: existing.email },
      });
    }

    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
}

export async function listInvites(req: Request, res: Response) {
  const invites = await prisma.invite.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: "desc" },
    include: { org: { select: { id: true, name: true } } },
  });
  res.json({ invites });
}

export async function createInvite(req: Request, res: Response) {
  const { email, orgId, role } = req.body;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return res.status(400).json({ error: "Organization not found" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "A user with this email already exists" });
  }

  const { token, tokenHash } = generateInviteToken();

  const invite = await prisma.invite.create({
    data: {
      email,
      orgId,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: req.user!.userId,
    },
  });

  let baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) {
    const host = req.get("host") || "remotepatientmonitoring.onrender.com";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    baseUrl = `${protocol}://${host}`;
  } else if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`; // Assume https for production domains missing protocol
  }
  
  const link = `${baseUrl}/accept-invite?token=${token}`;
  await sendInviteEmail(email, link);

  logAuditEvent("CREATE_INVITE", {
    req,
    orgId,
    target: "Invite",
    targetId: invite.id,
    details: { email, role },
  });

  res.status(201).json({ invite: { id: invite.id, email: invite.email, orgId: invite.orgId, expiresAt: invite.expiresAt } });
}

export async function revokeInvite(req: Request, res: Response) {
  const invite = await prisma.invite.findUnique({ where: { id: param(req, "id") } });

  if (!invite || invite.acceptedAt) {
    return res.status(404).json({ error: "Invite not found" });
  }

  await prisma.invite.delete({ where: { id: invite.id } });

  logAuditEvent("REVOKE_INVITE", {
    req,
    orgId: invite.orgId,
    target: "Invite",
    targetId: invite.id,
    details: { email: invite.email },
  });

  res.status(204).send();
}
