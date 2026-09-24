import { Request, Response } from "express";
import { TelemetryKind } from "@prisma/client";
import { prisma } from "../db/prisma";

import { telemetryEmitter } from "../services/telemetryEmitter";
import { logAuditEvent } from "../utils/audit";
import { getTelemetryAbnormalities } from "../services/telemetryChecker";
import { sendWebPushToOrg } from "../services/pushService";

/**
 * MioConnect forwards `createdAt` as a unix timestamp in seconds
 * (e.g. 1623246440), consistent across telemetry/status/heartbeat payloads
 * per the integration doc. Falls back to "now" if missing/malformed so a
 * malformed payload still lands in the DB for inspection rather than 500ing.
 */
function resolveRecordedAt(createdAt: unknown): Date {
  if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
    return new Date(createdAt * 1000);
  }
  return new Date();
}

function resolveDeviceId(req: Request): string | undefined {
  const fromBody = req.body?.deviceId;
  if (typeof fromBody === "string" && fromBody.length > 0) {
    return fromBody;
  }
  const fromParams = req.params.deviceId;
  return typeof fromParams === "string" && fromParams.length > 0 ? fromParams : undefined;
}

function makeIngestHandler(kind: TelemetryKind) {
  return async (req: Request, res: Response) => {
    const deviceId = resolveDeviceId(req);

    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }

    const device = await prisma.device.findUnique({ where: { deviceId } });

    if (!device) {
      // Unknown/unprovisioned device: reject so MioConnect retries once it's
      // registered, rather than silently dropping or auto-creating an
      // unassigned (org-less) device record.
      return res.status(403).json({ error: "Forbidden" });
    }

    const recordedAt = resolveRecordedAt(req.body?.createdAt);

    // Auto-fill missing device metadata from the webhook payload
    const updateData: any = {};
    if (!device.modelNumber && typeof req.body?.modelNumber === "string" && req.body.modelNumber.trim()) {
      updateData.modelNumber = req.body.modelNumber.trim();
    }
    if (!device.imei && typeof req.body?.imei === "string" && req.body.imei.trim()) {
      updateData.imei = req.body.imei.trim();
    }
    if (!device.sn && typeof req.body?.sn === "string" && req.body.sn.trim()) {
      updateData.sn = req.body.sn.trim();
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.device.update({
        where: { id: device.id },
        data: updateData,
      });
    }

    const newEvent = await prisma.telemetryEvent.create({
      data: {
        deviceId: device.id,
        kind,
        payload: req.body,
        recordedAt,
      },
    });

    const deviceWithPatient = await prisma.device.findUnique({
      where: { id: device.id },
      include: { patient: true },
    });

    telemetryEmitter.emit("new-telemetry", { event: newEvent, device: deviceWithPatient });

    if (kind === TelemetryKind.TELEMETRY && deviceWithPatient) {
      const abnormalities = getTelemetryAbnormalities(req.body, deviceWithPatient.patient?.vitalThresholds);
      
      if (abnormalities.length > 0) {
        const patientName = deviceWithPatient.patient 
          ? `${deviceWithPatient.patient.firstName} ${deviceWithPatient.patient.lastName}` 
          : `Device ${device.deviceId}`;
        
        await sendWebPushToOrg(device.orgId, {
          title: `Abnormal reading for ${patientName}`,
          body: abnormalities.join("\n"),
          url: `/devices/${device.id}`
        });

        await logAuditEvent("ALERT_GENERATED", {
          orgId: device.orgId,
          target: "Device",
          targetId: device.id,
          details: {
            title: `Abnormal reading for ${patientName}`,
            body: abnormalities.join("\n"),
            url: `/devices/${device.id}`
          }
        });
      }
    }

    const transmissionTimeMs = Date.now() - recordedAt.getTime();
    await logAuditEvent("TELEMETRY_RECEIVED", {
      orgId: device.orgId,
      target: "Device",
      targetId: device.id,
      details: {
        kind,
        deviceId: device.deviceId,
        transmissionTimeMs: transmissionTimeMs >= 0 ? transmissionTimeMs : null,
      },
    });

    res.status(200).json({ success: true });
  };
}

export const ingestTelemetry = makeIngestHandler(TelemetryKind.TELEMETRY);
export const ingestStatus = makeIngestHandler(TelemetryKind.STATUS);
export const ingestHeartbeat = makeIngestHandler(TelemetryKind.HEARTBEAT);
