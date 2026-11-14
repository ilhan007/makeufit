import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes, workouts, workoutExercises } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { createWorkoutSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify ownership
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await getDb()
    .select({
      id: workouts.id,
      name: workouts.name,
      date: workouts.date,
      notes: workouts.notes,
      exerciseCount: count(workoutExercises.id),
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.offlineAthleteId, athleteId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date));

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify ownership
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await getDb()
    .insert(workouts)
    .values({
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: null,
      offlineAthleteId: athleteId,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
