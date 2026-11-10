import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workouts, bodyMetrics } from "@/db/schema";
import { eq, desc, gte, count, and } from "drizzle-orm";
import {
  Card,
  CardHeader,
  List,
  ListItemStandard,
  Text,
  Title,
} from "@ui5/webcomponents-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [totalWorkouts, recentWorkouts, latestMetric, weekWorkouts] = await Promise.all([
    db.select({ count: count() }).from(workouts).where(eq(workouts.userId, userId)),
    db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date)).limit(5),
    db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId)).orderBy(desc(bodyMetrics.date)).limit(1),
    db.select({ count: count() }).from(workouts).where(and(eq(workouts.userId, userId), gte(workouts.date, weekAgo))),
  ]);

  const stats = [
    { label: "Total Workouts", value: String(totalWorkouts[0].count) },
    { label: "This Week", value: String(weekWorkouts[0].count) },
    { label: "Current Weight", value: latestMetric[0]?.weightKg ? `${latestMetric[0].weightKg} kg` : "—" },
    { label: "Last Workout", value: recentWorkouts[0] ? new Date(recentWorkouts[0].date).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Dashboard</Title>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat) => (
          <Card key={stat.label} style={{ minWidth: 180, flex: "1 1 180px" }}>
            <div style={{ padding: "1rem", textAlign: "center" }}>
              <Text style={{ display: "block", color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>
                {stat.label}
              </Text>
              <Title level="H3">{stat.value}</Title>
            </div>
          </Card>
        ))}
      </div>

      <Card header={<CardHeader titleText="Recent Workouts" />}>
        {recentWorkouts.length === 0 ? (
          <div style={{ padding: "1rem" }}>
            <Text>No workouts yet. Log your first one!</Text>
          </div>
        ) : (
          <List>
            {recentWorkouts.map((w) => (
              <ListItemStandard
                key={w.id}
                description={new Date(w.date).toLocaleDateString()}
              >
                {w.name}
              </ListItemStandard>
            ))}
          </List>
        )}
      </Card>
    </div>
  );
}
