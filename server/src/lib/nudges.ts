import { prisma } from "../db";
import { sendPushToUser, pushConfigured } from "./push";

const INACTIVE_HOURS = 40;

/** Nudges any client with an active plan and a push subscription who hasn't
 * logged a completion or workout session in the last INACTIVE_HOURS. Meant
 * to run once a day; safe to call repeatedly (idempotent — it just re-nudges
 * anyone still inactive). */
export async function sendInactivityNudges() {
  if (!pushConfigured) return;
  const cutoff = new Date(Date.now() - INACTIVE_HOURS * 60 * 60 * 1000);

  const clients = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      pushSubscriptions: { some: {} },
      groupMemberships: { some: { group: { plans: { some: { archived: false } } } } },
    },
    select: { id: true, name: true },
  });

  let sent = 0;
  for (const client of clients) {
    const [lastCompletion, lastSession] = await Promise.all([
      prisma.completion.findFirst({
        where: { userId: client.id },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
      prisma.workoutSession.findFirst({
        where: { userId: client.id },
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      }),
    ]);
    const lastActive = [lastCompletion?.completedAt, lastSession?.startedAt]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (lastActive && lastActive > cutoff) continue;

    await sendPushToUser(client.id, {
      title: "Casey Bond PT",
      body: "You haven't logged a workout in a couple of days — let's get back on track! 💪",
      url: "/",
    });
    sent += 1;
  }
  if (sent > 0) console.log(`Sent inactivity nudges to ${sent} client(s)`);
}
