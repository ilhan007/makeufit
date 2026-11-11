import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { plans, planSessions, planSessionExercises, planSessionSets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSessionSchema = z.object({
  dayNumber: z.number().int().min(1),
  name: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
  exercises: z.array(z.object({
    exerciseId: z.number().int().positive(),
    sets: z.array(z.object({
      setNumber: z.number().int().positive(),
      reps: z.number().int().positive().optional(),
      weightKg: z.number().positive().optional(),
      durationSeconds: z.number().int().positive().optional(),
    })),
  })),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planId = parseInt(params.id);
  const [plan] = await getDb().select().from(plans).where(and(eq(plans.id, planId), eq(plans.authorId, session.user.id)));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = addSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [ps] = await getDb()
    .insert(planSessions)
    .values({ planId, dayNumber: parsed.data.dayNumber, name: parsed.data.name, notes: parsed.data.notes, orderIndex: parsed.data.dayNumber - 1 })
    .returning();

  for (let i = 0; i < parsed.data.exercises.length; i++) {
    const ex = parsed.data.exercises[i];
    const [pse] = await getDb()
      .insert(planSessionExercises)
      .values({ planSessionId: ps.id, exerciseId: ex.exerciseId, orderIndex: i })
      .returning();
    for (const set of ex.sets) {
      await getDb().insert(planSessionSets).values({ planSessionExerciseId: pse.id, ...set });
    }
  }

  return NextResponse.json(ps, { status: 201 });
}
