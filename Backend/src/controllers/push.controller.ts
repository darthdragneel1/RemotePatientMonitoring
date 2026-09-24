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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const orgId = req.user?.orgId;
    
    const where: any = { action: "ALERT_GENERATED" };
    if (orgId) {
      where.orgId = orgId;
    }

    let logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // If few or no logs, backfill from recent TelemetryEvents that had abnormalities
    if (logs.length < 5) {
      const eventWhere: any = { kind: "TELEMETRY" };
      if (orgId) {
        eventWhere.device = { orgId };
      }

      const recentEvents = await prisma.telemetryEvent.findMany({
        where: eventWhere,
        orderBy: { recordedAt: "desc" },
        take: 25,
        include: { device: { include: { patient: true } } },
      });

      for (const ev of recentEvents) {
        if (!ev.device) continue;
        const abnormalities = getTelemetryAbnormalities(ev.payload, ev.device.patient?.vitalThresholds);
        if (abnormalities.length > 0) {
          const patientName = ev.device.patient
            ? `${ev.device.patient.firstName} ${ev.device.patient.lastName}`
            : `Device ${ev.device.deviceId}`;

          const existing = await prisma.auditLog.findFirst({
            where: {
              action: "ALERT_GENERATED",
              targetId: ev.device.id,
              createdAt: {
                gte: new Date(ev.recordedAt.getTime() - 10000),
                lte: new Date(ev.recordedAt.getTime() + 10000),
              },
            },
          });

          if (!existing) {
            await prisma.auditLog.create({
              data: {
                action: "ALERT_GENERATED",
                orgId: ev.device.orgId,
                target: "Device",
                targetId: ev.device.id,
                details: {
                  title: `Abnormal reading for ${patientName}`,
                  body: abnormalities.join("\n"),
                  url: `/devices/${ev.device.id}`,
                  level: "error",
                },
                createdAt: ev.recordedAt,
              },
            });
          }
        }
      }

      logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    res.json({ logs });
  } catch (err) {
    console.error("Failed to fetch alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
}
