import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./db/prisma";
import { authRouter } from "./routes/auth.routes";
import { ingestRouter } from "./routes/ingest.routes";
import { patientsRouter } from "./routes/patients.routes";
import { devicesRouter } from "./routes/devices.routes";
import { adminRouter } from "./routes/admin.routes";
import { invitesRouter } from "./routes/invites.routes";
import { requireIngestApiKey } from "./middleware/ingestAuth";
import { ingestTelemetry, ingestStatus } from "./controllers/ingest.controller";
import "./types/auth";

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/ingest", ingestRouter);
app.use("/patients", patientsRouter);
app.use("/devices", devicesRouter);
app.use("/admin", adminRouter);
app.use("/invites", invitesRouter);

// MioConnect's current dashboard derives fixed sub-paths from a single base
// URL rather than letting the forwarding path be typed freely (as the
// integration doc's older UI did) — these mirror that fixed shape at the
// app root, reusing the same handlers/auth as /ingest/*.
app.post("/forwardtelemetry", requireIngestApiKey, ingestTelemetry);
app.post("/forwardstatus", requireIngestApiKey, ingestStatus);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

// Serve static frontend files (if they exist in the public directory)
const frontendDistPath = path.join(__dirname, "../public");
app.use(express.static(frontendDistPath));

// Catch-all route to serve the React app (for client-side routing)
app.get("*", (req, res, next) => {
  const apiPrefixes = ["/auth", "/ingest", "/patients", "/devices", "/admin", "/invites", "/forward", "/health"];
  if (apiPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }
  
  const indexPath = path.join(frontendDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});
