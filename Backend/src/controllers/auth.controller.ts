import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { COOKIE_NAME, signToken } from "../utils/jwt";

const isProd = process.env.NODE_ENV === "production";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    orgId: user.orgId,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    },
  });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, role: true, orgId: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user });
}
