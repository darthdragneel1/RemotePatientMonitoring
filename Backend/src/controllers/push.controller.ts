import { Request, Response } from "express";
import { prisma } from "../db/prisma";

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
