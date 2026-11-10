import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createExerciseSchema } from "@/lib/validations";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const body = await request.json();
  const parsed = createExerciseSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db
    .update(exercises)
    .set(parsed.data)
    .where(and(eq(exercises.id, id), eq(exercises.userId, session.user.id), eq(exercises.isBuiltin, false)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const deleted = await db
    .delete(exercises)
    .where(and(eq(exercises.id, id), eq(exercises.userId, session.user.id), eq(exercises.isBuiltin, false)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
