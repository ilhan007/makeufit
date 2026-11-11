import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { plans, athletePlans, coachRelationships } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  athleteId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planId = parseInt(params.id);
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [plan] = await getDb().select().from(plans).where(eq(plans.id, planId));
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Coach must own the plan and have an accepted relationship with the athlete
  if (plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rel] = await getDb()
    .select()
    .from(coachRelationships)
    .where(and(
      eq(coachRelationships.coachId, session.user.id),
      eq(coachRelationships.athleteId, parsed.data.athleteId),
      eq(coachRelationships.status, "accepted"),
    ));

  if (!rel) return NextResponse.json({ error: "No accepted relationship with this athlete" }, { status: 403 });

  const [row] = await getDb()
    .insert(athletePlans)
    .values({ planId, athleteId: parsed.data.athleteId, assignedBy: session.user.id })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
