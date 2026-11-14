import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import {
  offlineAthletes,
  athletePlans,
  planSessions,
  planSessionExercises,
  planSessionSets,
  exercises,
  workouts,
  workoutExercises,
  workoutSets,
  planDayCompletions,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);
  const enrollmentId = parseInt(params.enrollmentId);

  // Verify coach owns this offline athlete
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(
      and(
        eq(offlineAthletes.id, athleteId),
        eq(offlineAthletes.coachId, session.user.id)
      )
    );
  if (!athlete)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get enrollment (must belong to this offline athlete)
  const [enrollment] = await getDb()
    .select()
    .from(athletePlans)
    .where(
      and(
        eq(athletePlans.id, enrollmentId),
        eq(athletePlans.offlineAthleteId, athleteId)
      )
    );
  if (!enrollment)
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

  const { dayNumber, sessionId } = await request.json();

  // Already completed?
  const [existing] = await getDb()
    .select()
    .from(planDayCompletions)
    .where(
      and(
        eq(planDayCompletions.athletePlanId, enrollmentId),
        eq(planDayCompletions.dayNumber, dayNumber)
      )
    );
  if (existing) return NextResponse.json(existing, { status: 200 });

  // Fetch session details
  const [planSession] = await getDb()
    .select()
    .from(planSessions)
    .where(eq(planSessions.id, sessionId));
  if (!planSession)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

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
    .leftJoin(
      planSessionSets,
      eq(planSessionSets.planSessionExerciseId, planSessionExercises.id)
    )
    .where(eq(planSessionExercises.planSessionId, sessionId));

  // Create the workout for the offline athlete
  const workoutDate = enrollment.startDate
    ? new Date(enrollment.startDate.getTime() + (dayNumber - 1) * 86400000)
    : new Date();

  const [workout] = await getDb()
    .insert(workouts)
    .values({
      offlineAthleteId: athleteId,
      userId: null,
      name: planSession.name,
      date: workoutDate,
      notes: `Day ${dayNumber} — from plan`,
    })
    .returning();

  // Log sets
  const exerciseMap = new Map<number, number>(); // exerciseId → workoutExerciseId

  for (const row of rows) {
    if (!exerciseMap.has(row.exerciseId)) {
      const [we] = await getDb()
        .insert(workoutExercises)
        .values({
          workoutId: workout.id,
          exerciseId: row.exerciseId,
          orderIndex: exerciseMap.size,
        })
        .returning();
      exerciseMap.set(row.exerciseId, we.id);
    }
    if (row.setNumber !== null) {
      await getDb().insert(workoutSets).values({
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
