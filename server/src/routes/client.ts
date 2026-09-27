import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../auth";
import { computeClientStats } from "../lib/stats";
import { sendPushToUsers, sendPushToTrainers } from "../lib/push";
import { attachLastPerformance } from "../lib/overload";
import { streamVideo } from "../lib/videoStream";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const router = Router();
router.use(requireAuth, requireRole("CLIENT"));

async function myGroupIds(userId: string) {
  const memberships = await prisma.groupMember.findMany({ where: { userId } });
  return memberships.map((m) => m.groupId);
}

// Flattens a plan's weeks->days into calendar order and picks "today's"
// day: if the plan has a start date, the day whose sequential offset lands
// on today; otherwise the first day this user hasn't fully completed yet
// (so a date-less rotation plan like a repeating split still has a sane
// "what's next" answer). Returns null once every day is done.
function computeTodayDayId(plan: {
  startDate: Date | null;
  weeks: { days: { id: string; exercises: { completions: { id: string }[] }[] }[] }[];
}): string | null {
  const flat = plan.weeks.flatMap((w) => w.days);
  if (flat.length === 0) return null;

  if (plan.startDate) {
    const startKey = Date.UTC(
      plan.startDate.getUTCFullYear(),
      plan.startDate.getUTCMonth(),
      plan.startDate.getUTCDate()
    );
    const todayKey = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    );
    const offset = Math.round((todayKey - startKey) / 86400000);
    if (offset >= 0 && offset < flat.length) return flat[offset].id;
  }

  const nextIncomplete = flat.find(
    (d) => d.exercises.length === 0 || d.exercises.some((e) => e.completions.length === 0)
  );
  return (nextIncomplete || flat[flat.length - 1]).id;
}

router.get("/home", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const group = await prisma.group.findUnique({ where: { id: groupIds[0] } });
  const plan = await prisma.plan.findFirst({
    where: { groupId: { in: groupIds }, archived: false },
    orderBy: { createdAt: "desc" },
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
  const stats = await computeClientStats(req.user!.id);
  res.json({
    group: group ? { id: group.id, name: group.name, coachNote: group.coachNote, coachNoteAt: group.coachNoteAt } : null,
    plan,
    todayDayId: plan ? computeTodayDayId(plan) : null,
    stats,
  });
});

router.get("/plans", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const plans = await prisma.plan.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      notes: true,
      startDate: true,
      expiresAt: true,
      priceLabel: true,
      archived: true,
      createdAt: true,
    },
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
  const flatExercises = plan.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises));
  const withPerf = await attachLastPerformance(flatExercises, req.user!.id);
  const perfByExerciseId = new Map(withPerf.map((e) => [e.id, e.lastPerformance]));
  const planWithPerf = {
    ...plan,
    weeks: plan.weeks.map((w) => ({
      ...w,
      days: w.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) => ({ ...e, lastPerformance: perfByExerciseId.get(e.id) ?? null })),
      })),
    })),
  };
  res.json(planWithPerf);
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
  sendPushToTrainers({
    title: "Workout started",
    body: `${req.user!.name} just started "${day.label}"`,
    url: `/admin/groups/${day.week.plan.groupId}`,
  }).catch(() => {});
  res.status(201).json(session);
});

router.post("/sessions/:id/finish", async (req, res) => {
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.id },
    include: { day: { include: { week: { include: { plan: true } }, exercises: { include: { completions: { where: { userId: req.user!.id } } } } } } },
  });
  if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const endedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000));
  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: { endedAt, durationSeconds },
  });

  const total = session.day.exercises.length;
  const done = session.day.exercises.filter((e) => e.completions.length > 0).length;
  const allDone = total > 0 && done === total;
  sendPushToTrainers({
    title: allDone ? "Workout finished ✅" : "Workout finished ⚠️",
    body: `${req.user!.name} finished "${session.day.label}" in ${formatDuration(durationSeconds)} — ${done}/${total} exercises${allDone ? "" : " (not all completed)"}`,
    url: `/admin/groups/${session.day.week.plan.groupId}`,
  }).catch(() => {});

  res.json(updated);
});

