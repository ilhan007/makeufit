import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { plans, planSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string; sessionId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planId = parseInt(params.id);
  const sessionId = parseInt(params.sessionId);

  const [plan] = await getDb().select().from(plans).where(and(eq(plans.id, planId), eq(plans.authorId, session.user.id)));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getDb().delete(planSessions).where(and(eq(planSessions.id, sessionId), eq(planSessions.planId, planId)));
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request: Request, { params }: { params: { id: string; sessionId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planId = parseInt(params.id);
  const sessionId = parseInt(params.sessionId);

  const [plan] = await getDb().select().from(plans).where(and(eq(plans.id, planId), eq(plans.authorId, session.user.id)));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const schema = z.object({ name: z.string().min(1).max(100).optional(), rounds: z.number().int().min(1).nullable().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await getDb()
    .update(planSessions)
    .set({ ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}), ...(parsed.data.rounds !== undefined ? { rounds: parsed.data.rounds } : {}) })
    .where(and(eq(planSessions.id, sessionId), eq(planSessions.planId, planId)))
    .returning();

  return NextResponse.json(updated[0]);
}
