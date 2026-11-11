import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coachRelationships, workouts, workoutExercises } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";

async function verifyCoachAccess(coachId: string, athleteId: string) {
  const [rel] = await db
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

  const rows = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      date: workouts.date,
      notes: workouts.notes,
      exerciseCount: count(workoutExercises.id),
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.userId, params.athleteId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date));

  return NextResponse.json(rows);
}
