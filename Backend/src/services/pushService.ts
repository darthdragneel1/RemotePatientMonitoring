import webpush from "web-push";
import { prisma } from "../db/prisma";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys not set in environment. Web Push will not work.");
}

export async function sendWebPushToOrg(orgId: string | null | undefined, payload: any) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  try {
    // Find all users in the org plus super admins
    const where: any = orgId
      ? { OR: [{ orgId }, { role: "SUPER_ADMIN" }] }
      : { role: "SUPER_ADMIN" };

    const orgUsers = await prisma.user.findMany({
      where,
      include: { pushSubscriptions: true },
    });

    const notifications: Promise<any>[] = [];

    for (const user of orgUsers) {
      for (const sub of user.pushSubscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const pushPromise = webpush
          .sendNotification(pushSubscription, JSON.stringify(payload))
          .catch(async (error) => {
            if (error.statusCode === 404 || error.statusCode === 410) {
              // Subscription has expired or is no longer valid
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            } else {
              console.error("Error sending push notification:", error);
            }
          });

        notifications.push(pushPromise);
      }
    }

    await Promise.all(notifications);
  } catch (err) {
    console.error("Failed to send web push to org:", err);
  }
}
