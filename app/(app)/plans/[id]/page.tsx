"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import {
  BusyIndicator,
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import {
  PlanCalendar,
  ExerciseChips,
  DAY_ACCENTS,
  type Plan,
  type Session,
  type ExerciseData,
  type SetData,
  type EnrollmentData,
} from "@/components/PlanCalendar";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [using, setUsing] = useState(false);
  const [used, setUsed] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);

  useEffect(() => {
    const id = params.id;
    fetch(`/api/plans/${id}`)
      .then(r => r.json())
      .then((data: Omit<Plan, "sessions"> & { sessions: Array<Omit<Session, "exercises"> & { exercises: Array<Omit<ExerciseData, "sets"> & { sets: Array<Omit<SetData, "editReps" | "editWeight" | "editDuration">> }> }> }) => {
        const hydrated: Plan = {
          ...data,
          sessions: data.sessions.map(s => ({
            ...s,
            exercises: s.exercises.map(ex => ({
              ...ex,
              sets: ex.sets.map(set => ({
                ...set,
                editReps: set.reps != null ? String(set.reps) : "",
                editWeight: set.weightKg != null ? String(set.weightKg) : "",
                editDuration: set.durationSeconds != null ? String(set.durationSeconds) : "",
              })),
            })),
          })),
        };
        setPlan(hydrated);
      });

    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });

    // Load enrollment for this plan (if the user is following it)
    fetch("/api/my-plans")
      .then(r => r.json())
      .then(async (rows: Array<{ id: number; planId: number }>) => {
        if (!Array.isArray(rows)) return;
        const planId = parseInt(String(id));
        const row = rows.find(r => r.planId === planId);
        if (row) {
          setIsFollowing(true);
          const ed = await fetch(`/api/my-plans/${row.id}`).then(r => r.json());
          setEnrollment(ed);
        }
      });
  }, [params.id]);

  async function useThisPlan() {
    setUsing(true);
    const res = await fetch("/api/my-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan!.id }),
    });
    const row = await res.json();
    setUsing(false);
    setUsed(true);
    setIsFollowing(true);
    // Load enrollment data
    const ed = await fetch(`/api/my-plans/${row.id}`).then(r => r.json());
    setEnrollment(ed);
    setTimeout(() => setUsed(false), 2000);
  }

  async function completeDay(dayNumber: number, sessionId: number) {
    if (!enrollment) return;
    setCompleting(dayNumber);
    try {
      const res = await fetch(`/api/my-plans/${enrollment.enrollmentId}/complete-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, sessionId }),
      });
      if (!res.ok) throw new Error("Failed");
      const completion = await res.json();
      setEnrollment(prev => prev ? {
        ...prev,
        completions: [...prev.completions.filter(c => c.dayNumber !== dayNumber), {
          dayNumber: completion.dayNumber,
          workoutId: completion.workoutId,
          completedAt: completion.completedAt,
        }],
      } : prev);
    } finally {
      setCompleting(null);
    }
  }

  // Owner complete workout (no enrollment needed)
  async function completeWorkout(session: Session) {
    setCompleting(session.id);
    try {
      const wRes = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: session.name,
          date: new Date().toISOString(),
          notes: `From plan: ${plan!.name}`,
        }),
      });
      if (!wRes.ok) throw new Error("Failed");
      const workout = await wRes.json();
      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          const reps = set.editReps ? parseInt(set.editReps) : undefined;
          const weightKg = set.editWeight ? parseFloat(set.editWeight) : undefined;
          const durationSeconds = set.editDuration ? parseInt(set.editDuration) : undefined;
          if (!reps && !durationSeconds) continue;
          await fetch(`/api/workouts/${workout.id}/sets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exerciseId: ex.exerciseId, setNumber: set.setNumber, reps, weightKg, durationSeconds }),
          });
        }
      }
      router.push("/workouts");
    } catch {
      setCompleting(null);
    }
  }

  if (!plan) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
      <BusyIndicator active size="L" />
    </div>
  );

  const isOwner = plan.authorId === userId;
  const isFollowerNotOwner = !isOwner && isFollowing;

  return (
    <div>
      {/* Header */}
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "0.5rem", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <Link href="/plans">
              <Button design="Transparent" icon="nav-back" />
            </Link>
            <Title level="H2">{plan.name}</Title>
            {plan.isPublic && <Tag design="Set2" colorScheme="8">{t("plans.public")}</Tag>}
          </div>
          <Text style={{ color: "var(--sapNeutralTextColor)", marginLeft: "3rem" }}>
            {t("plans.sessions_other", { count: plan.sessions.length })} · {t("plans.weeks_other", { count: plan.weeksCount })}
            {plan.description && ` · ${plan.description}`}
          </Text>
        </div>
        <FlexBox style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
          {isOwner && (
            <Link href={`/plans/${plan.id}/edit`}>
              <Button>{t("plans.edit")}</Button>
            </Link>
          )}
          {!isOwner && !isFollowing && (
            <Button design="Emphasized" onClick={useThisPlan} disabled={using || used}>
              {used ? t("plans.addedPlan") : using ? t("plans.addingPlan") : t("plans.startPlan")}
            </Button>
          )}
          {isFollowerNotOwner && !used && (
            <Tag design="Set2" colorScheme="8">{t("plans.alreadyFollowing")}</Tag>
          )}
        </FlexBox>
      </FlexBox>

      {/* Follower: calendar view */}
      {isFollowerNotOwner && enrollment && (
        <Card
          header={<CardHeader titleText={t("plans.yourProgress")} subtitleText={`${enrollment.completions.length} / ${enrollment.sessions.length} ${t("plans.daysCompleted")}`} />}
          style={{ marginBottom: "1.5rem" }}
        >
          <div style={{ padding: "1rem" }}>
            <PlanCalendar
              enrollment={enrollment}
              plan={plan}
              onComplete={completeDay}
              completing={completing}
            />
          </div>
        </Card>
      )}

      {/* Owner: sessions list with complete buttons */}
      {isOwner && (
        <div style={{ marginTop: "1.5rem" }}>
          {plan.sessions.length === 0 ? (
            <Card>
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--sapNeutralTextColor)" }}>
                {t("plans.noSessions")}
                <div style={{ marginTop: "1rem" }}>
                  <Link href={`/plans/${plan.id}/edit`}>
                    <Button design="Emphasized">{t("plans.addSessions")}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            plan.sessions
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((session, idx) => {
                const accent = DAY_ACCENTS[idx % DAY_ACCENTS.length];
                return (
                <div
                  key={session.id}
                  style={{
                    borderRadius: 12, border: `1px solid ${accent.border}`,
                    overflow: "hidden", marginBottom: "1rem",
                    background: "var(--sapBaseColor, #fff)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Colored header */}
                  <div style={{
                    background: accent.bg,
                    borderBottom: `1px solid ${accent.border}`,
                    padding: "0.75rem 1rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%",
                        background: accent.border, color: "#fff",
                        fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                      }}>{session.dayNumber}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: accent.text }}>{session.name}</div>
                        {session.notes && (
                          <div style={{ fontSize: "0.78rem", color: "var(--sapNeutralTextColor)", marginTop: 1 }}>{session.notes}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      design="Emphasized"
                      onClick={() => completeWorkout(session)}
                      disabled={completing === session.id}
                    >
                      {completing === session.id ? t("plans.saving") : t("plans.completeWorkout")}
                    </Button>
                  </div>
                  {/* Exercises */}
                  <div style={{ padding: "0.85rem 1rem" }}>
                    {session.exercises.length === 0 ? (
                      <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{t("plans.noExercises")}</Text>
                    ) : (
                      <ExerciseChips exercises={session.exercises} repsLabel={t("workoutDetail.reps").toLowerCase()} accentColor={accent.border} accentBg={accent.bg} />
                    )}
                  </div>
                </div>
                );
              })
          )}

          {plan.sessions.length > 0 && (
            <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
              <Button design="Negative" onClick={async () => {
                if (!confirm(t("plans.confirmDelete"))) return;
                await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
                router.push("/plans");
              }}>{t("plans.deletePlan")}</Button>
            </div>
          )}
        </div>
      )}

      {/* Public viewer (not following, not owner): show sessions read-only */}
      {!isOwner && !isFollowing && (
        <div style={{ marginTop: "1.5rem" }}>
          {plan.sessions.sort((a, b) => a.dayNumber - b.dayNumber).map((session, idx) => {
            const accent = DAY_ACCENTS[idx % DAY_ACCENTS.length];
            return (
            <div
              key={session.id}
              style={{
                borderRadius: 12, border: `1px solid ${accent.border}`,
                overflow: "hidden", marginBottom: "1rem",
                background: "var(--sapBaseColor, #fff)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{
                background: accent.bg, borderBottom: `1px solid ${accent.border}`,
                padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: "50%",
                  background: accent.border, color: "#fff",
                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                }}>{session.dayNumber}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: accent.text }}>{session.name}</span>
              </div>
              <div style={{ padding: "0.85rem 1rem" }}>
                {session.exercises.length === 0 ? (
                  <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{t("plans.noExercises")}</Text>
                ) : (
                  <ExerciseChips exercises={session.exercises} repsLabel={t("workoutDetail.reps").toLowerCase()} accentColor={accent.border} accentBg={accent.bg} />
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
