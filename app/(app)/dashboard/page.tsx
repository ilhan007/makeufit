"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
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

type Workout = { id: number; name: string; date: string; notes: string | null };
type Metric = { id: number; date: string; weightKg: number | null; bodyFatPct: number | null; waistCm: number | null };

export default function DashboardPage() {
  const { t } = useTranslation();
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [latestMetric, setLatestMetric] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then(r => r.json()),
      fetch("/api/metrics").then(r => r.json()),
    ]).then(([workoutsData, metricsData]) => {
      setAllWorkouts(Array.isArray(workoutsData) ? workoutsData : []);
      const metrics: Metric[] = Array.isArray(metricsData) ? metricsData : [];
      setLatestMetric(metrics.length > 0 ? metrics[0] : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const total = allWorkouts.length;
  const recentWorkouts = allWorkouts.slice(0, 5);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const week = allWorkouts.filter(w => new Date(w.date) >= weekAgo).length;

  function getGreeting(totalWorkouts: number, weekWorkouts: number): { text: string; design: "Information" | "Positive" | "Critical" } {
    if (totalWorkouts === 0) return { text: t("dashboard.greeting_first"), design: "Information" };
    if (weekWorkouts >= 4) return { text: t("dashboard.greeting_great_week"), design: "Positive" };
    if (weekWorkouts === 0) return { text: t("dashboard.greeting_no_week"), design: "Critical" };
    return {
      text: weekWorkouts === 1
        ? t("dashboard.greeting_week", { count: weekWorkouts })
        : t("dashboard.greeting_week_plural", { count: weekWorkouts }),
      design: "Positive",
    };
  }

  const stats = [
    { label: t("dashboard.totalWorkouts"), value: String(total) },
    { label: t("dashboard.thisWeek"), value: String(week) },
    { label: t("dashboard.currentWeight"), value: latestMetric?.weightKg ? `${latestMetric.weightKg} kg` : "—" },
    { label: t("dashboard.lastWorkout"), value: recentWorkouts[0] ? new Date(recentWorkouts[0].date).toLocaleDateString() : "—" },
  ];

  const greeting = getGreeting(total, week);

  if (loading) {
    return (
      <div>
        <Card style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ padding: "2rem 1rem 1rem" }}>
            <WelcomeIllustration
              titleText={t("dashboard.welcome")}
              subtitleText={t("common.loading")}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {total === 0 ? (
        <div>
          {/* Hero illustration */}
          <Card style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            <div style={{ padding: "2rem 1rem 1rem" }}>
              <WelcomeIllustration
                titleText={t("dashboard.welcome")}
                subtitleText={t("dashboard.subtitle")}
              />
            </div>
          </Card>

          {/* Getting started cards */}
          <Title level="H4" style={{ marginBottom: "1rem", color: "var(--sapNeutralTextColor)" }}>
            {t("dashboard.getStarted")}
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_5b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="add" style={{ color: "var(--sapIndicationColor_5)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>{t("dashboard.logWorkout")}</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  {t("dashboard.logWorkoutDesc")}
                </Text>
                <Link href="/workouts/new">
                  <Button design="Emphasized" style={{ width: "100%" }}>{t("dashboard.startLogging")}</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_7b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="document-text" style={{ color: "var(--sapIndicationColor_7)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>{t("dashboard.followPlan")}</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  {t("dashboard.followPlanDesc")}
                </Text>
                <Link href="/plans">
                  <Button design="Default" style={{ width: "100%" }}>{t("dashboard.browsePlans")}</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sapIndicationColor_8b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="manager" style={{ color: "var(--sapIndicationColor_8)", fontSize: "1.25rem" }} />
                  </div>
                  <Title level="H5" style={{ margin: 0 }}>{t("dashboard.getCoach")}</Title>
                </div>
                <Text style={{ color: "var(--sapNeutralTextColor)", flex: 1 }}>
                  {t("dashboard.getCoachDesc")}
                </Text>
                <Link href="/coach">
                  <Button design="Default" style={{ width: "100%" }}>{t("dashboard.findCoach")}</Button>
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
              titleText={t("dashboard.recentWorkouts")}
              action={
                <Link href="/workouts/new">
                  <Button design="Emphasized">{t("dashboard.newWorkout")}</Button>
                </Link>
              }
            />
          }>
            {recentWorkouts.length === 0 ? (
              <EmptyState name="NoActivities" titleText={t("dashboard.noWorkouts")} subtitleText={t("dashboard.noWorkoutsSubtitle")} />
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
