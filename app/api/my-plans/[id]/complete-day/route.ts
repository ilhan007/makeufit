import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import {
  athletePlans, planSessions, planSessionExercises, planSessionSets,
  exercises, workouts, planDayCompletions,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollmentId = parseInt(params.id);
  const { dayNumber, sessionId } = await request.json();

  const [enrollment] = await getDb()
    .select()
    .from(athletePlans)
    .where(and(eq(athletePlans.id, enrollmentId), eq(athletePlans.athleteId, session.user.id)));
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Already completed?
  const [existing] = await getDb()
    .select()
    .from(planDayCompletions)
    .where(and(eq(planDayCompletions.athletePlanId, enrollmentId), eq(planDayCompletions.dayNumber, dayNumber)));
  if (existing) return NextResponse.json(existing, { status: 200 });

  // Fetch session details
  const [planSession] = await getDb()
    .select()
    .from(planSessions)
    .where(eq(planSessions.id, sessionId));
  if (!planSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const rows = await getDb()
    .select({
      pseId: planSessionExercises.id,
      exerciseId: exercises.id,
      setNumber: planSessionSets.setNumber,
      reps: planSessionSets.reps,
      weightKg: planSessionSets.weightKg,
      durationSeconds: planSessionSets.durationSeconds,
    })
    .from(planSessionExercises)
    .innerJoin(exercises, eq(exercises.id, planSessionExercises.exerciseId))
    .leftJoin(planSessionSets, eq(planSessionSets.planSessionExerciseId, planSessionExercises.id))
    .where(eq(planSessionExercises.planSessionId, sessionId));

  // Create the workout
  const workoutDate = enrollment.startDate
    ? new Date(enrollment.startDate.getTime() + (dayNumber - 1) * 86400000)
    : new Date();

  const [workout] = await getDb()
    .insert(workouts)
    .values({
      userId: session.user.id,
      name: planSession.name,
      date: workoutDate,
      notes: `Day ${dayNumber} — from plan`,
    })
    .returning();

  // Log sets
  const { workoutExercises: weTable, workoutSets: wsTable } = await import("@/db/schema");
  const exerciseMap = new Map<number, number>(); // exerciseId → workoutExerciseId

  for (const row of rows) {
    if (!exerciseMap.has(row.exerciseId)) {
      const [we] = await getDb()
        .insert(weTable)
        .values({ workoutId: workout.id, exerciseId: row.exerciseId, orderIndex: exerciseMap.size })
        .returning();
      exerciseMap.set(row.exerciseId, we.id);
    }
    if (row.setNumber !== null) {
      await getDb().insert(wsTable).values({
        workoutExerciseId: exerciseMap.get(row.exerciseId)!,
        setNumber: row.setNumber,
        reps: row.reps,
        weightKg: row.weightKg,
        durationSeconds: row.durationSeconds,
      });
    }
  }

  // Record completion
  const [completion] = await getDb()
    .insert(planDayCompletions)
    .values({ athletePlanId: enrollmentId, dayNumber, workoutId: workout.id })
    .returning();

  return NextResponse.json(completion, { status: 201 });
}
