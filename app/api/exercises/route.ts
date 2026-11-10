import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createExerciseSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(exercises)
    .where(or(eq(exercises.isBuiltin, true), eq(exercises.userId, session.user.id)));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db
    .insert(exercises)
    .values({ ...parsed.data, isBuiltin: false, userId: session.user.id })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
