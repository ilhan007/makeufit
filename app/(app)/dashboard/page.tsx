import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { workouts, bodyMetrics } from "@/db/schema";
import { eq, desc, gte, count, and } from "drizzle-orm";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { WelcomeIllustration } from "@/components/WelcomeIllustration";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/document-text.js";
import "@ui5/webcomponents-icons/dist/manager.js";
import {
  Button,
  Card,
  CardHeader,
  Icon,
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
    getDb().select({ count: count() }).from(workouts).where(eq(workouts.userId, userId)),
    getDb().select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date)).limit(5),
    getDb().select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId)).orderBy(desc(bodyMetrics.date)).limit(1),
    getDb().select({ count: count() }).from(workouts).where(and(eq(workouts.userId, userId), gte(workouts.date, weekAgo))),
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
      {total === 0 ? (
        <div>
          {/* Hero illustration */}
          <Card style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            <div style={{ padding: "2rem 1rem 1rem" }}>
              <WelcomeIllustration
                titleText="Welcome to MakeUFit!"
                subtitleText="Your personal fitness companion. Track workouts, follow structured plans, and stay accountable with a coach."
              />
            </div>
          </Card>

          {/* Getting started cards */}
          <Title level="H4" style={{ marginBottom: "1rem", color: "var(--sapNeutralTextColor)" }}>
            Get started — pick what fits you
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_5b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="add" style={{ color: "var(--sapIndicationColor_5)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>Log a workout</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  Just finished a session? Record your exercises, sets, reps and weights directly — no plan needed.
                </Text>
                <Link href="/workouts/new">
                  <Button design="Emphasized" style={{ width: "100%" }}>Start Logging</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_7b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="document-text" style={{ color: "var(--sapIndicationColor_7)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>Follow a plan</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  Browse structured workout plans created by coaches. Add one to your profile and follow it week by week.
                </Text>
                <Link href="/plans">
                  <Button design="Default" style={{ width: "100%" }}>Browse Plans</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_8b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="manager" style={{ color: "var(--sapIndicationColor_8)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>Get a coach</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  Want personalised guidance? Connect with a coach who will assign workouts and track your progress.
                </Text>
                <Link href="/coach">
                  <Button design="Default" style={{ width: "100%" }}>Find a Coach</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
