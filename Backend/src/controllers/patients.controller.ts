import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { orgScope } from "../middleware/auth";
import { resolveCreateOrgId, ScopeError } from "../utils/scope";

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

  res.json({ patient });
}

export async function deletePatient(req: Request, res: Response) {
  const existing = await prisma.patient.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
  });

  if (!existing) {
    return res.status(404).json({ error: "Patient not found" });
  }

  await prisma.patient.delete({ where: { id: existing.id } });
  res.status(204).send();
}
