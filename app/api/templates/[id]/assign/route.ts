import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutTemplates, assignedWorkouts, coachRelationships } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { assignTemplateSchema } from "@/lib/validations";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templateId = parseInt(params.id);
  const body = await request.json();
  const parsed = assignTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.coachId, session.user.id)));

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Verify coach/athlete relationship
  const [rel] = await db
    .select()
    .from(coachRelationships)
    .where(and(
      eq(coachRelationships.coachId, session.user.id),
      eq(coachRelationships.athleteId, parsed.data.athleteId),
      eq(coachRelationships.status, "accepted")
    ));

  if (!rel) return NextResponse.json({ error: "No accepted relationship with this athlete" }, { status: 403 });

  const [row] = await db
    .insert(assignedWorkouts)
    .values({ templateId, athleteId: parsed.data.athleteId })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
