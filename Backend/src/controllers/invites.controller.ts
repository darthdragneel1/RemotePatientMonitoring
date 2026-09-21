import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { hashInviteToken } from "../utils/inviteToken";
import { COOKIE_NAME, signToken } from "../utils/jwt";
import { logAuditEvent } from "../utils/audit";

const isProd = process.env.NODE_ENV === "production";

async function findValidInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { org: { select: { id: true, name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return null;
  }

  return invite;
}

export async function getInvite(req: Request, res: Response) {
  const invite = await findValidInvite(param(req, "token"));

  if (!invite) {
    return res.status(404).json({ error: "Invite not found or expired" });
  }

  res.json({
    invite: { email: invite.email, org: invite.org },
  });
}

export async function acceptInvite(req: Request, res: Response) {
  const invite = await findValidInvite(param(req, "token"));

  if (!invite) {
    return res.status(404).json({ error: "Invite not found or expired" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return res.status(409).json({ error: "A user with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: invite.email,
        passwordHash,
        role: invite.role,
        orgId: invite.orgId,
      },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return created;
  });

  logAuditEvent("ACCEPT_INVITE", {
    userId: user.id, // Explicitly pass since req.user isn't set yet
    userEmail: user.email,
    orgId: user.orgId,
    target: "Invite",
    targetId: invite.id,
  });

  const token = signToken({ userId: user.id, role: user.role, orgId: user.orgId });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.status(201).json({
    user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
  });
}
