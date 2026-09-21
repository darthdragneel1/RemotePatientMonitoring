import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { orgScope } from "../middleware/auth";
import { resolveCreateOrgId, ScopeError } from "../utils/scope";
import { logAuditEvent } from "../utils/audit";

export async function listPatients(req: Request, res: Response) {
  const patients = await prisma.patient.findMany({
    where: orgScope(req),
    orderBy: { createdAt: "desc" },
  });
  res.json({ patients });
}

export async function getPatient(req: Request, res: Response) {
  const patient = await prisma.patient.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
    include: { devices: true },
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  res.json({ patient });
}

export async function createPatient(req: Request, res: Response) {
  let orgId: string;
  try {
    orgId = resolveCreateOrgId(req, req.body.orgId);
  } catch (err) {
    if (err instanceof ScopeError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  const { orgId: _ignored, ...data } = req.body;

  const patient = await prisma.patient.create({
    data: { ...data, orgId },
  });

  logAuditEvent("CREATE_PATIENT", {
    req,
    orgId: patient.orgId,
    target: "Patient",
    targetId: patient.id,
    details: { name: `${patient.firstName} ${patient.lastName}` },
  });

  res.status(201).json({ patient });
}

export async function updatePatient(req: Request, res: Response) {
  const existing = await prisma.patient.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
  });

  if (!existing) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const patient = await prisma.patient.update({
    where: { id: existing.id },
    data: req.body,
  });

  logAuditEvent("UPDATE_PATIENT", {
    req,
    orgId: patient.orgId,
    target: "Patient",
    targetId: patient.id,
    details: { updatedFields: Object.keys(req.body) },
  });

  res.json({ patient });
}

export async function deletePatient(req: Request, res: Response) {
  const existing = await prisma.patient.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
    include: { devices: true },
  });

  if (!existing) {
    return res.status(404).json({ error: "Patient not found" });
  }

  if (existing.devices && existing.devices.length > 0) {
    return res.status(400).json({ error: "Cannot delete patient with assigned devices. Unassign devices first." });
  }

  await prisma.patient.delete({ where: { id: existing.id } });

  logAuditEvent("DELETE_PATIENT", {
    req,
    orgId: existing.orgId,
    target: "Patient",
    targetId: existing.id,
    details: { name: `${existing.firstName} ${existing.lastName}` },
  });

  res.status(204).send();
}
