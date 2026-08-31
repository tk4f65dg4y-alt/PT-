import { prisma } from "../db";

interface ExerciseInput {
  name: string;
  reps: string;
  sets: number;
  restSeconds: number;
  libraryMatch?: string;
}
interface DayInput {
  label: string;
  exercises: ExerciseInput[];
}

// Maps the exact wording the trainer used to an existing ExerciseLibraryItem
// name, so the client sees the animated movement icon + form cue for the
// exercises we recognize. Anything absent here is still saved fine as plain
// free-text (no animation, just the name/sets/reps).
const LIB: Record<string, string> = {
  "Goblet Squats": "Goblet Squat",
  "Push-ups": "Push-Up",
  "Reverse Lunges": "Reverse Lunge",
  "Bicep Curls": "Bicep Curl",
  Burpees: "Burpee",
  "Walking Lunges": "Walking Lunge",
  Plank: "Plank",
};

const DAYS: DayInput[] = [
  {
    label: "Day 1 — Full body — lower focus",
    exercises: [
      { name: "Goblet Squats", reps: "20", sets: 3, restSeconds: 25 },
      { name: "Push-ups", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Reverse Lunges", reps: "12 each leg", sets: 3, restSeconds: 25 },
      { name: "Glute Bridges", reps: "20", sets: 3, restSeconds: 25 },
      { name: "Bicep Curls", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Jump Squats", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Burpees", reps: "12", sets: 3, restSeconds: 25 },
      { name: "Sit-ups", reps: "20", sets: 3, restSeconds: 25 },
    ],
  },
  {
    label: "Day 2 — Full body — upper focus",
    exercises: [
      { name: "Push-ups", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Chair Dips", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Shoulder Press", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Lateral Raises", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Mountain Climbers", reps: "45 sec", sets: 3, restSeconds: 25 },
      { name: "Plank", reps: "60 sec", sets: 3, restSeconds: 25 },
      { name: "Bicycle Crunches", reps: "25", sets: 3, restSeconds: 25 },
      { name: "Diamond Push-ups", reps: "12", sets: 3, restSeconds: 25 },
    ],
  },
  {
    label: "Day 3 — Lower focus + conditioning",
    exercises: [
      { name: "Walking Lunges", reps: "12 each leg", sets: 3, restSeconds: 25 },
      { name: "Goblet Squats", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Burpees", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Push-ups", reps: "12", sets: 3, restSeconds: 25 },
      { name: "Bicep Curls", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Squat Pulses", reps: "25", sets: 3, restSeconds: 25 },
      { name: "High Knees", reps: "45 sec", sets: 3, restSeconds: 25 },
      { name: "Sit-ups", reps: "20", sets: 3, restSeconds: 25 },
    ],
  },
  {
    label: "Day 4 — Upper focus + conditioning",
    exercises: [
      { name: "Incline Push-ups", reps: "20", sets: 3, restSeconds: 25 },
      { name: "Chair Dips", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Shoulder Press", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Lateral Raises", reps: "15", sets: 3, restSeconds: 25 },
      { name: "Push-ups", reps: "12", sets: 3, restSeconds: 25 },
      { name: "Plank", reps: "60 sec", sets: 3, restSeconds: 25 },
      { name: "Mountain Climbers", reps: "45 sec", sets: 3, restSeconds: 25 },
      { name: "Burpees", reps: "10", sets: 3, restSeconds: 25 },
    ],
  },
  {
    label: "Core — 20-minute core workout",
    exercises: [
      { name: "Crunches", reps: "20", sets: 3, restSeconds: 20 },
      { name: "Russian Twists", reps: "30 (15 each side)", sets: 3, restSeconds: 20 },
      { name: "Shoulder Taps", reps: "20 (10 each side)", sets: 3, restSeconds: 20 },
      { name: "Plank", reps: "60 sec", sets: 3, restSeconds: 20 },
      { name: "Bicycle Crunches", reps: "20", sets: 3, restSeconds: 20 },
      { name: "Leg Raises", reps: "15", sets: 3, restSeconds: 20 },
      { name: "Heel Taps", reps: "20", sets: 3, restSeconds: 20 },
    ],
  },
];

const PLAN_TITLE = "4-Day Full Body Split + Core";

/** One-off, idempotent: run by setting SEED_HEMA_SANJ_PLAN=true and
 * redeploying. Finds the existing client group whose member name mentions
 * both "hema" and "sanj" and assigns this plan to it. Safe to leave the
 * flag set — it no-ops once the plan already exists. */
export async function seedHemaSanjPlan() {
  if (process.env.SEED_HEMA_SANJ_PLAN !== "true") return;

  const groups = await prisma.group.findMany({
    include: { members: { include: { user: true } } },
  });
  const matches = groups.filter((g) =>
    g.members.some((m) => {
      const n = m.user.name.toLowerCase();
      return n.includes("hema") && n.includes("sanj");
    })
  );

  if (matches.length === 0) {
    console.warn(
      "SEED_HEMA_SANJ_PLAN: no client found whose name contains both 'hema' and 'sanj' — nothing seeded."
    );
    return;
  }
  if (matches.length > 1) {
    console.warn(
      `SEED_HEMA_SANJ_PLAN: found ${matches.length} matching clients — nothing seeded, ambiguous. Groups: ${matches
        .map((g) => g.members.map((m) => m.user.name).join("/"))
        .join(", ")}`
    );
    return;
  }

  const group = matches[0];
  const existing = await prisma.plan.findFirst({ where: { groupId: group.id, title: PLAN_TITLE } });
  if (existing) {
    console.log(`SEED_HEMA_SANJ_PLAN: plan already exists for ${group.name} — skipping.`);
    return;
  }

  const trainer = await prisma.user.findFirst({ where: { role: "TRAINER" } });
  if (!trainer) {
    console.warn("SEED_HEMA_SANJ_PLAN: no trainer account exists yet — nothing seeded.");
    return;
  }

  const libraryItems = await prisma.exerciseLibraryItem.findMany();
  const libraryIdByName = new Map(libraryItems.map((i) => [i.name, i.id]));

  await prisma.plan.create({
    data: {
      groupId: group.id,
      title: PLAN_TITLE,
      notes:
        "Rest 20–30 sec between exercises, 90 sec between rounds. (Core day: 20 sec between exercises, 60–90 sec between rounds.)",
      createdById: trainer.id,
      weeks: {
        create: [
          {
            index: 0,
            label: "Rotation",
            days: {
              create: DAYS.map((day, di) => ({
                index: di,
                label: day.label,
                exercises: {
                  create: day.exercises.map((ex, ei) => ({
                    index: ei,
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.restSeconds,
                    libraryItemId: libraryIdByName.get(LIB[ex.name] || "") || null,
                  })),
                },
              })),
            },
          },
        ],
      },
    },
  });

  console.log(`SEED_HEMA_SANJ_PLAN: created "${PLAN_TITLE}" for ${group.name}.`);
}
