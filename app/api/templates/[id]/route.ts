import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutTemplates, templateExercises, templateSets, exercises, assignedWorkouts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.id, id));

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow access if coach owns it or athlete has it assigned
  const isCoach = template.coachId === session.user.id;
  if (!isCoach) {
    const [assigned] = await db
      .select()
      .from(assignedWorkouts)
      .where(and(eq(assignedWorkouts.templateId, id), eq(assignedWorkouts.athleteId, session.user.id)));
    if (!assigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      teId: templateExercises.id,
      orderIndex: templateExercises.orderIndex,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      category: exercises.category,
      muscleGroup: exercises.muscleGroup,
      setId: templateSets.id,
      setNumber: templateSets.setNumber,
      reps: templateSets.reps,
      weightKg: templateSets.weightKg,
      durationSeconds: templateSets.durationSeconds,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
    .leftJoin(templateSets, eq(templateSets.templateExerciseId, templateExercises.id))
    .where(eq(templateExercises.templateId, id))
    .orderBy(templateExercises.orderIndex, templateSets.setNumber);

  const exerciseMap = new Map<number, {
    teId: number; orderIndex: number; exerciseId: number;
    exerciseName: string; category: string; muscleGroup: string | null;
    sets: Array<{ id: number; setNumber: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }>;
  }>();

  for (const row of rows) {
    if (!exerciseMap.has(row.teId)) {
      exerciseMap.set(row.teId, {
        teId: row.teId, orderIndex: row.orderIndex,
        exerciseId: row.exerciseId, exerciseName: row.exerciseName,
        category: row.category, muscleGroup: row.muscleGroup, sets: [],
      });
    }
    if (row.setId !== null) {
      exerciseMap.get(row.teId)!.sets.push({
        id: row.setId, setNumber: row.setNumber!,
        reps: row.reps, weightKg: row.weightKg, durationSeconds: row.durationSeconds,
      });
    }
  }

  return NextResponse.json({ ...template, exercises: Array.from(exerciseMap.values()) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const deleted = await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.coachId, session.user.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
