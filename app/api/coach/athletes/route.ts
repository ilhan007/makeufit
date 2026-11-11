import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coachRelationships, users, workouts } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athletes = await db
    .select({
      relationshipId: coachRelationships.id,
      athleteId: users.id,
      athleteName: users.name,
      athleteEmail: users.email,
      athleteImage: users.image,
    })
    .from(coachRelationships)
    .innerJoin(users, eq(users.id, coachRelationships.athleteId))
    .where(and(eq(coachRelationships.coachId, session.user.id), eq(coachRelationships.status, "accepted")));

  const result = await Promise.all(
    athletes.map(async (a) => {
      const [lastWorkout] = await db
        .select({ date: workouts.date, name: workouts.name })
        .from(workouts)
        .where(eq(workouts.userId, a.athleteId))
        .orderBy(desc(workouts.date))
        .limit(1);
      return { ...a, lastWorkout: lastWorkout ?? null };
    })
  );

  return NextResponse.json(result);
}
