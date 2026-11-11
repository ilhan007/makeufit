import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { coachRelationships, users, workouts, bodyMetrics } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AssignTemplateButton } from "@/components/coach/AssignTemplateButton";
import { EmptyState } from "@/components/EmptyState";
import {
  Avatar,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Text,
  Title,
} from "@ui5/webcomponents-react";

export default async function AthleteDetailPage({ params }: { params: { athleteId: string } }) {
  const session = await auth();
  const coachId = session!.user!.id!;

  const [rel] = await getDb()
    .select()
    .from(coachRelationships)
    .where(and(
      eq(coachRelationships.coachId, coachId),
      eq(coachRelationships.athleteId, params.athleteId),
      eq(coachRelationships.status, "accepted")
    ));

  if (!rel) notFound();

  const [athlete] = await getDb().select().from(users).where(eq(users.id, params.athleteId));
  if (!athlete) notFound();

  const [recentWorkouts, latestMetric, [wCount], metrics] = await Promise.all([
    getDb().select().from(workouts).where(eq(workouts.userId, params.athleteId)).orderBy(desc(workouts.date)).limit(5),
    getDb().select().from(bodyMetrics).where(eq(bodyMetrics.userId, params.athleteId)).orderBy(desc(bodyMetrics.date)).limit(1),
    getDb().select({ count: count() }).from(workouts).where(eq(workouts.userId, params.athleteId)),
    getDb().select().from(bodyMetrics).where(eq(bodyMetrics.userId, params.athleteId)).orderBy(desc(bodyMetrics.date)).limit(10),
  ]);

  const initials = athlete.name ? athlete.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <FlexBox style={{ gap: "1rem", alignItems: "center" }}>
          <Avatar initials={initials} colorScheme="Accent3" size="M">
            {athlete.image && <img src={athlete.image} alt={athlete.name ?? "Athlete"} />}
          </Avatar>
          <div>
            <Title level="H2">{athlete.name ?? athlete.email}</Title>
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>{athlete.email}</Text>
          </div>
        </FlexBox>
        <AssignTemplateButton athleteId={params.athleteId} coachId={coachId} />
      </FlexBox>

      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Workouts", value: String(wCount.count) },
          { label: "Current Weight", value: latestMetric[0]?.weightKg ? `${latestMetric[0].weightKg} kg` : "—" },
          { label: "Body Fat", value: latestMetric[0]?.bodyFatPct ? `${latestMetric[0].bodyFatPct}%` : "—" },
          { label: "Last Workout", value: recentWorkouts[0] ? new Date(recentWorkouts[0].date).toLocaleDateString() : "—" },
        ].map(stat => (
          <Card key={stat.label} style={{ minWidth: 160, flex: "1 1 160px" }}>
            <div style={{ padding: "1rem", textAlign: "center" }}>
              <Text style={{ display: "block", color: "var(--sapNeutralTextColor)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
                {stat.label}
              </Text>
              <Title level="H3">{stat.value}</Title>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Workouts */}
      <Card header={<CardHeader titleText="Recent Workouts" />} style={{ marginBottom: "1.5rem" }}>
        {recentWorkouts.length === 0 ? (
          <EmptyState name="NoActivities" titleText="No workouts yet" subtitleText="" />
        ) : (
          <Table headerRow={
            <TableHeaderRow>
              <TableHeaderCell>Workout</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
            </TableHeaderRow>
          }>
            {recentWorkouts.map(w => (
              <TableRow key={w.id}>
                <TableCell>{w.name}</TableCell>
                <TableCell>{new Date(w.date).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Metrics History */}
      <Card header={<CardHeader titleText="Metrics History" />}>
        {metrics.length === 0 ? (
          <EmptyState name="NoData" titleText="No metrics logged" subtitleText="" />
        ) : (
          <Table headerRow={
            <TableHeaderRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Weight (kg)</TableHeaderCell>
              <TableHeaderCell>Body Fat %</TableHeaderCell>
              <TableHeaderCell>Waist (cm)</TableHeaderCell>
            </TableHeaderRow>
          }>
            {metrics.map(m => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                <TableCell>{m.weightKg ?? "—"}</TableCell>
                <TableCell>{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</TableCell>
                <TableCell>{m.waistCm ?? "—"}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
