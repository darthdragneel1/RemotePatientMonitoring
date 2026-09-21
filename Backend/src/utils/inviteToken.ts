import crypto from "crypto";

/**
 * Only the hash is stored in the DB, so a DB read/leak alone can't be used
 * to accept an invite (matches how you'd handle a password reset token).
 */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  return { token, tokenHash };
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
