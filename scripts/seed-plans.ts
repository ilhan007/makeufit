import { getDb } from "../db";
import {
  users, exercises, plans, planSessions, planSessionExercises, planSessionSets,
} from "../db/schema";
import { eq } from "drizzle-orm";

const db = getDb();

const SYSTEM_COACH_ID = "system-coach-makeufit";

const PREDEFINED_PLANS = [
  {
    name: "3-Day Full Body Beginner",
    description: "A simple 3-day full body program for beginners. Focuses on compound movements with manageable volume.",
    weeksCount: 4,
    sessions: [
      {
        dayNumber: 1, name: "Day 1 — Full Body A",
        exercises: [
          { name: "Squat",           sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Bench Press",     sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Barbell Row",     sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Plank",           sets: [{ durationSeconds: 30 }, { durationSeconds: 30 }] },
        ],
      },
      {
        dayNumber: 2, name: "Day 2 — Full Body B",
        exercises: [
          { name: "Deadlift",        sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Overhead Press",  sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Pull-Up",         sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Lunges",          sets: [{ reps: 10 }, { reps: 10 }] },
        ],
      },
      {
        dayNumber: 3, name: "Day 3 — Full Body C",
        exercises: [
          { name: "Front Squat",     sets: [{ reps: 6 }, { reps: 6 }, { reps: 6 }] },
          { name: "Dumbbell Fly",    sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Lat Pulldown",    sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
          { name: "Ab Wheel",        sets: [{ reps: 10 }, { reps: 10 }] },
        ],
      },
    ],
  },
  {
    name: "5-Day Push Pull Legs",
    description: "Intermediate PPL split. Push (chest/shoulders/triceps), Pull (back/biceps), Legs — repeated across 5 days.",
    weeksCount: 6,
    sessions: [
      {
        dayNumber: 1, name: "Day 1 — Push",
        exercises: [
          { name: "Bench Press",      sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Overhead Press",   sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Incline Bench Press", sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
          { name: "Lateral Raise",    sets: [{ reps: 15 }, { reps: 15 }, { reps: 15 }] },
          { name: "Tricep Pushdown",  sets: [{ reps: 12 }, { reps: 12 }] },
        ],
      },
      {
        dayNumber: 2, name: "Day 2 — Pull",
        exercises: [
          { name: "Deadlift",         sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Pull-Up",          sets: [{ reps: 6 }, { reps: 6 }, { reps: 6 }] },
          { name: "Barbell Row",      sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Seated Cable Row", sets: [{ reps: 10 }, { reps: 10 }] },
          { name: "Barbell Curl",     sets: [{ reps: 12 }, { reps: 12 }] },
        ],
      },
      {
        dayNumber: 3, name: "Day 3 — Legs",
        exercises: [
          { name: "Squat",            sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Romanian Deadlift",sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Leg Press",        sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] },
          { name: "Leg Curl",         sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Calf Raise",       sets: [{ reps: 15 }, { reps: 15 }, { reps: 15 }] },
        ],
      },
      {
        dayNumber: 4, name: "Day 4 — Push",
        exercises: [
          { name: "Overhead Press",   sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Incline Bench Press", sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Dumbbell Fly",     sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Arnold Press",     sets: [{ reps: 10 }, { reps: 10 }] },
          { name: "Skull Crushers",   sets: [{ reps: 10 }, { reps: 10 }] },
        ],
      },
      {
        dayNumber: 5, name: "Day 5 — Pull",
        exercises: [
          { name: "Lat Pulldown",     sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "T-Bar Row",        sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Face Pull",        sets: [{ reps: 15 }, { reps: 15 }] },
          { name: "Hammer Curl",      sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Cable Crunch",     sets: [{ reps: 15 }, { reps: 15 }] },
        ],
      },
    ],
  },
  {
    name: "4-Day Upper Lower Split",
    description: "Classic upper/lower split for intermediate lifters. 4 days per week with balanced volume.",
    weeksCount: 8,
    sessions: [
      {
        dayNumber: 1, name: "Day 1 — Upper Strength",
        exercises: [
          { name: "Bench Press",      sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Barbell Row",      sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Overhead Press",   sets: [{ reps: 6 }, { reps: 6 }, { reps: 6 }] },
          { name: "Pull-Up",          sets: [{ reps: 6 }, { reps: 6 }, { reps: 6 }] },
        ],
      },
      {
        dayNumber: 2, name: "Day 2 — Lower Strength",
        exercises: [
          { name: "Squat",            sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Romanian Deadlift",sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Leg Press",        sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
          { name: "Calf Raise",       sets: [{ reps: 15 }, { reps: 15 }] },
        ],
      },
      {
        dayNumber: 3, name: "Day 3 — Upper Hypertrophy",
        exercises: [
          { name: "Incline Bench Press", sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
          { name: "Seated Cable Row", sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
          { name: "Lateral Raise",    sets: [{ reps: 15 }, { reps: 15 }, { reps: 15 }] },
          { name: "Barbell Curl",     sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Tricep Pushdown",  sets: [{ reps: 12 }, { reps: 12 }] },
        ],
      },
      {
        dayNumber: 4, name: "Day 4 — Lower Hypertrophy",
        exercises: [
          { name: "Front Squat",      sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
          { name: "Deadlift",         sets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
          { name: "Leg Curl",         sets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] },
          { name: "Lunges",           sets: [{ reps: 12 }, { reps: 12 }] },
          { name: "Hanging Leg Raise",sets: [{ reps: 12 }, { reps: 12 }] },
        ],
      },
    ],
  },
];

async function seedPlans() {
  // Ensure system coach user exists
  await db.insert(users).values({
    id: SYSTEM_COACH_ID,
    name: "MakeUFit Coach",
    email: "coach@makeufit.app",
    role: "coach",
  }).onConflictDoNothing();
  console.log("System coach ready.");

  // Load all built-in exercises into a name→id map
  const allExercises = await db.select().from(exercises);
  const exerciseMap = new Map(allExercises.map(e => [e.name, e.id]));

  for (const planDef of PREDEFINED_PLANS) {
    // Skip if plan already exists
    const existing = await db.select().from(plans)
      .where(eq(plans.name, planDef.name));
    if (existing.length > 0) {
      console.log(`Skipping "${planDef.name}" — already exists.`);
      continue;
    }

    const [plan] = await db.insert(plans).values({
      authorId: SYSTEM_COACH_ID,
      name: planDef.name,
      description: planDef.description,
      weeksCount: planDef.weeksCount,
      isPublic: true,
    }).returning();

    for (const sessionDef of planDef.sessions) {
      const [session] = await db.insert(planSessions).values({
        planId: plan.id,
        dayNumber: sessionDef.dayNumber,
        name: sessionDef.name,
        orderIndex: sessionDef.dayNumber - 1,
      }).returning();

      for (let exIdx = 0; exIdx < sessionDef.exercises.length; exIdx++) {
        const exDef = sessionDef.exercises[exIdx];
        const exerciseId = exerciseMap.get(exDef.name);
        if (!exerciseId) {
          console.warn(`  Exercise not found: "${exDef.name}" — skipping`);
          continue;
        }

        const [pse] = await db.insert(planSessionExercises).values({
          planSessionId: session.id,
          exerciseId,
          orderIndex: exIdx,
        }).returning();

        for (let setIdx = 0; setIdx < exDef.sets.length; setIdx++) {
          const setDef = exDef.sets[setIdx] as { reps?: number; durationSeconds?: number };
          await db.insert(planSessionSets).values({
            planSessionExerciseId: pse.id,
            setNumber: setIdx + 1,
            reps: setDef.reps ?? null,
            durationSeconds: setDef.durationSeconds ?? null,
          });
        }
      }
    }
    console.log(`Seeded plan: "${planDef.name}"`);
  }

  console.log("Done seeding plans.");
}

seedPlans().catch(console.error);
