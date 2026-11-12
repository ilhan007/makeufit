import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { workouts, workoutExercises } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { createWorkoutSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getDb()
    .select({
      id: workouts.id,
      name: workouts.name,
      date: workouts.date,
      notes: workouts.notes,
      exerciseCount: count(workoutExercises.id),
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.userId, session.user.id))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const [row] = await getDb()
      .insert(workouts)
      .values({
        ...parsed.data,
        date: new Date(parsed.data.date),
        userId: session.user.id,
      })
      .returning();

    revalidatePath("/dashboard");
    revalidatePath("/workouts");
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("POST /api/workouts error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
