import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { plans, planSessions } from "@/db/schema";
import { eq, count, or } from "drizzle-orm";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  weeksCount: z.number().int().min(1).max(52).default(4),
  isPublic: z.boolean().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Author's own plans + public plans
  const rows = await db
    .select({
      id: plans.id,
      name: plans.name,
      description: plans.description,
      weeksCount: plans.weeksCount,
      isPublic: plans.isPublic,
      authorId: plans.authorId,
      createdAt: plans.createdAt,
      sessionCount: count(planSessions.id),
    })
    .from(plans)
    .leftJoin(planSessions, eq(planSessions.planId, plans.id))
    .where(or(eq(plans.authorId, session.user.id), eq(plans.isPublic, true)))
    .groupBy(plans.id);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [plan] = await db
    .insert(plans)
    .values({ ...parsed.data, authorId: session.user.id })
    .returning();

  return NextResponse.json(plan, { status: 201 });
}
