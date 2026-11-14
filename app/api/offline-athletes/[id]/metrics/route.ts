import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes, bodyMetrics } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { createMetricsSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify ownership
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await getDb()
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.offlineAthleteId, athleteId))
    .orderBy(desc(bodyMetrics.date));

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);

  // Verify ownership
  const [athlete] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createMetricsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await getDb()
    .insert(bodyMetrics)
    .values({
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: null,
      offlineAthleteId: athleteId,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
