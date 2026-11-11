import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutExercises, workoutSets, workouts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { addSetSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workoutId = parseInt(params.id);

  // Verify workout ownership
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, session.user.id)));
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = addSetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Find or create workout_exercise entry
  let [we] = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), eq(workoutExercises.exerciseId, parsed.data.exerciseId)));

  if (!we) {
    const existingCount = await db
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId));
    [we] = await db
      .insert(workoutExercises)
      .values({ workoutId, exerciseId: parsed.data.exerciseId, orderIndex: existingCount.length })
      .returning();
  }

  const [set] = await db
    .insert(workoutSets)
    .values({
      workoutExerciseId: we.id,
      setNumber: parsed.data.setNumber,
      reps: parsed.data.reps,
      weightKg: parsed.data.weightKg,
      durationSeconds: parsed.data.durationSeconds,
      notes: parsed.data.notes,
    })
    .returning();

  return NextResponse.json(set, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workoutId = parseInt(params.id);
  const body = await request.json();
  const { workoutSetId } = body as { workoutSetId: number };

  // Verify ownership via join
  const [row] = await db
    .select()
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutSets.id, workoutSetId), eq(workouts.userId, session.user.id), eq(workouts.id, workoutId)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(workoutSets).where(eq(workoutSets.id, workoutSetId));
  return new NextResponse(null, { status: 204 });
}
