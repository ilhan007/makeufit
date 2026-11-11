import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { users, coachRelationships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { coachRequestSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [coach] = await getDb().select().from(users).where(eq(users.id, parsed.data.coachId));
  if (!coach) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const [existing] = await getDb()
    .select()
    .from(coachRelationships)
    .where(and(eq(coachRelationships.coachId, coach.id), eq(coachRelationships.athleteId, session.user.id)));

  if (existing) {
    return NextResponse.json({ error: "A request already exists.", relationship: existing }, { status: 409 });
  }

  const [row] = await getDb()
    .insert(coachRelationships)
    .values({ coachId: coach.id, athleteId: session.user.id })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getDb()
    .select({
      id: coachRelationships.id,
      status: coachRelationships.status,
      createdAt: coachRelationships.createdAt,
      coachName: users.name,
      coachEmail: users.email,
      coachImage: users.image,
    })
    .from(coachRelationships)
    .innerJoin(users, eq(users.id, coachRelationships.coachId))
    .where(eq(coachRelationships.athleteId, session.user.id));

  return NextResponse.json(rows);
}
