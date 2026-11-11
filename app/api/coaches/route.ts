import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, coachRelationships } from "@/db/schema";
import { eq, or, and, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coaches = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role, bio: users.bio })
    .from(users)
    .where(and(
      or(eq(users.role, "coach"), eq(users.role, "both")),
      ne(users.id, session.user.id)
    ));

  const existing = await db
    .select({ coachId: coachRelationships.coachId })
    .from(coachRelationships)
    .where(eq(coachRelationships.athleteId, session.user.id));

  const existingIds = new Set(existing.map(r => r.coachId));
  const available = coaches.filter(c => !existingIds.has(c.id));

  return NextResponse.json(available);
}
