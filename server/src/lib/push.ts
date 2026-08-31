import webpush from "web-push";
import { prisma } from "../db";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com";

export const pushConfigured = Boolean(publicKey && privateKey);

if (pushConfigured) {
  webpush.setVapidDetails(contact, publicKey!, privateKey!);
} else {
  console.warn("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled.");
}

/** Sends a push notification to every subscription a user has registered.
 * Silently prunes subscriptions the browser has revoked (404/410). */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!pushConfigured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Push send failed", err?.statusCode, err?.body);
        }
      }
    })
  );
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}

export async function sendPushToTrainers(payload: { title: string; body: string; url?: string }) {
  const trainers = await prisma.user.findMany({ where: { role: "TRAINER" }, select: { id: true } });
  await sendPushToUsers(trainers.map((t) => t.id), payload);
}
