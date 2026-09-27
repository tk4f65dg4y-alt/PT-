import { Router } from "express";
import { prisma } from "../db";
import { hashPassword, requireAuth, requireRole } from "../auth";
import { computeClientStats } from "../lib/stats";
import { sendPushToUsers } from "../lib/push";
import { streamVideo } from "../lib/videoStream";

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

// Private trainer notes on a client — never exposed via the client API.
router.put("/clients/:id/notes", async (req, res) => {
  const { notes } = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.role !== "CLIENT") return res.status(404).json({ error: "Not found" });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { notes: typeof notes === "string" ? notes : null },
  });
  res.json({ notes: updated.notes });
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
      members: { include: { user: { select: { id: true, name: true, email: true, notes: true } } } },
      plans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) return res.status(404).json({ error: "Not found" });
  res.json(group);
});

// Shown at the top of the client's home screen — set/update any time.
router.put("/groups/:id/coach-note", async (req, res) => {
  const { note } = req.body || {};
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Not found" });
  const trimmed = typeof note === "string" ? note.trim() : "";
  const updated = await prisma.group.update({
    where: { id: group.id },
    data: { coachNote: trimmed || null, coachNoteAt: trimmed ? new Date() : null },
  });
  res.json({ coachNote: updated.coachNote, coachNoteAt: updated.coachNoteAt });
});

// ---- Plans ----

router.post("/groups/:id/plans", async (req, res) => {
  const { title, notes, startDate, expiresAt, priceLabel, weeks } = req.body || {};
  if (!title) return res.status(400).json({ error: "Title is required" });
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Group not found" });

  const plan = await prisma.plan.create({
    data: {
      groupId: group.id,
      title,
      notes: notes || null,
      startDate: startDate ? new Date(startDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      priceLabel: priceLabel || null,
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
                  libraryItemId: e.libraryItemId ?? null,
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
              exercises: { orderBy: { index: "asc" }, include: { completions: true, libraryItem: true } },
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
  const { title, notes, startDate, expiresAt, priceLabel, archived, weeks } = req.body || {};
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
                    libraryItemId: e.libraryItemId ?? null,
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
      expiresAt: expiresAt === undefined ? undefined : expiresAt ? new Date(expiresAt) : null,
      priceLabel: priceLabel === undefined ? undefined : priceLabel || null,
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

// Wipes logged progress (checkmarks + workout timings) for this plan across
// every member, without touching its structure — for restarting a cycle.
router.post("/plans/:id/reset", async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!plan) return res.status(404).json({ error: "Not found" });
  await prisma.completion.deleteMany({ where: { exercise: { day: { week: { planId: plan.id } } } } });
  await prisma.workoutSession.deleteMany({ where: { day: { week: { planId: plan.id } } } });
  res.json({ ok: true });
});

// ---- Stats (streaks & badges) ----

router.get("/groups/:groupId/stats/:userId", async (req, res) => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: req.params.groupId, userId: req.params.userId },
  });
  if (!membership) return res.status(404).json({ error: "Not found" });
  const stats = await computeClientStats(req.params.userId);
  res.json(stats);
});

router.get("/groups/:groupId/checkins/:userId", async (req, res) => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: req.params.groupId, userId: req.params.userId },
  });
  if (!membership) return res.status(404).json({ error: "Not found" });
  const checkIns = await prisma.workoutCheckIn.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { session: { include: { day: true } } },
  });
  res.json(checkIns);
});

// ---- Messaging (one thread per group) ----

router.get("/groups/:id/messages", async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { groupId: req.params.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  await prisma.message.updateMany({
    where: { groupId: req.params.id, senderId: { not: req.user!.id }, readAt: null },
    data: { readAt: new Date() },
  });
  res.json(messages);
});

router.post("/groups/:id/messages", async (req, res) => {
  const { body } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: "Message can't be empty" });
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: { members: true },
  });
  if (!group) return res.status(404).json({ error: "Not found" });

  const message = await prisma.message.create({
    data: { groupId: group.id, senderId: req.user!.id, body: String(body).trim() },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  sendPushToUsers(
    group.members.map((m) => m.userId),
    { title: `New message from ${req.user!.name}`, body: message.body, url: "/messages" }
  ).catch(() => {});
  res.status(201).json(message);
});

router.get("/messages/unread-counts", async (req, res) => {
  const rows = await prisma.message.groupBy({
    by: ["groupId"],
    where: { senderId: { not: req.user!.id }, readAt: null },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.groupId] = r._count._all;
  res.json(counts);
});

// ---- Nudge (manual push reminder) ----

router.post("/groups/:id/nudge", async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id }, include: { members: true } });
  if (!group) return res.status(404).json({ error: "Not found" });
  const message = (req.body?.message as string) || "Your trainer just nudged you — time to get that workout in! 💪";
  await sendPushToUsers(
    group.members.map((m) => m.userId),
    { title: "Casey Bond PT", body: message, url: "/" }
  );
  res.json({ ok: true });
});

// ---- 1:1 session bookings ----

router.get("/bookings", async (_req, res) => {
  const bookings = await prisma.sessionBooking.findMany({
    orderBy: [{ status: "asc" }, { startTime: "asc" }],
    include: {
      requestedBy: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });
  res.json(bookings);
});

// ---- Form-check videos ----

router.get("/groups/:groupId/form-checks/:userId", async (req, res) => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: req.params.groupId, userId: req.params.userId },
  });
  if (!membership) return res.status(404).json({ error: "Not found" });
  const videos = await prisma.formCheckVideo.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  res.json(videos);
});

