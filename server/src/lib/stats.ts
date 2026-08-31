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
  const [completions, sessions] = await Promise.all([
    prisma.completion.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.workoutSession.findMany({ where: { userId }, select: { startedAt: true } }),
  ]);

  const activeDays = new Set<string>();
  let lastActiveAt: Date | null = null;
  for (const c of completions) {
    activeDays.add(dateKey(c.completedAt));
    if (!lastActiveAt || c.completedAt > lastActiveAt) lastActiveAt = c.completedAt;
  }
  for (const s of sessions) {
    activeDays.add(dateKey(s.startedAt));
    if (!lastActiveAt || s.startedAt > lastActiveAt) lastActiveAt = s.startedAt;
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
    cursor -= DAY_MS; // today not logged yet — start checking from yesterday
  }
  while (activeDays.has(dateKey(new Date(cursor)))) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }

  const totalWorkouts = activeDays.size;
  const totalExercises = completions.length;

  const badges: Badge[] = [
    {
      id: "first-workout",
      icon: "🎉",
      label: "First workout",
      description: "Complete your first exercise",
      earned: totalExercises >= 1,
    },
    {
      id: "streak-3",
      icon: "🔥",
      label: "3-day streak",
      description: "Train 3 days in a row",
      earned: longestStreak >= 3,
    },
    {
      id: "streak-7",
      icon: "🔥",
      label: "Week of fire",
      description: "Train 7 days in a row",
      earned: longestStreak >= 7,
    },
    {
      id: "streak-14",
      icon: "🏆",
      label: "Unstoppable",
      description: "Train 14 days in a row",
      earned: longestStreak >= 14,
    },
    {
      id: "workouts-10",
      icon: "💪",
      label: "10 workouts",
      description: "Log 10 workout days",
      earned: totalWorkouts >= 10,
    },
    {
      id: "workouts-25",
      icon: "🥇",
      label: "25 workouts",
      description: "Log 25 workout days",
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
