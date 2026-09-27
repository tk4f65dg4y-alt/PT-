import { prisma } from "../db";

export interface LastPerformance {
  weight: string | null;
  reps: string | null;
  sets: number | null;
  completedAt: string;
  suggestedWeight: string | null;
}

function parseWeight(w: string | null): { value: number; unit: string } | null {
  if (!w) return null;
  const m = /^\s*([\d.]+)\s*([a-zA-Z]*)/.exec(w);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (Number.isNaN(value)) return null;
  return { value, unit: m[2] || "" };
}

// Only nudges up when the weight is a plain "20kg"/"50 lbs" style value —
// stays silent on bodyweight or per-side notations rather than guess wrong.
function suggestNext(w: string | null): string | null {
  const parsed = parseWeight(w);
  if (!parsed || parsed.value <= 0) return null;
  const step = parsed.value >= 20 ? Math.round(parsed.value * 0.05 * 2) / 2 : 2.5;
  const next = Math.round((parsed.value + Math.max(step, 1)) * 2) / 2;
  return `${next}${parsed.unit}`;
}

// Attaches each exercise's most recent completion by this user of an
// exercise with the same name (across any plan/week), so a client sees
// "last time" and a light suggestion before they log today's set.
export async function attachLastPerformance<T extends { name: string }>(
  exercises: T[],
  userId: string
): Promise<(T & { lastPerformance: LastPerformance | null })[]> {
  const names = [...new Set(exercises.map((e) => e.name))];
  if (names.length === 0) return exercises.map((e) => ({ ...e, lastPerformance: null }));

  const completions = await prisma.completion.findMany({
    where: { userId, exercise: { name: { in: names } } },
    orderBy: { completedAt: "desc" },
    include: { exercise: { select: { name: true } } },
  });
  const byName = new Map<string, (typeof completions)[number]>();
  for (const c of completions) {
    if (!byName.has(c.exercise.name)) byName.set(c.exercise.name, c);
  }

  return exercises.map((e) => {
    const c = byName.get(e.name);
    if (!c) return { ...e, lastPerformance: null };
    return {
      ...e,
      lastPerformance: {
        weight: c.actualWeight,
        reps: c.actualReps,
        sets: c.actualSets,
        completedAt: c.completedAt.toISOString(),
        suggestedWeight: suggestNext(c.actualWeight),
      },
    };
  });
}