router.get("/form-checks/:id/file", async (req, res) => {
  const video = await prisma.formCheckVideo.findUnique({ where: { id: req.params.id } });
  if (!video) return res.status(404).json({ error: "Not found" });
  streamVideo(res, video, req.headers.range);
});

router.post("/form-checks/:id/comments", async (req, res) => {
  const { body, timestampSec } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: "Comment can't be empty" });
  const video = await prisma.formCheckVideo.findUnique({ where: { id: req.params.id } });
  if (!video) return res.status(404).json({ error: "Not found" });
  const comment = await prisma.formCheckComment.create({
    data: {
      videoId: video.id,
      authorId: req.user!.id,
      body: String(body).trim(),
      timestampSec: typeof timestampSec === "number" ? timestampSec : null,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  sendPushToUsers([video.userId], {
    title: `${req.user!.name} commented on your form check`,
    body: comment.body,
    url: "/form-checks",
  }).catch(() => {});
  res.status(201).json(comment);
});

// ---- Workout templates ----

const templateInclude = {
  weeks: {
    orderBy: { index: "asc" as const },
    include: {
      days: {
        orderBy: { index: "asc" as const },
        include: { exercises: { orderBy: { index: "asc" as const } } },
      },
    },
  },
};

router.get("/templates", async (_req, res) => {
  const templates = await prisma.planTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: templateInclude,
  });
  res.json(templates);
});

router.get("/templates/:id", async (req, res) => {
  const template = await prisma.planTemplate.findUnique({
    where: { id: req.params.id },
    include: templateInclude,
  });
  if (!template) return res.status(404).json({ error: "Not found" });
  res.json(template);
});

router.post("/templates", async (req, res) => {
  const { title, notes, weeks } = req.body || {};
  if (!title) return res.status(400).json({ error: "Title is required" });
  const template = await prisma.planTemplate.create({
    data: {
      title,
      notes: notes || null,
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
                  libraryItemId: e.libraryItemId ?? null,
                })),
              },
            })),
          },
        })),
      },
    },
    include: templateInclude,
  });
  res.status(201).json(template);
});

// Snapshots an existing plan's structure into a reusable template.
router.post("/plans/:id/save-as-template", async (req, res) => {
  const { title } = req.body || {};
  const plan = await prisma.plan.findUnique({
    where: { id: req.params.id },
    include: {
      weeks: { orderBy: { index: "asc" }, include: { days: { orderBy: { index: "asc" }, include: { exercises: { orderBy: { index: "asc" } } } } } },
    },
  });
  if (!plan) return res.status(404).json({ error: "Not found" });
  const template = await prisma.planTemplate.create({
    data: {
      title: (title && String(title).trim()) || plan.title,
      notes: plan.notes,
      createdById: req.user!.id,
      weeks: {
        create: plan.weeks.map((w) => ({
          index: w.index,
          label: w.label,
          days: {
            create: w.days.map((d) => ({
              index: d.index,
              label: d.label,
              exercises: {
                create: d.exercises.map((e) => ({
                  index: e.index,
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  weight: e.weight,
                  restSeconds: e.restSeconds,
                  notes: e.notes,
                  libraryItemId: e.libraryItemId,
                })),
              },
            })),
          },
        })),
      },
    },
    include: templateInclude,
  });
  res.status(201).json(template);
});

router.delete("/templates/:id", async (req, res) => {
  await prisma.planTemplate.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});

// Creates a new plan for a group by copying a template's structure.
router.post("/groups/:groupId/plans/from-template/:templateId", async (req, res) => {
  const { title, startDate, expiresAt, priceLabel } = req.body || {};
  const group = await prisma.group.findUnique({ where: { id: req.params.groupId } });
  if (!group) return res.status(404).json({ error: "Group not found" });
  const template = await prisma.planTemplate.findUnique({
    where: { id: req.params.templateId },
    include: templateInclude,
  });
  if (!template) return res.status(404).json({ error: "Template not found" });

  const plan = await prisma.plan.create({
    data: {
      groupId: group.id,
      title: (title && String(title).trim()) || template.title,
      notes: template.notes,
      startDate: startDate ? new Date(startDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      priceLabel: priceLabel || null,
      createdById: req.user!.id,
      weeks: {
        create: template.weeks.map((w) => ({
          index: w.index,
          label: w.label,
          days: {
            create: w.days.map((d) => ({
              index: d.index,
              label: d.label,
              exercises: {
                create: d.exercises.map((e) => ({
                  index: e.index,
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  weight: e.weight,
                  restSeconds: e.restSeconds,
                  notes: e.notes,
                  libraryItemId: e.libraryItemId,
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

router.post("/bookings/:id/respond", async (req, res) => {
  const { status, trainerNote } = req.body || {};
  if (!["CONFIRMED", "DECLINED"].includes(status)) {
    return res.status(400).json({ error: "status must be CONFIRMED or DECLINED" });
  }
  const booking = await prisma.sessionBooking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.sessionBooking.update({
    where: { id: booking.id },
    data: { status, trainerNote: trainerNote ?? undefined, respondedAt: new Date() },
  });
  const when = new Date(booking.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  sendPushToUsers([booking.requestedById], {
    title: status === "CONFIRMED" ? "Session confirmed ✅" : "Session request declined",
    body: status === "CONFIRMED" ? `Your session on ${when} is confirmed.` : `Your request for ${when} was declined.`,
    url: "/book",
  }).catch(() => {});
  res.json(updated);
});

export default router;
