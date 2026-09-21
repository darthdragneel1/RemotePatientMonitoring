import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { orgScope } from "../middleware/auth";
import { resolveCreateOrgId, ScopeError } from "../utils/scope";
import { logAuditEvent } from "../utils/audit";

const listInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, vitalThresholds: true } },
  org: { select: { id: true, name: true } },
};

export async function listDevices(req: Request, res: Response) {
  const devices = await prisma.device.findMany({
    where: orgScope(req),
    orderBy: { createdAt: "desc" },
    include: listInclude,
  });
  res.json({ devices });
}

export async function getDevice(req: Request, res: Response) {
  const device = await prisma.device.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
    include: listInclude,
  });

  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  res.json({ device });
}

export async function createDevice(req: Request, res: Response) {
  let orgId: string;
  try {
    orgId = resolveCreateOrgId(req, req.body.orgId);
  } catch (err) {
    if (err instanceof ScopeError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  const { orgId: _ignored, patientId, ...data } = req.body;

  if (patientId) {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, orgId } });
    if (!patient) {
      return res.status(400).json({ error: "patientId does not belong to this organization" });
    }
  }

  const device = await prisma.device.create({
    data: { ...data, patientId, orgId },
    include: listInclude,
  });

  logAuditEvent("CREATE_DEVICE", {
    req,
    orgId: device.orgId,
    target: "Device",
    targetId: device.id,
    details: { deviceId: device.deviceId },
  });

  res.status(201).json({ device });
}

export async function updateDevice(req: Request, res: Response) {
  const existing = await prisma.device.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
  });

  if (!existing) {
    return res.status(404).json({ error: "Device not found" });
  }

  if (req.body.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: req.body.patientId, orgId: existing.orgId },
    });
    if (!patient) {
      return res.status(400).json({ error: "patientId does not belong to this organization" });
    }
  }

  const device = await prisma.device.update({
    where: { id: existing.id },
    data: req.body,
    include: listInclude,
  });

  let action = "UPDATE_DEVICE";
  if (req.body.patientId !== undefined && req.body.patientId !== existing.patientId) {
    action = req.body.patientId === null ? "UNASSIGN_DEVICE" : "ASSIGN_DEVICE";
  }

  logAuditEvent(action, {
    req,
    orgId: device.orgId,
    target: "Device",
    targetId: device.id,
    details: { updatedFields: Object.keys(req.body) },
  });

  res.json({ device });
}

