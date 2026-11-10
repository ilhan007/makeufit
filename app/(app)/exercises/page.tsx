import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import Link from "next/link";
import {
  Button,
  FlexBox,
  FlexBoxJustifyContent,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Title,
} from "@ui5/webcomponents-react";

export default async function ExercisesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const rows = await db
    .select()
    .from(exercises)
    .where(or(eq(exercises.isBuiltin, true), eq(exercises.userId, userId)));

  const builtin = rows.filter((e) => e.isBuiltin);
  const custom = rows.filter((e) => !e.isBuiltin);

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">Exercises</Title>
        <Link href="/exercises/new">
          <Button design="Emphasized">Add Custom Exercise</Button>
        </Link>
      </FlexBox>

      <Title level="H4" style={{ marginBottom: "0.75rem" }}>Exercise Library</Title>
      <Table
        style={{ marginBottom: "2rem" }}
        headerRow={
          <TableHeaderRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Muscle Group</TableHeaderCell>
          </TableHeaderRow>
        }
      >
        {builtin.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{e.name}</TableCell>
            <TableCell>{e.category}</TableCell>
            <TableCell>{e.muscleGroup ?? "—"}</TableCell>
          </TableRow>
        ))}
      </Table>

      {custom.length > 0 && (
        <>
          <Title level="H4" style={{ marginBottom: "0.75rem" }}>My Custom Exercises</Title>
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Muscle Group</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {custom.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>{e.muscleGroup ?? "—"}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
