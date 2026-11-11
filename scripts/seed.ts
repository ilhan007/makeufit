import { db } from "../db";
import { exercises } from "../db/schema";
import { EXERCISE_LIBRARY } from "../lib/exercise-library";

async function seed() {
  console.log("Seeding built-in exercises...");
  for (const ex of EXERCISE_LIBRARY) {
    await db
      .insert(exercises)
      .values({
        name: ex.name,
        category: ex.category,
        muscleGroup: ex.muscleGroup,
        isBuiltin: true,
        userId: null,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${EXERCISE_LIBRARY.length} exercises.`);
}

seed().catch(console.error);
