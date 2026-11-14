import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes, athletePlans, plans, planSessions, planDayCompletions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);
  const enrollmentId = parseInt(params.enrollmentId);

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

  // Get enrollment (must belong to this offline athlete)
  const [enrollment] = await getDb()
    .select()
    .from(athletePlans)
    .where(
      and(
        eq(athletePlans.id, enrollmentId),
        eq(athletePlans.offlineAthleteId, athleteId)
      )
    );
  if (!enrollment)
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

  const [plan] = await getDb()
    .select()
    .from(plans)
    .where(eq(plans.id, enrollment.planId));
  if (!plan)
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const sessions = await getDb()
    .select({ dayNumber: planSessions.dayNumber, name: planSessions.name, id: planSessions.id })
    .from(planSessions)
    .where(eq(planSessions.planId, enrollment.planId));

  const completions = await getDb()
    .select()
    .from(planDayCompletions)
    .where(eq(planDayCompletions.athletePlanId, enrollmentId));

  return NextResponse.json({
    enrollmentId,
    planId: plan.id,
    planName: plan.name,
    startDate: enrollment.startDate,
    totalDays: plan.weeksCount * 7,
    sessions: sessions.map((s) => ({
      dayNumber: s.dayNumber,
      name: s.name,
      sessionId: s.id,
    })),
    completions: completions.map((c) => ({
      dayNumber: c.dayNumber,
      workoutId: c.workoutId,
      completedAt: c.completedAt,
    })),
  });
}
