import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bodyMetrics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createMetricsSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, session.user.id))
    .orderBy(desc(bodyMetrics.date));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createMetricsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db
    .insert(bodyMetrics)
    .values({ ...parsed.data, date: new Date(parsed.data.date), userId: session.user.id })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
