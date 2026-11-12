import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { workouts, workoutExercises, workoutSets, exercises } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
  Text,
} from "@ui5/webcomponents-react";

export default async function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;
  const workoutId = parseInt(params.id);

  const [workout] = await getDb()
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  if (!workout) notFound();

  const rows = await getDb()
    .select({
      weId: workoutExercises.id,
      orderIndex: workoutExercises.orderIndex,
      exerciseName: exercises.name,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      durationSeconds: workoutSets.durationSeconds,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .leftJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.orderIndex, workoutSets.setNumber);

  const exerciseMap = new Map<number, { name: string; sets: typeof rows }>();
  for (const row of rows) {
    if (!exerciseMap.has(row.weId)) exerciseMap.set(row.weId, { name: row.exerciseName, sets: [] });
    if (row.setId !== null) exerciseMap.get(row.weId)!.sets.push(row);
  }

  return (
    <div>
      <Link href="/workouts" style={{ textDecoration: "none" }}>
        <Button design="Transparent" icon="nav-back" style={{ marginBottom: "1rem" }} />
      </Link>

      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <div>
          <Title level="H2">{workout.name}</Title>
          <Text>{new Date(workout.date).toLocaleDateString()}</Text>
          {workout.notes && <Text style={{ display: "block", marginTop: 4 }}>{workout.notes}</Text>}
        </div>
        <FlexBox style={{ gap: "0.5rem" }}>
          <DeleteButton url={`/api/workouts/${workoutId}`} redirectTo="/workouts" label="Delete" />
        </FlexBox>
      </FlexBox>

      {Array.from(exerciseMap.values()).map(({ name, sets }) => (
        <Card key={name} header={<CardHeader titleText={name} />} style={{ marginBottom: "1rem" }}>
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Set</TableHeaderCell>
                <TableHeaderCell>Reps</TableHeaderCell>
                <TableHeaderCell>Weight (kg)</TableHeaderCell>
                <TableHeaderCell>Duration (s)</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {sets.map((s) => (
              <TableRow key={s.setId}>
                <TableCell>{s.setNumber}</TableCell>
                <TableCell>{s.reps ?? "—"}</TableCell>
                <TableCell>{s.weightKg ?? "—"}</TableCell>
                <TableCell>{s.durationSeconds ?? "—"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </Card>
      ))}
    </div>
  );
}