router.post("/sessions/:id/checkin", async (req, res) => {
  const { rating, note } = req.body || {};
  if (!["EASY", "JUST_RIGHT", "BRUTAL"].includes(rating)) {
    return res.status(400).json({ error: "rating must be EASY, JUST_RIGHT or BRUTAL" });
  }
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.id },
    include: { day: { include: { week: { include: { plan: true } } } } },
  });
  if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });

  const checkIn = await prisma.workoutCheckIn.upsert({
    where: { sessionId: session.id },
    create: { sessionId: session.id, userId: req.user!.id, rating, note: note || null },
    update: { rating, note: note || null },
  });

  const trimmedNote = (note || "").trim();
  if (trimmedNote) {
    const message = await prisma.message.create({
      data: {
        groupId: session.day.week.plan.groupId,
        senderId: req.user!.id,
        body: `Re: "${session.day.label}" — ${trimmedNote}`,
      },
    });
    sendPushToTrainers({
      title: `${req.user!.name} has a question`,
      body: message.body,
      url: `/admin/groups/${session.day.week.plan.groupId}`,
    }).catch(() => {});
  }

  res.status(201).json(checkIn);
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

// ---- 1:1 session bookings ----

router.get("/bookings", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const bookings = await prisma.sessionBooking.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { startTime: "asc" },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
  res.json(bookings);
});

router.post("/bookings", async (req, res) => {
  const { startTime, clientNote } = req.body || {};
  if (!startTime) return res.status(400).json({ error: "startTime is required" });
  const groupIds = await myGroupIds(req.user!.id);
  const groupId = groupIds[0];
  if (!groupId) return res.status(400).json({ error: "No group" });

  const booking = await prisma.sessionBooking.create({
    data: {
      groupId,
      requestedById: req.user!.id,
      startTime: new Date(startTime),
      clientNote: clientNote || null,
    },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
  const trainers = await prisma.user.findMany({ where: { role: "TRAINER" }, select: { id: true } });
  const when = new Date(booking.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  sendPushToUsers(
    trainers.map((t) => t.id),
    { title: "New session request", body: `${req.user!.name} requested ${when}`, url: "/admin/bookings" }
  ).catch(() => {});
  res.status(201).json(booking);
});

router.post("/bookings/:id/cancel", async (req, res) => {
  const groupIds = await myGroupIds(req.user!.id);
  const booking = await prisma.sessionBooking.findUnique({ where: { id: req.params.id } });
  if (!booking || !groupIds.includes(booking.groupId)) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.sessionBooking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  res.json(updated);
});

// ---- Form-check videos ----

router.get("/form-checks", async (req, res) => {
  const videos = await prisma.formCheckVideo.findMany({
    where: { userId: req.user!.id },
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

router.post("/form-checks", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video file received" });
  const { exerciseId, label } = req.body || {};
  if (!req.file.mimetype.startsWith("video/")) {
    return res.status(400).json({ error: "File must be a video" });
  }
  const video = await prisma.formCheckVideo.create({
    data: {
      userId: req.user!.id,
      exerciseId: exerciseId || null,
      label: (label && String(label).trim()) || "Form check",
      data: req.file.buffer,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
    select: { id: true, label: true, mimeType: true, sizeBytes: true, createdAt: true },
  });
  sendPushToTrainers({
    title: "New form check",
    body: `${req.user!.name} uploaded a video for "${video.label}"`,
    url: `/admin`,
  }).catch(() => {});
  res.status(201).json({ ...video, comments: [] });
});

router.get("/form-checks/:id/file", async (req, res) => {
  const video = await prisma.formCheckVideo.findUnique({ where: { id: req.params.id } });
  if (!video || video.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  streamVideo(res, video, req.headers.range);
});

router.post("/form-checks/:id/comments", async (req, res) => {
  const { body, timestampSec } = req.body || {};
  if (!body || !String(body).trim()) return res.status(400).json({ error: "Comment can't be empty" });
  const video = await prisma.formCheckVideo.findUnique({ where: { id: req.params.id } });
  if (!video || video.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const comment = await prisma.formCheckComment.create({
    data: {
      videoId: video.id,
      authorId: req.user!.id,
      body: String(body).trim(),
      timestampSec: typeof timestampSec === "number" ? timestampSec : null,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  sendPushToTrainers({
    title: `${req.user!.name} replied on a form check`,
    body: comment.body,
    url: `/admin`,
  }).catch(() => {});
  res.status(201).json(comment);
});

export default router;
