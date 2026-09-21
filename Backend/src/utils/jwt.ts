import jwt from "jsonwebtoken";
import { JwtPayload as AppJwtPayload } from "../types/auth";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in the environment");
}

export const COOKIE_NAME = "token";
const TOKEN_TTL = "8h";

export function signToken(payload: AppJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AppJwtPayload;
}
