import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coachRelationships, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET /api/coach/athletes/pending — coach sees pending requests
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: coachRelationships.id,
      status: coachRelationships.status,
      createdAt: coachRelationships.createdAt,
      athleteName: users.name,
      athleteEmail: users.email,
      athleteImage: users.image,
      athleteId: users.id,
    })
    .from(coachRelationships)
    .innerJoin(users, eq(users.id, coachRelationships.athleteId))
    .where(and(eq(coachRelationships.coachId, session.user.id), eq(coachRelationships.status, "pending")));

  return NextResponse.json(rows);
}
