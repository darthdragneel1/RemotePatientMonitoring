import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { telemetryEmitter } from "../services/telemetryEmitter";

const router = Router();

router.get("/telemetry", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering for Nginx/Render
  res.flushHeaders(); // Establish connection immediately
  
  const user = req.user!;
  
  const onNewTelemetry = (data: { event: any, device: any }) => {
    if (user.role !== "SUPER_ADMIN" && data.device.orgId !== user.orgId) {
      return;
    }
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  telemetryEmitter.on("new-telemetry", onNewTelemetry);
  
  req.on("close", () => {
    telemetryEmitter.off("new-telemetry", onNewTelemetry);
  });
});

export { router as liveRoutes };
