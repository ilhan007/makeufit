import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { athletePlans, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  planId: z.number().int().positive(),
  startDate: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: athletePlans.id,
      planId: plans.id,
      planName: plans.name,
      planDescription: plans.description,
      weeksCount: plans.weeksCount,
      assignedBy: athletePlans.assignedBy,
      startDate: athletePlans.startDate,
      createdAt: athletePlans.createdAt,
    })
    .from(athletePlans)
    .innerJoin(plans, eq(plans.id, athletePlans.planId))
    .where(eq(athletePlans.athleteId, session.user.id));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [plan] = await db.select().from(plans).where(eq(plans.id, parsed.data.planId));
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (!plan.isPublic && plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [row] = await db
    .insert(athletePlans)
    .values({
      athleteId: session.user.id,
      planId: parsed.data.planId,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
