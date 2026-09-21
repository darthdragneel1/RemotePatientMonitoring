import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createPatientSchema, updatePatientSchema } from "../schemas/patient.schema";
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from "../controllers/patients.controller";

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

patientsRouter.get("/", listPatients);
patientsRouter.get("/:id", getPatient);
patientsRouter.post("/", validateBody(createPatientSchema), createPatient);
patientsRouter.patch("/:id", validateBody(updatePatientSchema), updatePatient);
patientsRouter.delete("/:id", deletePatient);
