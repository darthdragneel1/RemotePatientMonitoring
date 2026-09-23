import { z } from "zod";

export const createDeviceSchema = z.object({
  deviceId: z.string().min(1),
  modelNumber: z.string().optional(),
  imei: z.string().optional(),
  sn: z.string().optional(),
  patientId: z.string().optional(),
  // Only honored for SUPER_ADMIN; ignored (overridden by req.user.orgId) for org users.
  orgId: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  modelNumber: z.string().optional(),
  imei: z.string().optional(),
  sn: z.string().optional(),
  patientId: z.string().nullable().optional(),
});

export const telemetryQuerySchema = z.object({
  kind: z.enum(["TELEMETRY", "STATUS", "HEARTBEAT"]).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

// No page/limit: used by the "download PDF" export, which needs the full
// filtered set rather than one page of it.
export const telemetryExportQuerySchema = z.object({
  kind: z.enum(["TELEMETRY", "STATUS", "HEARTBEAT"]).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const updateTelemetryCommunicationSchema = z.object({
  communication: z.string().nullable().refine((val) => {
    if (!val) return true;
    return val.trim().split(/\s+/).length <= 1000;
  }, "Communication note cannot exceed 1000 words"),
});
