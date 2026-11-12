import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { athletePlans, plans } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.number().int().positive(),
  startDate: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getDb()
    .select({
      id: sql<number>`min(${athletePlans.id})`,
      planId: plans.id,
      planName: plans.name,
      planDescription: plans.description,
      weeksCount: plans.weeksCount,
      assignedBy: sql<string | null>`min(${athletePlans.assignedBy})`,
      startDate: sql<Date | null>`min(${athletePlans.startDate})`,
      createdAt: sql<Date>`min(${athletePlans.createdAt})`,
    })
    .from(athletePlans)
    .innerJoin(plans, eq(plans.id, athletePlans.planId))
    .where(eq(athletePlans.athleteId, session.user.id))
    .groupBy(plans.id);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [plan] = await getDb().select().from(plans).where(eq(plans.id, parsed.data.planId));
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (!plan.isPublic && plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent duplicate enrollments
  const [existing] = await getDb()
    .select()
    .from(athletePlans)
    .where(and(eq(athletePlans.planId, parsed.data.planId), eq(athletePlans.athleteId, session.user.id)));
  if (existing) return NextResponse.json(existing, { status: 200 });

  const [row] = await getDb()
    .insert(athletePlans)
    .values({
      athleteId: session.user.id,
      planId: parsed.data.planId,
      startDate: new Date(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

