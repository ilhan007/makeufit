import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coachRelationships, bodyMetrics } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";


async function verifyCoachAccess(coachId: string, athleteId: string) {
  const [rel] = await db
    .select()
    .from(coachRelationships)
    .where(and(
      eq(coachRelationships.coachId, coachId),
      eq(coachRelationships.athleteId, athleteId),
      eq(coachRelationships.status, "accepted")
    ));
  return !!rel;
}

export async function GET(_req: Request, { params }: { params: { athleteId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await verifyCoachAccess(session.user.id, params.athleteId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, params.athleteId))
    .orderBy(desc(bodyMetrics.date));

  return NextResponse.json(rows);
}
