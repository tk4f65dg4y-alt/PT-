import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../auth";
import { computeClientStats } from "../lib/stats";
import { sendPushToUsers } from "../lib/push";

const router = Router();
router.use(requireAuth, requireRole("CLIENT"));

async function myGroupIds(userId: string) {
  const memberships = await prisma.groupMember.findMany({ where: { userId } });
  return memberships.map((m) => m.groupId);
}

router.get("/plans", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const plans = await prisma.plan.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, notes: true, startDate: true, archived: true, createdAt: true },
  });
  res.json(plans);
});

router.get("/plans/:id", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const plan = await prisma.plan.findFirst({
    where: { id: req.params.id, groupId: { in: groupIds } },
    include: {
      weeks: {
        orderBy: { index: "asc" },
        include: {
          days: {
            orderBy: { index: "asc" },
            include: {
              exercises: {
                orderBy: { index: "asc" },
                include: { completions: { where: { userId: req.user!.id } }, libraryItem: true },
              },
              sessions: { where: { userId: req.user!.id } },
            },
          },
        },
      },
    },
  });
  if (!plan) return res.status(404).json({ error: "Not found" });
  res.json(plan);
});

router.post("/exercises/:id/complete", async (req, res) => {
  const { completed, actualSets, actualReps, actualWeight, notes } = req.body || {};
  const exercise = await prisma.exercise.findUnique({
    where: { id: req.params.id },
    include: { day: { include: { week: { include: { plan: true } } } } },
  });
  if (!exercise) return res.status(404).json({ error: "Not found" });
  const groupIds = await myGroupIds(req.user!.id);
  if (!groupIds.includes(exercise.day.week.plan.groupId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (completed === false) {
    await prisma.completion
      .delete({ where: { exerciseId_userId: { exerciseId: exercise.id, userId: req.user!.id } } })
      .catch(() => {});
    return res.json({ completed: false });
  }

  const completion = await prisma.completion.upsert({
    where: { exerciseId_userId: { exerciseId: exercise.id, userId: req.user!.id } },
    create: {
      exerciseId: exercise.id,
      userId: req.user!.id,
      actualSets: actualSets ?? null,
      actualReps: actualReps ?? null,
      actualWeight: actualWeight ?? null,
      notes: notes ?? null,
    },
    update: {
      completedAt: new Date(),
      actualSets: actualSets ?? null,
      actualReps: actualReps ?? null,
      actualWeight: actualWeight ?? null,
      notes: notes ?? null,
    },
  });
  res.json(completion);
});

router.post("/days/:id/sessions/start", async (req, res) => {
  const day = await prisma.day.findUnique({
    where: { id: req.params.id },
    include: { week: { include: { plan: true } } },
  });
  if (!day) return res.status(404).json({ error: "Not found" });
  const groupIds = await myGroupIds(req.user!.id);
  if (!groupIds.includes(day.week.plan.groupId)) return res.status(403).json({ error: "Forbidden" });

  const session = await prisma.workoutSession.create({
    data: { dayId: day.id, userId: req.user!.id },
  });
  res.status(201).json(session);
});

router.post("/sessions/:id/finish", async (req, res) => {
  const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id } });
  if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const endedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000));
  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: { endedAt, durationSeconds },
  });
  res.json(updated);
});

router.get("/history", async (req, res) => {
  const completions = await prisma.completion.findMany({
    where: { userId: req.user!.id },
    orderBy: { completedAt: "desc" },
    take: 200,
    include: {
      exercise: { include: { day: { include: { week: { include: { plan: true } } } } } },
    },
  });
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { day: { include: { week: { include: { plan: true } } } } },
  });
  res.json({ completions, sessions });
});

router.get("/stats", async (req, res) => {
  const stats = await computeClientStats(req.user!.id);
  res.json(stats);
});

// ---- Messaging (one thread per group, shared with any training partner) ----

router.get("/messages", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const groupId = groupIds[0];
  if (!groupId) return res.json([]);
  const messages = await prisma.message.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  await prisma.message.updateMany({
    where: { groupId, senderId: { not: req.user!.id }, readAt: null },
    data: { readAt: new Date() },
  });
  res.json(messages);
});

router.post("/messages", async (req, res) => {
  const { body } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: "Message can't be empty" });
  const groupIds = await myGroupIds(req.user!.id);
  const groupId = groupIds[0];
  if (!groupId) return res.status(400).json({ error: "No group" });

  const message = await prisma.message.create({
    data: { groupId, senderId: req.user!.id, body: String(body).trim() },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  const trainers = await prisma.user.findMany({ where: { role: "TRAINER" }, select: { id: true } });
  sendPushToUsers(
    trainers.map((t) => t.id),
    { title: `Message from ${req.user!.name}`, body: message.body, url: "/admin" }
  ).catch(() => {});
  res.status(201).json(message);
});

router.get("/messages/unread-count", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const count = await prisma.message.count({
    where: { groupId: { in: groupIds }, senderId: { not: req.user!.id }, readAt: null },
  });
  res.json({ count });
});

export default router;
