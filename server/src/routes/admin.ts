import { Router } from "express";
import { prisma } from "../db";
import { hashPassword, requireAuth, requireRole } from "../auth";

const router = Router();
router.use(requireAuth, requireRole("TRAINER"));

// ---- Clients ----

router.post("/clients", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "A user with that email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role: "CLIENT" },
  });
  const group = await prisma.group.create({
    data: { name: user.name, members: { create: { userId: user.id } } },
  });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, groupId: group.id });
});

// ---- Groups (a "client" on the dashboard is a group of 1; a pair is a group of 2) ----

router.get("/groups", async (_req, res) => {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      plans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, title: true, startDate: true, archived: true },
      },
    },
  });

  const memberIds = groups.flatMap((g) => g.members.map((m) => m.userId));
  const [lastCompletions, lastSessions] = await Promise.all([
    prisma.completion.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds } },
      _max: { completedAt: true },
    }),
    prisma.workoutSession.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds } },
      _max: { startedAt: true },
    }),
  ]);
  const lastActivityByUser = new Map<string, Date>();
  for (const c of lastCompletions) {
    if (c._max.completedAt) lastActivityByUser.set(c.userId, c._max.completedAt);
  }
  for (const s of lastSessions) {
    if (s._max.startedAt) {
      const prev = lastActivityByUser.get(s.userId);
      if (!prev || s._max.startedAt > prev) lastActivityByUser.set(s.userId, s._max.startedAt);
    }
  }

  const result = groups.map((g) => {
    const activityDates = g.members
      .map((m) => lastActivityByUser.get(m.userId))
      .filter((d): d is Date => !!d);
    const lastActivityAt = activityDates.length
      ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
      : null;
    return {
      id: g.id,
      name: g.name,
      isPair: g.members.length > 1,
      members: g.members.map((m) => m.user),
      currentPlan: g.plans[0] || null,
      lastActivityAt,
    };
  });

  res.json(result);
});

router.post("/groups", async (req, res) => {
  const { name, memberUserIds } = req.body || {};
  if (!name || !Array.isArray(memberUserIds) || memberUserIds.length === 0) {
    return res.status(400).json({ error: "Name and at least one member are required" });
  }
  // A client belongs to exactly one group at a time — pull them out of any
  // existing group first (and clean up groups left empty).
  const oldMemberships = await prisma.groupMember.findMany({
    where: { userId: { in: memberUserIds } },
  });
  const oldGroupIds = [...new Set(oldMemberships.map((m) => m.groupId))];
  await prisma.groupMember.deleteMany({ where: { userId: { in: memberUserIds } } });
  for (const gid of oldGroupIds) {
    const remaining = await prisma.groupMember.count({ where: { groupId: gid } });
    if (remaining === 0) await prisma.group.delete({ where: { id: gid } }).catch(() => {});
  }

  const group = await prisma.group.create({
    data: {
      name,
      members: { create: memberUserIds.map((userId: string) => ({ userId })) },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  res.status(201).json(group);
});

router.get("/groups/:id", async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      plans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) return res.status(404).json({ error: "Not found" });
  res.json(group);
});

// ---- Plans ----

router.post("/groups/:id/plans", async (req, res) => {
  const { title, notes, startDate, weeks } = req.body || {};
  if (!title) return res.status(400).json({ error: "Title is required" });
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Group not found" });

  const plan = await prisma.plan.create({
    data: {
      groupId: group.id,
      title,
      notes: notes || null,
      startDate: startDate ? new Date(startDate) : null,
      createdById: req.user!.id,
      weeks: {
        create: (weeks || []).map((w: any, wi: number) => ({
          index: wi,
          label: w.label || `Week ${wi + 1}`,
          days: {
            create: (w.days || []).map((d: any, di: number) => ({
              index: di,
              label: d.label || `Day ${di + 1}`,
              exercises: {
                create: (d.exercises || []).map((e: any, ei: number) => ({
                  index: ei,
                  name: e.name,
                  sets: e.sets ?? null,
                  reps: e.reps ?? null,
                  weight: e.weight ?? null,
                  restSeconds: e.restSeconds ?? null,
                  notes: e.notes ?? null,
                })),
              },
            })),
          },
        })),
      },
    },
    include: { weeks: { include: { days: { include: { exercises: true } } } } },
  });
  res.status(201).json(plan);
});

router.get("/plans/:id", async (req, res) => {
  const plan = await prisma.plan.findUnique({
    where: { id: req.params.id },
    include: {
      group: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
      weeks: {
        orderBy: { index: "asc" },
        include: {
          days: {
            orderBy: { index: "asc" },
            include: {
              exercises: { orderBy: { index: "asc" }, include: { completions: true } },
              sessions: true,
            },
          },
        },
      },
    },
  });
  if (!plan) return res.status(404).json({ error: "Not found" });
  res.json(plan);
});

router.put("/plans/:id", async (req, res) => {
  const { title, notes, startDate, archived, weeks } = req.body || {};
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (Array.isArray(weeks)) {
    // Full structural edit — replace weeks (and everything nested under them,
    // including logged completions for this plan).
    await prisma.week.deleteMany({ where: { planId: existing.id } });
    await prisma.plan.update({
      where: { id: existing.id },
      data: {
        weeks: {
          create: weeks.map((w: any, wi: number) => ({
            index: wi,
            label: w.label || `Week ${wi + 1}`,
            days: {
              create: (w.days || []).map((d: any, di: number) => ({
                index: di,
                label: d.label || `Day ${di + 1}`,
                exercises: {
                  create: (d.exercises || []).map((e: any, ei: number) => ({
                    index: ei,
                    name: e.name,
                    sets: e.sets ?? null,
                    reps: e.reps ?? null,
                    weight: e.weight ?? null,
                    restSeconds: e.restSeconds ?? null,
                    notes: e.notes ?? null,
                  })),
                },
              })),
            },
          })),
        },
      },
    });
  }

  const plan = await prisma.plan.update({
    where: { id: existing.id },
    data: {
      title: title ?? undefined,
      notes: notes === undefined ? undefined : notes,
      startDate: startDate === undefined ? undefined : startDate ? new Date(startDate) : null,
      archived: archived === undefined ? undefined : archived,
    },
    include: { weeks: { include: { days: { include: { exercises: true } } } } },
  });
  res.json(plan);
});

router.delete("/plans/:id", async (req, res) => {
  await prisma.plan.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});

export default router;
