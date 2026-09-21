import { Request, Response, NextFunction } from "express";

const API_KEY_NAME = (process.env.INGEST_API_KEY_NAME ?? "").toLowerCase();
const API_KEY_VALUE = process.env.INGEST_API_KEY_VALUE;

if (!API_KEY_NAME || !API_KEY_VALUE) {
  throw new Error("INGEST_API_KEY_NAME / INGEST_API_KEY_VALUE are not set in the environment");
}

/**
 * Authenticates inbound MioConnect forwarding requests via a static header
 * (configured to match on the MioConnect dashboard's Data Forwarding page),
 * as opposed to the user-facing JWT auth used by the dashboard API.
 */
export function requireIngestApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers[API_KEY_NAME];

  if (provided !== API_KEY_VALUE) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
}
