import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workouts, bodyMetrics } from "@/db/schema";
import { eq, desc, gte, count, and } from "drizzle-orm";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import {
  Button,
  Card,
  CardHeader,
  List,
  ListItemStandard,
  MessageStrip,
  Text,
  Title,
} from "@ui5/webcomponents-react";

const statColors = [
  { bg: "var(--sapIndicationColor_1b, #fef7e0)", accent: "var(--sapIndicationColor_1, #e9730c)", icon: "🏋️" },
  { bg: "var(--sapIndicationColor_5b, #f0fafa)", accent: "var(--sapIndicationColor_5, #0070f2)", icon: "📅" },
  { bg: "var(--sapIndicationColor_7b, #f5f0ff)", accent: "var(--sapIndicationColor_7, #6c32a9)", icon: "⚖️" },
  { bg: "var(--sapIndicationColor_8b, #f5fce8)", accent: "var(--sapIndicationColor_8, #256f3a)", icon: "📆" },
];

function getGreeting(totalWorkouts: number, weekWorkouts: number) {
  if (totalWorkouts === 0) return { text: "Welcome! Log your first workout to get started.", design: "Information" as const };
  if (weekWorkouts >= 4) return { text: "Amazing week — you've trained 4+ times already! Keep it up 💪", design: "Positive" as const };
  if (weekWorkouts === 0) return { text: "You haven't trained this week yet. Time to get moving!", design: "Critical" as const };
  return { text: `${weekWorkouts} workout${weekWorkouts > 1 ? "s" : ""} this week — great consistency!`, design: "Positive" as const };
}

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

  const total = totalWorkouts[0].count;
  const week = weekWorkouts[0].count;

  const stats = [
    { label: "Total Workouts", value: String(total) },
    { label: "This Week", value: String(week) },
    { label: "Current Weight", value: latestMetric[0]?.weightKg ? `${latestMetric[0].weightKg} kg` : "—" },
    { label: "Last Workout", value: recentWorkouts[0] ? new Date(recentWorkouts[0].date).toLocaleDateString() : "—" },
  ];

  const greeting = getGreeting(total, week);

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1rem" }}>Dashboard</Title>

      <MessageStrip
        design={greeting.design}
        hideCloseButton
        style={{ marginBottom: "1.5rem" }}
      >
        {greeting.text}
      </MessageStrip>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat, i) => {
          const color = statColors[i];
          return (
            <Card key={stat.label} style={{ minWidth: 180, flex: "1 1 180px" }}>
              <div style={{ padding: "1.25rem", textAlign: "center", background: color.bg, borderRadius: "var(--sapElement_BorderCornerRadius, 8px)" }}>
                <div style={{ fontSize: 28, marginBottom: "0.5rem" }}>{color.icon}</div>
                <Text style={{ display: "block", color: color.accent, fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </Text>
                <Title level="H3" style={{ color: color.accent }}>{stat.value}</Title>
              </div>
            </Card>
          );
        })}
      </div>

      <Card header={
        <CardHeader
          titleText="Recent Workouts"
          action={
            <Link href="/workouts/new">
              <Button design="Emphasized">New Workout</Button>
            </Link>
          }
        />
      }>
        {recentWorkouts.length === 0 ? (
          <EmptyState name="NoActivities" titleText="No workouts yet" subtitleText="Log your first session to see it here" />
        ) : (
          <List>
            {recentWorkouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: "none" }}>
                <ListItemStandard
                  description={new Date(w.date).toLocaleDateString()}
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
