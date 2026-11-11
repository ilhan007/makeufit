import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bodyMetrics, workouts, workoutExercises, workoutSets, exercises } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ProgressCharts } from "@/components/progress/ProgressCharts";

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [metricsData, exerciseList, setsData] = await Promise.all([
    db.select({ date: bodyMetrics.date, weightKg: bodyMetrics.weightKg })
      .from(bodyMetrics)
      .where(eq(bodyMetrics.userId, userId))
      .orderBy(asc(bodyMetrics.date)),

    db.select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(eq(exercises.isBuiltin, true))
      .union(
        db.select({ id: exercises.id, name: exercises.name })
          .from(exercises)
          .where(eq(exercises.userId, userId))
      ),

    db.select({
      date: workouts.date,
      exerciseId: workoutExercises.exerciseId,
      weightKg: workoutSets.weightKg,
    })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(eq(workouts.userId, userId))
      .orderBy(asc(workouts.date)),
  ]);

  const weightData = metricsData
    .filter((m) => m.weightKg !== null)
    .map((m) => ({ date: new Date(m.date).toLocaleDateString(), weight: m.weightKg! }));

  // Build per-exercise max weight per date
  const prMap: Record<number, Record<string, number>> = {};
  for (const row of setsData) {
    if (!row.weightKg) continue;
    const dateStr = new Date(row.date).toLocaleDateString();
    if (!prMap[row.exerciseId]) prMap[row.exerciseId] = {};
    prMap[row.exerciseId][dateStr] = Math.max(prMap[row.exerciseId][dateStr] ?? 0, row.weightKg);
  }

  const prData: Record<number, Array<{ date: string; maxWeight: number }>> = {};
  for (const [exId, dateMap] of Object.entries(prMap)) {
    prData[Number(exId)] = Object.entries(dateMap)
      .map(([date, maxWeight]) => ({ date, maxWeight }));
  }

  return (
    <ProgressCharts
      weightData={weightData}
      exerciseList={exerciseList}
      prData={prData}
    />
  );
}
