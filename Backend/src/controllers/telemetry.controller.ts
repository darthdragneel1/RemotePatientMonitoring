import { Request, Response } from "express";
import { Prisma, TelemetryKind } from "@prisma/client";
import { prisma } from "../db/prisma";
import { param } from "../utils/params";
import { orgScope } from "../middleware/auth";

interface TelemetryQuery {
  kind?: TelemetryKind;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

interface TelemetryExportQuery {
  kind?: TelemetryKind;
  from?: string;
  to?: string;
}

// Safety cap on a single export/PDF download, independent of on-screen
// pagination — protects against an unbounded date range being requested.
const EXPORT_MAX_ROWS = 5000;

async function findScopedDevice(req: Request) {
  return prisma.device.findFirst({
    where: { id: param(req, "id"), ...orgScope(req) },
  });
}

function buildWhere(deviceId: string, query: { kind?: TelemetryKind; from?: string; to?: string }) {
  const where: Prisma.TelemetryEventWhereInput = { deviceId };
  if (query.kind) where.kind = query.kind;
  if (query.from || query.to) {
    where.recordedAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
  return where;
}

export async function listDeviceTelemetry(req: Request, res: Response) {
  const device = await findScopedDevice(req);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const query = (req as Request & { validatedQuery: TelemetryQuery }).validatedQuery;
  const where = buildWhere(device.id, query);

  const [events, total] = await prisma.$transaction([
    prisma.telemetryEvent.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.telemetryEvent.count({ where }),
  ]);

  res.json({
    events,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
}

export async function exportDeviceTelemetry(req: Request, res: Response) {
  const device = await findScopedDevice(req);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const query = (req as Request & { validatedQuery: TelemetryExportQuery }).validatedQuery;
  const where = buildWhere(device.id, query);

  const events = await prisma.telemetryEvent.findMany({
    where,
    orderBy: { recordedAt: "asc" },
    take: EXPORT_MAX_ROWS,
  });

  res.json({ events });
}

export async function latestDeviceTelemetry(req: Request, res: Response) {
  const device = await findScopedDevice(req);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const kinds: TelemetryKind[] = [TelemetryKind.TELEMETRY, TelemetryKind.STATUS, TelemetryKind.HEARTBEAT];

  const latestByKind = await Promise.all(
    kinds.map((kind) =>
      prisma.telemetryEvent.findFirst({
        where: { deviceId: device.id, kind },
        orderBy: { recordedAt: "desc" },
      })
    )
  );

  res.json({
    latest: Object.fromEntries(kinds.map((kind, i) => [kind, latestByKind[i]])),
  });
}

export async function updateTelemetryCommunication(req: Request, res: Response) {
  const device = await findScopedDevice(req);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const eventId = param(req, "eventId");
  const body = req.body as { communication?: string | null };

  const event = await prisma.telemetryEvent.findFirst({
    where: { id: eventId, deviceId: device.id },
  });

  if (!event) {
    return res.status(404).json({ error: "Telemetry event not found" });
  }

  const updated = await prisma.telemetryEvent.update({
    where: { id: event.id },
    data: {
      communication: body.communication,
      communicationAt: new Date(),
    },
  });

  res.json({ event: updated });
}
