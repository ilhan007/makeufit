import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workouts, workoutExercises } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import {
  Button,
  Card,
  FlexBox,
  FlexBoxJustifyContent,
  List,
  ListItemStandard,
  Title,
} from "@ui5/webcomponents-react";

export default async function WorkoutsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const rows = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      date: workouts.date,
      notes: workouts.notes,
      exerciseCount: count(workoutExercises.id),
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date));

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">Workouts</Title>
        <Link href="/workouts/new">
          <Button design="Emphasized">New Workout</Button>
        </Link>
      </FlexBox>

      <Card>
        {rows.length === 0 ? (
          <div style={{ padding: "1rem" }}>
            <ListItemStandard>No workouts yet. Start logging!</ListItemStandard>
          </div>
        ) : (
          <List>
            {rows.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: "none" }}>
                <ListItemStandard
                  description={`${new Date(w.date).toLocaleDateString()} · ${w.exerciseCount} exercise${w.exerciseCount !== 1 ? "s" : ""}`}
                >
                  {w.name}
                </ListItemStandard>
              </Link>
            ))}
          </List>
        )}
      </Card>
    </div>
  );
}
