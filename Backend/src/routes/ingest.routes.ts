import { Router } from "express";
import { requireIngestApiKey } from "../middleware/ingestAuth";
import { ingestTelemetry, ingestStatus, ingestHeartbeat } from "../controllers/ingest.controller";

export const ingestRouter = Router();

ingestRouter.use(requireIngestApiKey);

// deviceId is always read from the JSON body; the optional :deviceId path
// segment only supports MioConnect's `useDeviceIdInForwardingUrl` option,
// which appends it to the configured forwarding URL. Registered as two
// separate routes (rather than a `?` optional param) for compatibility with
// Express 5's path-to-regexp syntax.
ingestRouter.post("/telemetry", ingestTelemetry);
ingestRouter.post("/telemetry/:deviceId", ingestTelemetry);
ingestRouter.post("/status", ingestStatus);
ingestRouter.post("/status/:deviceId", ingestStatus);
ingestRouter.post("/heartbeat", ingestHeartbeat);
ingestRouter.post("/heartbeat/:deviceId", ingestHeartbeat);
