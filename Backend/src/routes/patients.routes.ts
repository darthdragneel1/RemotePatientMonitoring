import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { createPatientSchema, updatePatientSchema } from "../schemas/patient.schema";
import {
  telemetryQuerySchema,
  telemetryExportQuerySchema,
  updateTelemetryCommunicationSchema,
} from "../schemas/device.schema";
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from "../controllers/patients.controller";
import {
  listPatientTelemetry,
  latestPatientTelemetry,
  exportPatientTelemetry,
  updateTelemetryCommunication,
} from "../controllers/telemetry.controller";

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

patientsRouter.get("/", listPatients);
patientsRouter.get("/:id", getPatient);
patientsRouter.post("/", validateBody(createPatientSchema), createPatient);
patientsRouter.patch("/:id", validateBody(updatePatientSchema), updatePatient);
patientsRouter.delete("/:id", deletePatient);

// Patient telemetry routes (rooted to patient history across all past and current devices)
patientsRouter.get("/:id/telemetry", validateQuery(telemetryQuerySchema), listPatientTelemetry);
patientsRouter.get("/:id/telemetry/latest", latestPatientTelemetry);
patientsRouter.get("/:id/telemetry/export", validateQuery(telemetryExportQuerySchema), exportPatientTelemetry);
patientsRouter.patch(
  "/:id/telemetry/:eventId/communication",
  validateBody(updateTelemetryCommunicationSchema),
  updateTelemetryCommunication
);

