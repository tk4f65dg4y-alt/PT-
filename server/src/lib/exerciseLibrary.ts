import { prisma } from "../db";
import { MovementPattern } from "@prisma/client";

interface LibrarySeed {
  name: string;
  pattern: MovementPattern;
  muscles: string;
  cue: string;
  defaultSets: number;
  defaultReps: string;
  defaultRest: number;
}

export const EXERCISE_LIBRARY: LibrarySeed[] = [
  // Squat
  { name: "Barbell Back Squat", pattern: "SQUAT", muscles: "Quads, Glutes, Core", cue: "Brace your core, sit back and down, knees track over toes.", defaultSets: 4, defaultReps: "6-8", defaultRest: 120 },
  { name: "Goblet Squat", pattern: "SQUAT", muscles: "Quads, Glutes", cue: "Hold weight at chest, elbows inside knees at the bottom.", defaultSets: 3, defaultReps: "10-12", defaultRest: 75 },
  { name: "Bulgarian Split Squat", pattern: "SQUAT", muscles: "Quads, Glutes", cue: "Rear foot elevated, drop straight down, front knee tracks over toes.", defaultSets: 3, defaultReps: "8-10 each", defaultRest: 90 },
  { name: "Front Squat", pattern: "SQUAT", muscles: "Quads, Core", cue: "Elbows high, stay upright through the whole rep.", defaultSets: 4, defaultReps: "5-6", defaultRest: 120 },
  { name: "Leg Press", pattern: "SQUAT", muscles: "Quads, Glutes", cue: "Full range of motion, don't let knees cave in.", defaultSets: 3, defaultReps: "10-12", defaultRest: 90 },
  { name: "Box Jump", pattern: "SQUAT", muscles: "Quads, Glutes, Power", cue: "Land soft, absorb through the hips, step down between reps.", defaultSets: 4, defaultReps: "5", defaultRest: 90 },
  { name: "Wall Sit", pattern: "SQUAT", muscles: "Quads", cue: "Thighs parallel to floor, back flat against the wall.", defaultSets: 3, defaultReps: "30-45s", defaultRest: 60 },

  // Hinge
  { name: "Conventional Deadlift", pattern: "HINGE", muscles: "Hamstrings, Glutes, Back", cue: "Bar close to shins, drive the floor away, chest up.", defaultSets: 4, defaultReps: "5", defaultRest: 150 },
  { name: "Romanian Deadlift", pattern: "HINGE", muscles: "Hamstrings, Glutes", cue: "Soft knees, push hips back, feel the hamstring stretch.", defaultSets: 3, defaultReps: "8-10", defaultRest: 90 },
  { name: "Kettlebell Swing", pattern: "HINGE", muscles: "Hamstrings, Glutes, Core", cue: "Snap the hips forward, arms are just along for the ride.", defaultSets: 4, defaultReps: "15-20", defaultRest: 60 },
  { name: "Good Morning", pattern: "HINGE", muscles: "Hamstrings, Lower back", cue: "Hinge at the hips, keep a soft bend in the knees.", defaultSets: 3, defaultReps: "10", defaultRest: 90 },
  { name: "Single-Leg RDL", pattern: "HINGE", muscles: "Hamstrings, Glutes, Balance", cue: "Hips square, reach forward as the back leg lifts.", defaultSets: 3, defaultReps: "8 each", defaultRest: 75 },
  { name: "Hip Thrust", pattern: "HINGE", muscles: "Glutes", cue: "Drive through heels, squeeze glutes hard at the top.", defaultSets: 4, defaultReps: "10-12", defaultRest: 90 },

  // Push
  { name: "Barbell Bench Press", pattern: "PUSH", muscles: "Chest, Triceps, Shoulders", cue: "Shoulder blades pinned back, bar to mid-chest, drive up.", defaultSets: 4, defaultReps: "6-8", defaultRest: 120 },
  { name: "Push-Up", pattern: "PUSH", muscles: "Chest, Triceps, Core", cue: "Body in a straight line, elbows at about 45°.", defaultSets: 3, defaultReps: "12-15", defaultRest: 60 },
  { name: "Overhead Press", pattern: "PUSH", muscles: "Shoulders, Triceps", cue: "Brace the core, press straight up, head through at lockout.", defaultSets: 4, defaultReps: "6-8", defaultRest: 105 },
  { name: "Dumbbell Shoulder Press", pattern: "PUSH", muscles: "Shoulders, Triceps", cue: "Press up and slightly in, control the descent.", defaultSets: 3, defaultReps: "8-10", defaultRest: 90 },
  { name: "Incline Dumbbell Press", pattern: "PUSH", muscles: "Upper chest, Shoulders", cue: "30-45° incline, lower with control to chest level.", defaultSets: 3, defaultReps: "8-10", defaultRest: 90 },
  { name: "Dips", pattern: "PUSH", muscles: "Chest, Triceps", cue: "Lean forward slightly, lower until shoulders reach elbow height.", defaultSets: 3, defaultReps: "8-12", defaultRest: 90 },
  { name: "Triceps Pushdown", pattern: "PUSH", muscles: "Triceps", cue: "Elbows pinned to your sides, full extension at the bottom.", defaultSets: 3, defaultReps: "12-15", defaultRest: 60 },

  // Pull
  { name: "Pull-Up", pattern: "PULL", muscles: "Back, Biceps", cue: "Full hang at the bottom, chin clears the bar at the top.", defaultSets: 4, defaultReps: "6-10", defaultRest: 120 },
  { name: "Barbell Row", pattern: "PULL", muscles: "Back, Biceps", cue: "Hinge forward, pull to the lower ribs, squeeze the shoulder blades.", defaultSets: 4, defaultReps: "8-10", defaultRest: 90 },
  { name: "Lat Pulldown", pattern: "PULL", muscles: "Back, Biceps", cue: "Pull to upper chest, lead with the elbows.", defaultSets: 3, defaultReps: "10-12", defaultRest: 75 },
  { name: "Seated Cable Row", pattern: "PULL", muscles: "Back, Biceps", cue: "Chest up, pull to the belly, don't lean back excessively.", defaultSets: 3, defaultReps: "10-12", defaultRest: 75 },
  { name: "Dumbbell Row", pattern: "PULL", muscles: "Back, Biceps", cue: "Flat back, pull the elbow up and back past the hip.", defaultSets: 3, defaultReps: "10 each", defaultRest: 75 },
  { name: "Face Pull", pattern: "PULL", muscles: "Rear delts, Upper back", cue: "Pull to eye level, rotate hands so thumbs point back.", defaultSets: 3, defaultReps: "15-20", defaultRest: 60 },
  { name: "Bicep Curl", pattern: "PULL", muscles: "Biceps", cue: "Elbows still, control the negative on the way down.", defaultSets: 3, defaultReps: "10-12", defaultRest: 60 },

  // Lunge
  { name: "Walking Lunge", pattern: "LUNGE", muscles: "Quads, Glutes, Balance", cue: "Step long, drop the back knee straight down, drive through the front heel.", defaultSets: 3, defaultReps: "10 each", defaultRest: 75 },
  { name: "Reverse Lunge", pattern: "LUNGE", muscles: "Quads, Glutes", cue: "Step back, keep the torso upright, push back to standing.", defaultSets: 3, defaultReps: "10 each", defaultRest: 75 },
  { name: "Lateral Lunge", pattern: "LUNGE", muscles: "Adductors, Glutes", cue: "Push hips back to the side, opposite leg stays straight.", defaultSets: 3, defaultReps: "8 each", defaultRest: 75 },
  { name: "Step-Up", pattern: "LUNGE", muscles: "Quads, Glutes", cue: "Drive through the lead heel, avoid pushing off the back foot.", defaultSets: 3, defaultReps: "10 each", defaultRest: 75 },

  // Core
  { name: "Plank", pattern: "CORE", muscles: "Core", cue: "Straight line from head to heels, squeeze glutes and abs.", defaultSets: 3, defaultReps: "30-60s", defaultRest: 45 },
  { name: "Hanging Knee Raise", pattern: "CORE", muscles: "Core, Hip flexors", cue: "Curl the pelvis, avoid swinging.", defaultSets: 3, defaultReps: "10-15", defaultRest: 60 },
  { name: "Cable Woodchop", pattern: "CORE", muscles: "Obliques, Core", cue: "Rotate through the torso, keep arms fairly straight.", defaultSets: 3, defaultReps: "12 each", defaultRest: 60 },
  { name: "Dead Bug", pattern: "CORE", muscles: "Core", cue: "Lower back stays flat on the floor the whole time.", defaultSets: 3, defaultReps: "10 each", defaultRest: 45 },
  { name: "Russian Twist", pattern: "CORE", muscles: "Obliques", cue: "Lean back to about 45°, rotate from the torso.", defaultSets: 3, defaultReps: "16 each", defaultRest: 45 },
  { name: "Ab Rollout", pattern: "CORE", muscles: "Core", cue: "Roll out slowly, keep hips from sagging.", defaultSets: 3, defaultReps: "8-10", defaultRest: 60 },

  // Carry
  { name: "Farmer's Carry", pattern: "CARRY", muscles: "Grip, Core, Traps", cue: "Stand tall, shoulders back, take controlled steps.", defaultSets: 3, defaultReps: "40m", defaultRest: 90 },
  { name: "Suitcase Carry", pattern: "CARRY", muscles: "Obliques, Grip", cue: "Resist leaning toward the loaded side.", defaultSets: 3, defaultReps: "30m each", defaultRest: 90 },
  { name: "Overhead Carry", pattern: "CARRY", muscles: "Shoulders, Core", cue: "Stack wrist over elbow over shoulder, ribs down.", defaultSets: 3, defaultReps: "30m", defaultRest: 90 },

  // Cardio
  { name: "Rowing Machine", pattern: "CARDIO", muscles: "Full body, Conditioning", cue: "Legs, then hips, then arms — reverse the order back.", defaultSets: 1, defaultReps: "500m", defaultRest: 90 },
  { name: "Assault Bike", pattern: "CARDIO", muscles: "Full body, Conditioning", cue: "Drive with both arms and legs, steady breathing.", defaultSets: 5, defaultReps: "20s on/40s off", defaultRest: 40 },
  { name: "Jump Rope", pattern: "CARDIO", muscles: "Calves, Conditioning", cue: "Small hops, wrists doing the work, not the shoulders.", defaultSets: 5, defaultReps: "60s", defaultRest: 30 },
  { name: "Sled Push", pattern: "CARDIO", muscles: "Legs, Conditioning", cue: "Low shin angle, drive through the balls of the feet.", defaultSets: 4, defaultReps: "20m", defaultRest: 90 },
  { name: "Burpee", pattern: "CARDIO", muscles: "Full body, Conditioning", cue: "Chest to floor, explosive jump at the top.", defaultSets: 4, defaultReps: "10", defaultRest: 60 },

  // Mobility
  { name: "World's Greatest Stretch", pattern: "MOBILITY", muscles: "Hips, Thoracic spine", cue: "Lunge deep, rotate the trailing arm up toward the ceiling.", defaultSets: 2, defaultReps: "5 each", defaultRest: 30 },
  { name: "Cat-Cow", pattern: "MOBILITY", muscles: "Spine", cue: "Move slowly between rounding and arching the back.", defaultSets: 2, defaultReps: "10", defaultRest: 20 },
  { name: "90/90 Hip Switch", pattern: "MOBILITY", muscles: "Hips", cue: "Keep both sit bones on the floor as you rotate.", defaultSets: 2, defaultReps: "8 each", defaultRest: 30 },
  { name: "Band Pull-Apart", pattern: "MOBILITY", muscles: "Rear delts, Upper back", cue: "Squeeze shoulder blades together, control the return.", defaultSets: 3, defaultReps: "15-20", defaultRest: 30 },
];

/** Idempotent: safe to call on every boot. */
export async function seedExerciseLibrary() {
  for (const item of EXERCISE_LIBRARY) {
    await prisma.exerciseLibraryItem.upsert({
      where: { name: item.name },
      update: {
        pattern: item.pattern,
        muscles: item.muscles,
        cue: item.cue,
        defaultSets: item.defaultSets,
        defaultReps: item.defaultReps,
        defaultRest: item.defaultRest,
      },
      create: item,
    });
  }
}
