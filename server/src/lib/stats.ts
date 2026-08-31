import { prisma } from "../db";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  earned: boolean;
}

export interface ClientStats {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalExercises: number;
  lastActiveAt: string | null;
  badges: Badge[];
}

export async function computeClientStats(userId: string): Promise<ClientStats> {
  // A day only counts toward the streak once every exercise in it is
  // checked off — partial progress doesn't move the streak.
  const exercises = await prisma.exercise.findMany({
    where: { day: { week: { plan: { group: { members: { some: { userId } } } } } } },
    select: {
      dayId: true,
      completions: { where: { userId }, select: { completedAt: true } },
    },
  });

  const byDay = new Map<string, { total: number; done: number; latest: Date | null }>();
  for (const ex of exercises) {
    const entry = byDay.get(ex.dayId) || { total: 0, done: 0, latest: null };
    entry.total += 1;
    if (ex.completions.length > 0) {
      entry.done += 1;
      const c = ex.completions[0].completedAt;
      if (!entry.latest || c > entry.latest) entry.latest = c;
    }
    byDay.set(ex.dayId, entry);
  }

  const activeDays = new Set<string>();
  let lastActiveAt: Date | null = null;
  for (const entry of byDay.values()) {
    if (entry.total > 0 && entry.done === entry.total && entry.latest) {
      activeDays.add(dateKey(entry.latest));
      if (!lastActiveAt || entry.latest > lastActiveAt) lastActiveAt = entry.latest;
    }
  }

  const sortedDayTimes = [...activeDays]
    .map((k) => Date.parse(`${k}T00:00:00Z`))
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const t of sortedDayTimes) {
    if (prev !== null && t - prev === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = t;
  }

  // Current streak: walk backward from today (UTC), allowing today to be
  // "not yet done" without breaking the streak.
  let currentStreak = 0;
  const todayKey = dateKey(new Date());
  let cursor = Date.parse(`${todayKey}T00:00:00Z`);
  if (!activeDays.has(dateKey(new Date(cursor)))) {
    cursor -= DAY_MS; // today not finished yet — start checking from yesterday
  }
  while (activeDays.has(dateKey(new Date(cursor)))) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }

  const totalWorkouts = activeDays.size;
  const totalExercises = await prisma.completion.count({ where: { userId } });

  const badges: Badge[] = [
    {
      id: "first-workout",
      icon: "🎉",
      label: "First workout",
      description: "Complete every exercise in a workout",
      earned: totalWorkouts >= 1,
    },
    {
      id: "streak-3",
      icon: "🔥",
      label: "3-day streak",
      description: "Complete workouts 3 days in a row",
      earned: longestStreak >= 3,
    },
    {
      id: "streak-7",
      icon: "🔥",
      label: "Week of fire",
      description: "Complete workouts 7 days in a row",
      earned: longestStreak >= 7,
    },
    {
      id: "streak-14",
      icon: "🏆",
      label: "Unstoppable",
      description: "Complete workouts 14 days in a row",
      earned: longestStreak >= 14,
    },
    {
      id: "workouts-10",
      icon: "💪",
      label: "10 workouts",
      description: "Fully complete 10 workout days",
      earned: totalWorkouts >= 10,
    },
    {
      id: "workouts-25",
      icon: "🥇",
      label: "25 workouts",
      description: "Fully complete 25 workout days",
      earned: totalWorkouts >= 25,
    },
    {
      id: "exercises-50",
      icon: "⚡",
      label: "50 exercises",
      description: "Check off 50 exercises",
      earned: totalExercises >= 50,
    },
    {
      id: "exercises-100",
      icon: "🚀",
      label: "Century club",
      description: "Check off 100 exercises",
      earned: totalExercises >= 100,
    },
  ];

  return {
    currentStreak,
    longestStreak,
    totalWorkouts,
    totalExercises,
    lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
    badges,
  };
}
