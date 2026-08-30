import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../auth";

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
                include: { completions: { where: { userId: req.user!.id } } },
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

export default router;
