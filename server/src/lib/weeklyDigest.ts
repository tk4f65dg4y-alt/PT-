import { prisma } from "../db";
import { sendPushToTrainers, pushConfigured } from "./push";

function startOfWeekUTC(d: Date) {
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek));
}

/** Sends the trainer one push a week summarizing every group's activity —
 * sessions logged and form checks still waiting on a reply — so a quiet
 * client shows up without opening the admin panel. Meant to run weekly;
 * safe to call repeatedly. */
export async function sendWeeklyDigest() {
  if (!pushConfigured) return;
  const weekStart = startOfWeekUTC(new Date());

  const groups = await prisma.group.findMany({
    include: { members: { include: { user: { select: { name: true } } } } },
  });
  if (groups.length === 0) return;

  const lines: string[] = [];
  for (const group of groups) {
    if (group.members.length === 0) continue;
    const memberIds = group.members.map((m) => m.userId);
    const sessions = await prisma.workoutSession.count({
      where: { userId: { in: memberIds }, startedAt: { gte: weekStart } },
    });
    const names = group.members.map((m) => m.user.name).join(" & ");
    lines.push(`${names}: ${sessions} session${sessions === 1 ? "" : "s"}`);
  }

  const videosThisWeek = await prisma.formCheckVideo.findMany({
    where: { createdAt: { gte: weekStart } },
    select: {
      comments: { orderBy: { createdAt: "desc" }, take: 1, select: { author: { select: { role: true } } } },
    },
  });
  const awaitingReply = videosThisWeek.filter(
    (v) => v.comments.length === 0 || v.comments[0].author.role !== "TRAINER"
  ).length;

  const parts = [...lines];
  if (awaitingReply > 0) {
    parts.push(`${awaitingReply} form check${awaitingReply === 1 ? "" : "s"} waiting on your reply`);
  }
  if (parts.length === 0) return;

  await sendPushToTrainers({
    title: "Your week with clients",
    body: parts.join(" · "),
    url: "/admin",
  });
}
