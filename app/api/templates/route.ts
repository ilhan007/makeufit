import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutTemplates, templateExercises, templateSets } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { createTemplateSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      notes: workoutTemplates.notes,
      createdAt: workoutTemplates.createdAt,
      exerciseCount: count(templateExercises.id),
    })
    .from(workoutTemplates)
    .leftJoin(templateExercises, eq(templateExercises.templateId, workoutTemplates.id))
    .where(eq(workoutTemplates.coachId, session.user.id))
    .groupBy(workoutTemplates.id);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [template] = await db
    .insert(workoutTemplates)
    .values({ name: parsed.data.name, notes: parsed.data.notes, coachId: session.user.id })
    .returning();

  for (let i = 0; i < parsed.data.exercises.length; i++) {
    const ex = parsed.data.exercises[i];
    const [te] = await db
      .insert(templateExercises)
      .values({ templateId: template.id, exerciseId: ex.exerciseId, orderIndex: i })
      .returning();

    for (const set of ex.sets) {
      await db.insert(templateSets).values({ templateExerciseId: te.id, ...set });
    }
  }

  return NextResponse.json(template, { status: 201 });
}
