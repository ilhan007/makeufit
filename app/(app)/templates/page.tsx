import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutTemplates, templateExercises } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import {
  Button,
  Card,
  FlexBox,
  FlexBoxJustifyContent,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";

export default async function TemplatesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

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
    .where(eq(workoutTemplates.coachId, userId))
    .groupBy(workoutTemplates.id);

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">Plans</Title>
        <Link href="/templates/new">
          <Button design="Emphasized">New Plan</Button>
        </Link>
      </FlexBox>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            name="NoData"
            titleText="No plans yet"
            subtitleText="Create a plan to assign workouts to your athletes"
          />
        ) : (
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Exercises</TableHeaderCell>
                <TableHeaderCell>Notes</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {rows.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.exerciseCount}</TableCell>
                <TableCell>{t.notes ?? "—"}</TableCell>
                <TableCell>
                  <DeleteButton url={`/api/templates/${t.id}`} label="Delete" />
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
