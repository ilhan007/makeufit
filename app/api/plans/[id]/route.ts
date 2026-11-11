import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { plans, planSessions, planSessionExercises, planSessionSets, exercises, athletePlans } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow if author, public, or enrolled athlete
  const canAccess = plan.authorId === session.user.id || plan.isPublic;
  if (!canAccess) {
    const [enrollment] = await db
      .select()
      .from(athletePlans)
      .where(and(eq(athletePlans.planId, id), eq(athletePlans.athleteId, session.user.id)));
    if (!enrollment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      sessionId: planSessions.id,
      dayNumber: planSessions.dayNumber,
      sessionName: planSessions.name,
      sessionNotes: planSessions.notes,
      sessionOrder: planSessions.orderIndex,
      pseId: planSessionExercises.id,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      category: exercises.category,
      muscleGroup: exercises.muscleGroup,
      exOrder: planSessionExercises.orderIndex,
      setId: planSessionSets.id,
      setNumber: planSessionSets.setNumber,
      reps: planSessionSets.reps,
      weightKg: planSessionSets.weightKg,
      durationSeconds: planSessionSets.durationSeconds,
    })
    .from(planSessions)
    .leftJoin(planSessionExercises, eq(planSessionExercises.planSessionId, planSessions.id))
    .leftJoin(exercises, eq(exercises.id, planSessionExercises.exerciseId))
    .leftJoin(planSessionSets, eq(planSessionSets.planSessionExerciseId, planSessionExercises.id))
    .where(eq(planSessions.planId, id))
    .orderBy(planSessions.dayNumber, planSessionExercises.orderIndex, planSessionSets.setNumber);

  // Group into sessions → exercises → sets
  const sessionMap = new Map<number, {
    id: number; dayNumber: number; name: string; notes: string | null;
    exercises: Map<number, { id: number; exerciseId: number; name: string; category: string; muscleGroup: string | null; sets: Array<{ setNumber: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }> }>;
  }>();

  for (const row of rows) {
    if (!sessionMap.has(row.sessionId)) {
      sessionMap.set(row.sessionId, { id: row.sessionId, dayNumber: row.dayNumber, name: row.sessionName, notes: row.sessionNotes, exercises: new Map() });
    }
    const sess = sessionMap.get(row.sessionId)!;
    if (row.pseId !== null && !sess.exercises.has(row.pseId)) {
      sess.exercises.set(row.pseId, { id: row.pseId, exerciseId: row.exerciseId!, name: row.exerciseName!, category: row.category!, muscleGroup: row.muscleGroup ?? null, sets: [] });
    }
    if (row.pseId !== null && row.setId !== null) {
      sess.exercises.get(row.pseId)!.sets.push({ setNumber: row.setNumber!, reps: row.reps, weightKg: row.weightKg, durationSeconds: row.durationSeconds });
    }
  }

  const sessions = Array.from(sessionMap.values()).map(s => ({
    ...s,
    exercises: Array.from(s.exercises.values()),
  }));

  return NextResponse.json({ ...plan, sessions });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const deleted = await db
    .delete(plans)
    .where(and(eq(plans.id, id), eq(plans.authorId, session.user.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
