import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { getTelemetryAbnormalities } from "../services/telemetryChecker";

export async function getVapidPublicKey(req: Request, res: Response) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

export async function saveSubscription(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  try {
    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to save subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
}

export async function removeSubscription(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Endpoint required" });

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to remove subscription:", error);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
}

export async function getAlerts(req: Request, res: Response) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const orgId = req.user?.orgId;

    // 1. Fetch recent TelemetryEvents and identify all abnormal readings
    const eventWhere: any = { kind: "TELEMETRY" };
    if (orgId) {
      eventWhere.device = { orgId };
    }

    const recentEvents = await prisma.telemetryEvent.findMany({
      where: eventWhere,
      orderBy: { recordedAt: "desc" },
      take: limit * 2,
      include: {
        device: {
          include: { patient: true },
        },
      },
    });

    const telemetryAlerts: any[] = [];
    for (const ev of recentEvents) {
      if (!ev.device) continue;
      const abnormalities = getTelemetryAbnormalities(
        ev.payload,
        ev.device.patient?.vitalThresholds
      );
      if (abnormalities.length > 0) {
        const patientName = ev.device.patient
          ? `${ev.device.patient.firstName} ${ev.device.patient.lastName}`
          : `Device ${ev.device.deviceId}`;

        telemetryAlerts.push({
          id: `te-${ev.id}`,
          targetId: ev.device.id,
          createdAt: ev.recordedAt.toISOString(),
          details: {
            title: `Abnormal reading for ${patientName}`,
            body: abnormalities.join("\n"),
            url: `/devices/${ev.device.id}`,
            level: "error",
          },
        });
      }
    }

    // 2. Fetch AuditLog alerts
    const auditWhere: any = { action: "ALERT_GENERATED" };
    if (orgId) {
      auditWhere.orgId = orgId;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // 3. Merge both and deduplicate
    const combined = [...telemetryAlerts, ...auditLogs];
    const seen = new Set<string>();
    const deduplicated: any[] = [];

    for (const item of combined) {
      if (!item) continue;
      const url = item.details?.url || item.targetId || "";
      const timeMs = Math.floor(new Date(item.createdAt).getTime() / 20000);
      const dedupKey = `${url}_${timeMs}`;

      if (seen.has(item.id) || seen.has(dedupKey)) continue;
      seen.add(item.id);
      seen.add(dedupKey);
      deduplicated.push(item);
    }

    deduplicated.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ logs: deduplicated.slice(0, limit) });
  } catch (err) {
    console.error("Failed to fetch alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
}
