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

// Preprocess dateOfBirth to support both ISO strings and YYYY-MM-DD date-only inputs,
// converting to UTC midnight ISO string and allowing null to clear.
const dobSchema = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return val === "" ? null : val;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return `${val}T00:00:00.000Z`;
  }
  return val;
}, z.string().datetime().nullable().optional());

export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: dobSchema,
  gender: z.string().nullable().optional(),
  mrn: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  vitalThresholds: vitalThresholdsSchema.optional(),
  // Only honored for SUPER_ADMIN; ignored (overridden by req.user.orgId) for org users.
  orgId: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema
  .partial()
  .omit({ orgId: true });

