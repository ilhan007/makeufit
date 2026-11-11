import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, session.user.id));
  return NextResponse.json({ role: user?.role ?? "athlete" });
}

const schema = z.object({ role: z.enum(["athlete", "coach", "both"]) });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  await getDb().update(users).set({ role: parsed.data.role }).where(eq(users.id, session.user.id));
  return NextResponse.json({ role: parsed.data.role });
}
