import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coachRelationships } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { coachRequestStatusSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const body = await request.json();
  const parsed = coachRequestStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db
    .update(coachRelationships)
    .set({ status: parsed.data.status })
    .where(and(eq(coachRelationships.id, id), eq(coachRelationships.coachId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
