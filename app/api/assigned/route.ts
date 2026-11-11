import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assignedWorkouts, workoutTemplates } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unseenOnly = searchParams.get("unseen") === "true";

  const conditions = [eq(assignedWorkouts.athleteId, session.user.id)];
  if (unseenOnly) conditions.push(isNull(assignedWorkouts.seenAt));

  if (unseenOnly) {
    const rows = await db
      .select({ count: assignedWorkouts.id })
      .from(assignedWorkouts)
      .where(and(...conditions));
    return NextResponse.json({ count: rows.length });
  }

  const rows = await db
    .select({
      id: assignedWorkouts.id,
      assignedAt: assignedWorkouts.assignedAt,
      seenAt: assignedWorkouts.seenAt,
      templateId: workoutTemplates.id,
      templateName: workoutTemplates.name,
      templateNotes: workoutTemplates.notes,
    })
    .from(assignedWorkouts)
    .innerJoin(workoutTemplates, eq(workoutTemplates.id, assignedWorkouts.templateId))
    .where(eq(assignedWorkouts.athleteId, session.user.id))
    .orderBy(assignedWorkouts.assignedAt);

  return NextResponse.json(rows);
}
