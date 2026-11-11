import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workouts, workoutExercises, workoutSets, exercises } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { updateWorkoutSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)));

  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      weId: workoutExercises.id,
      orderIndex: workoutExercises.orderIndex,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      category: exercises.category,
      muscleGroup: exercises.muscleGroup,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      durationSeconds: workoutSets.durationSeconds,
      setNotes: workoutSets.notes,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(workoutExercises.orderIndex, workoutSets.setNumber);

  // Group into exercises with nested sets
  const exerciseMap = new Map<number, {
    weId: number; orderIndex: number; exerciseId: number;
    exerciseName: string; category: string; muscleGroup: string | null;
    sets: Array<{ id: number; setNumber: number; reps: number | null; weightKg: number | null; durationSeconds: number | null; notes: string | null }>;
  }>();

  for (const row of rows) {
    if (!exerciseMap.has(row.weId)) {
      exerciseMap.set(row.weId, {
        weId: row.weId,
        orderIndex: row.orderIndex,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        category: row.category,
        muscleGroup: row.muscleGroup,
        sets: [],
      });
    }
    if (row.setId !== null) {
      exerciseMap.get(row.weId)!.sets.push({
        id: row.setId,
        setNumber: row.setNumber!,
        reps: row.reps,
        weightKg: row.weightKg,
        durationSeconds: row.durationSeconds,
        notes: row.setNotes,
      });
    }
  }

  return NextResponse.json({ ...workout, exercises: Array.from(exerciseMap.values()) });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const body = await request.json();
  const parsed = updateWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) updateData.date = new Date(parsed.data.date);

  const [row] = await db
    .update(workouts)
    .set(updateData)
    .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
