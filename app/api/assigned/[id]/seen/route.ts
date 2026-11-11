import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assignedWorkouts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const [row] = await db
    .update(assignedWorkouts)
    .set({ seenAt: new Date() })
    .where(and(eq(assignedWorkouts.id, id), eq(assignedWorkouts.athleteId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
