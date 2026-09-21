import { z } from "zod";

const vitalThresholdSchema = z
  .object({
    redLow: z.number().optional(),
    orangeLow: z.number().optional(),
    orangeHigh: z.number().optional(),
    redHigh: z.number().optional(),
  })
  .partial();

// Keys match the metric keys used on the frontend (telemetryDisplay.ts) and
// in the field specs from the MioConnect integration doc.
const vitalThresholdsSchema = z
  .object({
    sys: vitalThresholdSchema.optional(),
    dia: vitalThresholdSchema.optional(),
    pulse: vitalThresholdSchema.optional(),
    spo2: vitalThresholdSchema.optional(),
    glucose: vitalThresholdSchema.optional(),
    weight: vitalThresholdSchema.optional(),
  })
  .partial();

export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.iso.datetime().optional(),
  gender: z.string().optional(),
  mrn: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  vitalThresholds: vitalThresholdsSchema.optional(),
  // Only honored for SUPER_ADMIN; ignored (overridden by req.user.orgId) for org users.
  orgId: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema
  .partial()
  .omit({ orgId: true });
