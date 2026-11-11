import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { coachRelationships, workouts, bodyMetrics, workoutSets, workoutExercises, exercises } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function verifyCoachAccess(coachId: string, athleteId: string) {
  const [rel] = await getDb()
    .select()
    .from(coachRelationships)
    .where(and(
      eq(coachRelationships.coachId, coachId),
      eq(coachRelationships.athleteId, athleteId),
      eq(coachRelationships.status, "accepted")
    ));
  return !!rel;
}

export async function GET(_req: Request, { params }: { params: { athleteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await verifyCoachAccess(session.user.id, params.athleteId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [metrics, workoutRows] = await Promise.all([
    getDb().select().from(bodyMetrics).where(eq(bodyMetrics.userId, params.athleteId)).orderBy(bodyMetrics.date),
    getDb().select({ count: count() }).from(workouts).where(eq(workouts.userId, params.athleteId)),
  ]);

  // Exercise volume per exercise (for progress chart data)
  const setRows = await getDb()
    .select({
      date: workouts.date,
      exerciseName: exercises.name,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workouts.userId, params.athleteId))
    .orderBy(workouts.date);

  return NextResponse.json({
    metrics,
    totalWorkouts: workoutRows[0].count,
    sets: setRows,
  });
}
