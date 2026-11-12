import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { workouts, workoutExercises } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import "@ui5/webcomponents-icons/dist/copy.js";
import {
  Button,
  Card,
  CardHeader,
  Icon,
  List,
  ListItemCustom,
  Title,
} from "@ui5/webcomponents-react";

export default async function WorkoutsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

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
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date));

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Workout History</Title>

      <Card header={<CardHeader titleText={`${rows.length} session${rows.length !== 1 ? "s" : ""}`} />}>
        {rows.length === 0 ? (
          <EmptyState
            name="NoActivities"
            titleText="No workouts logged yet"
            subtitleText="Complete a day in one of your plans to log a workout"
          />
        ) : (
          <List>
            {rows.map((w) => (
              <ListItemCustom key={w.id} style={{ padding: "0.5rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <Link href={`/workouts/${w.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--sapTextColor)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", marginTop: 2 }}>
                      {new Date(w.date).toLocaleDateString()} · {w.exerciseCount} exercise{w.exerciseCount !== 1 ? "s" : ""}
                    </div>
                  </Link>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0, marginLeft: "1rem" }}>
                    <Link href={`/workouts/new?cloneId=${w.id}`}>
                      <Button design="Transparent" tooltip="Clone workout">
                        <Icon name="copy" />
                      </Button>
                    </Link>
                    <DeleteButton url={`/api/workouts/${w.id}`} label="Remove" />
                  </div>
                </div>
              </ListItemCustom>
            ))}
          </List>
        )}
      </Card>
    </div>
  );
}
