"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import Link from "next/link";
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

type Workout = { id: number; name: string; date: string; notes: string | null; exerciseCount: number };

export default function WorkoutsPage() {
  const { t } = useTranslation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workouts")
      .then(r => r.json())
      .then(data => {
        setWorkouts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sessionLabel = t("workouts.sessions_one", { count: workouts.length });
  const sessionLabelPlural = t("workouts.sessions_other", { count: workouts.length });
  const sessionsText = workouts.length === 1 ? sessionLabel : sessionLabelPlural;

  if (loading) {
    return (
      <div>
        <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("workouts.title")}</Title>
        <Card header={<CardHeader titleText={t("common.loading")} />} />
      </div>
    );
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("workouts.title")}</Title>

      <Card header={<CardHeader titleText={sessionsText} />}>
        {workouts.length === 0 ? (
          <EmptyState
            name="NoActivities"
            titleText={t("workouts.noWorkouts")}
            subtitleText={t("workouts.noWorkoutsSubtitle")}
          />
        ) : (
          <List>
            {workouts.map((w) => {
              const exLabel = w.exerciseCount === 1
                ? t("workouts.exercises_one", { count: w.exerciseCount })
                : t("workouts.exercises_other", { count: w.exerciseCount });
              return (
                <ListItemCustom key={w.id} style={{ padding: "0.5rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <Link href={`/workouts/${w.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--sapTextColor)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {w.name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", marginTop: 2 }}>
                        {new Date(w.date).toLocaleDateString()} · {exLabel}
                      </div>
                    </Link>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0, marginLeft: "1rem" }}>
                      <Link href={`/workouts/new?cloneId=${w.id}`}>
                        <Button design="Transparent" tooltip={t("workouts.cloneTooltip")}>
                          <Icon name="copy" />
                        </Button>
                      </Link>
                      <DeleteButton url={`/api/workouts/${w.id}`} label={t("workouts.remove")} />
                    </div>
                  </div>
                </ListItemCustom>
              );
            })}
          </List>
        )}
      </Card>
    </div>
  );
}
