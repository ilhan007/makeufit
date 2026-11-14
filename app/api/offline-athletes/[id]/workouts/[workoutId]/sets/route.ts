import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes, workouts, workoutExercises, workoutSets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { addSetSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string; workoutId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);
  const workoutId = parseInt(params.workoutId);

  // Verify offline athlete ownership
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify workout belongs to this offline athlete
  const [workout] = await getDb()
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.offlineAthleteId, athleteId)));
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = addSetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Find or create workout_exercise entry
  let [we] = await getDb()
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), eq(workoutExercises.exerciseId, parsed.data.exerciseId)));

  if (!we) {
    const existingCount = await getDb()
      .select()
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId));
    [we] = await getDb()
      .insert(workoutExercises)
      .values({ workoutId, exerciseId: parsed.data.exerciseId, orderIndex: existingCount.length })
      .returning();
  }

  const [set] = await getDb()
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
