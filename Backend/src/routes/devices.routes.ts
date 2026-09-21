import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  createDeviceSchema,
  updateDeviceSchema,
  telemetryQuerySchema,
  telemetryExportQuerySchema,
} from "../schemas/device.schema";
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
} from "../controllers/devices.controller";
import {
  listDeviceTelemetry,
  latestDeviceTelemetry,
  exportDeviceTelemetry,
} from "../controllers/telemetry.controller";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get("/", listDevices);
devicesRouter.get("/:id", getDevice);
devicesRouter.post("/", validateBody(createDeviceSchema), createDevice);
devicesRouter.patch("/:id", validateBody(updateDeviceSchema), updateDevice);
devicesRouter.get("/:id/telemetry", validateQuery(telemetryQuerySchema), listDeviceTelemetry);
devicesRouter.get("/:id/telemetry/latest", latestDeviceTelemetry);
devicesRouter.get("/:id/telemetry/export", validateQuery(telemetryExportQuerySchema), exportDeviceTelemetry);
