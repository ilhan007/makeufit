import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { athletePlans, plans, planSessions, planDayCompletions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollmentId = parseInt(params.id);

  const [enrollment] = await getDb()
    .select()
    .from(athletePlans)
    .where(and(eq(athletePlans.id, enrollmentId), eq(athletePlans.athleteId, session.user.id)));

  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [plan] = await getDb().select().from(plans).where(eq(plans.id, enrollment.planId));
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

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
    sessions: sessions.map(s => ({ dayNumber: s.dayNumber, name: s.name, sessionId: s.id })),
    completions: completions.map(c => ({
      dayNumber: c.dayNumber,
      workoutId: c.workoutId,
      completedAt: c.completedAt,
    })),
  });
}
