import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes, athletePlans, plans } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.number().int().positive(),
  startDate: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify coach owns this offline athlete
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(
      and(
        eq(offlineAthletes.id, athleteId),
        eq(offlineAthletes.coachId, session.user.id)
      )
    );
  if (!athlete)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await getDb()
    .select({
      id: athletePlans.id,
      planId: plans.id,
      planName: plans.name,
      weeksCount: plans.weeksCount,
      startDate: athletePlans.startDate,
      createdAt: athletePlans.createdAt,
    })
    .from(athletePlans)
    .innerJoin(plans, eq(plans.id, athletePlans.planId))
    .where(eq(athletePlans.offlineAthleteId, athleteId));

  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify coach owns this offline athlete
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(
      and(
        eq(offlineAthletes.id, athleteId),
        eq(offlineAthletes.coachId, session.user.id)
      )
    );
  if (!athlete)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify plan exists and coach owns or it's public
  const [plan] = await getDb()
    .select()
    .from(plans)
    .where(eq(plans.id, parsed.data.planId));
  if (!plan)
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (!plan.isPublic && plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent duplicate enrollments
  const [existing] = await getDb()
    .select()
    .from(athletePlans)
    .where(
      and(
        eq(athletePlans.planId, parsed.data.planId),
        eq(athletePlans.offlineAthleteId, athleteId)
      )
    );
  if (existing) return NextResponse.json(existing, { status: 200 });

  const startDate = parsed.data.startDate
    ? new Date(parsed.data.startDate)
    : new Date();

  const [row] = await getDb()
    .insert(athletePlans)
    .values({
      offlineAthleteId: athleteId,
      planId: parsed.data.planId,
      assignedBy: session.user.id,
      startDate,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
