import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { offlineAthletes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);
  const [row] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const athleteId = parseInt(params.id);
  const [row] = await getDb()
    .select()
    .from(offlineAthletes)
    .where(and(eq(offlineAthletes.id, athleteId), eq(offlineAthletes.coachId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getDb().delete(offlineAthletes).where(eq(offlineAthletes.id, athleteId));
  return new NextResponse(null, { status: 204 });
}
