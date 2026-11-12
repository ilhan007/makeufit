"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-left.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Icon,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

type SetData = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  editReps: string;
  editWeight: string;
  editDuration: string;
};

type ExerciseData = {
  exerciseId: number;
  name: string;
  category: string;
  muscleGroup: string | null;
  sets: SetData[];
};

type Session = {
  id: number;
  dayNumber: number;
  name: string;
  notes: string | null;
  exercises: ExerciseData[];
};

type Plan = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  isPublic: boolean;
  authorId: string;
  sessions: Session[];
};

type EnrollmentData = {
  enrollmentId: number;
  planId: number;
  planName: string;
  startDate: string | null;
  totalDays: number;
  sessions: { dayNumber: number; name: string; sessionId: number }[];
  completions: { dayNumber: number; workoutId: number; completedAt: string }[];
};

// ── Calendar helpers ──────────────────────────────────────────────────────────

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekStart(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-start
  return addDays(d, diff);
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_DAYS_BG = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

// ── Plan Calendar (follower view) ─────────────────────────────────────────────

function PlanCalendar({
  enrollment,
  plan,
  onComplete,
  completing,
}: {
  enrollment: EnrollmentData;
  plan: Plan;
  onComplete: (dayNumber: number, sessionId: number) => void;
  completing: number | null;
}) {
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === "bg";
  const dayNames = isBg ? SHORT_DAYS_BG : SHORT_DAYS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = enrollment.startDate ? new Date(enrollment.startDate) : today;
  startDate.setHours(0, 0, 0, 0);

  // Map dayNumber → calendar date
  const dayToDate = (dn: number) => addDays(startDate, dn - 1);
  // Map calendar date → dayNumber (null if out of plan range)
  const dateToDay = (d: Date): number | null => {
    const diff = Math.round((d.getTime() - startDate.getTime()) / 86400000) + 1;
    if (diff < 1 || diff > enrollment.totalDays) return null;
    return diff;
  };

  const completedDays = new Set(enrollment.completions.map(c => c.dayNumber));
  const sessionByDay = new Map(enrollment.sessions.map(s => [s.dayNumber, s]));

  // Current week view
  const [weekOffset, setWeekOffset] = useState(() => {
    // Start on the week that contains today (or the plan's current day)
    const todayDay = dateToDay(today);
    if (todayDay !== null) {
      const ws = weekStart(today);
      const planStart = weekStart(startDate);
      return Math.round((ws.getTime() - planStart.getTime()) / (7 * 86400000));
    }
    return 0;
  });

  const planEndDate = addDays(startDate, enrollment.totalDays - 1);
  const firstWeekStart = weekStart(startDate);
  const viewWeekStart = addDays(firstWeekStart, weekOffset * 7);
  const totalWeeks = Math.ceil(enrollment.totalDays / 7);

  const canPrev = weekOffset > 0;
  const canNext = weekOffset < totalWeeks - 1;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewWeekStart, i));

  // Selected day for detail panel
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const todayDn = dateToDay(today);
    if (todayDn !== null && sessionByDay.has(todayDn)) return todayDn;
    // Find next incomplete workout day
    const nextSession = enrollment.sessions
      .filter(s => !completedDays.has(s.dayNumber))
      .sort((a, b) => a.dayNumber - b.dayNumber)[0];
    return nextSession?.dayNumber ?? null;
  });

  const selectedSession = selectedDay !== null ? sessionByDay.get(selectedDay) ?? null : null;
  const selectedPlanSession = selectedSession
    ? plan.sessions.find(s => s.id === selectedSession.sessionId) ?? null
    : null;
  const isCompleted = selectedDay !== null && completedDays.has(selectedDay);
  const selectedDate = selectedDay !== null ? dayToDate(selectedDay) : null;
  const isPast = selectedDate ? selectedDate <= today : false;
  const canComplete = selectedDay !== null && !isCompleted && isPast && selectedSession !== null;

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <Button design="Transparent" icon="slim-arrow-left" disabled={!canPrev} onClick={() => setWeekOffset(o => o - 1)} />
        <Text style={{ fontWeight: 600, fontSize: "0.95rem" }}>
          {t("plans.weekOf", { date: viewWeekStart.toLocaleDateString(i18n.language === "bg" ? "bg-BG" : "en-US", { month: "short", day: "numeric" }) })}
        </Text>
        <Button design="Transparent" icon="slim-arrow-right" disabled={!canNext} onClick={() => setWeekOffset(o => o + 1)} />
      </div>

      {/* 7-day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {weekDays.map((d, i) => {
          const dn = dateToDay(d);
          const isInPlan = dn !== null;
          const hasSession = dn !== null && sessionByDay.has(dn);
          const done = dn !== null && completedDays.has(dn);
          const isToday = isSameDay(d, today);
          const isSelected = dn !== null && dn === selectedDay;
          const isPastDay = d <= today;
          const isOutOfRange = d < startDate || d > planEndDate;

          let bg = "var(--sapTileBackground)";
          let border = "1px solid var(--sapTileBorderColor)";
          let textColor = isOutOfRange ? "var(--sapContent_DisabledTextColor)" : "var(--sapTextColor)";

          if (isSelected) {
            bg = "var(--sapSelectedColor, #0070f2)";
            border = "2px solid var(--sapSelectedColor, #0070f2)";
            textColor = "#fff";
          } else if (done) {
            bg = "var(--sapPositiveBackground, #f1fdf6)";
            border = "1px solid var(--sapPositiveColor, #256f3a)";
          } else if (isToday && isInPlan) {
            border = "2px solid var(--sapSelectedColor, #0070f2)";
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (isInPlan && !isOutOfRange) setSelectedDay(dn);
              }}
              disabled={!isInPlan || isOutOfRange}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "0.5rem 0.25rem", borderRadius: 8, border, background: bg,
                cursor: isInPlan && !isOutOfRange ? "pointer" : "default",
                opacity: isOutOfRange ? 0.35 : 1,
                minHeight: 64, transition: "background 0.12s, border-color 0.12s",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "0.7rem", color: isSelected ? "rgba(255,255,255,0.8)" : "var(--sapNeutralTextColor)", marginBottom: 2 }}>
                {dayNames[i]}
              </span>
              <span style={{ fontSize: "0.9rem", fontWeight: isToday ? 700 : 400, color: textColor }}>
                {d.getDate()}
              </span>
              {done && (
                <Icon name="accept" style={{ fontSize: "0.75rem", color: isSelected ? "#fff" : "var(--sapPositiveColor, #256f3a)", marginTop: 2 }} />
              )}
              {!done && hasSession && !isOutOfRange && (
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", marginTop: 3,
                  background: isSelected ? "#fff" : isPastDay ? "var(--sapCriticalColor, #e9730c)" : "var(--sapNeutralColor, #8a8b8c)",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay !== null && (
        <div style={{
          borderRadius: 10, border: "1px solid var(--sapTileBorderColor)",
          background: "var(--sapTileBackground)", padding: "1rem 1.25rem",
        }}>
          {selectedSession ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <Text style={{ fontWeight: 700, fontSize: "1rem", display: "block" }}>{selectedSession.name}</Text>
                  <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.8rem" }}>
                    {t("plans.day", { number: selectedDay })} · {selectedDate?.toLocaleDateString(i18n.language === "bg" ? "bg-BG" : "en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </Text>
                </div>
                {isCompleted ? (
                  <Tag design="Set2" colorScheme="8">{t("plans.completed")}</Tag>
                ) : (
                  <Button
                    design="Emphasized"
                    disabled={!canComplete || completing === selectedDay}
                    onClick={() => canComplete && selectedSession && onComplete(selectedDay, selectedSession.sessionId)}
                  >
                    {completing === selectedDay ? t("plans.saving") : t("plans.completeWorkout")}
                  </Button>
                )}
              </div>

              {selectedPlanSession && selectedPlanSession.exercises.length > 0 && (
                <div>
                  {selectedPlanSession.exercises.map((ex, i) => (
                    <div key={ex.exerciseId + "-" + i} style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <Text style={{ fontWeight: 600, fontSize: "0.875rem" }}>{ex.name}</Text>
                        <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>
                          {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                        </Tag>
                      </div>
                      {ex.sets.length > 0 && (
                        <div style={{ paddingLeft: "0.5rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr", gap: "0.4rem", marginBottom: "0.2rem" }}>
                            {[t("workoutDetail.set"), t("workoutDetail.reps"), t("workoutDetail.weight"), t("workoutDetail.duration")].map(h => (
                              <span key={h} style={{ fontSize: "0.7rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>{h}</span>
                            ))}
                          </div>
                          {ex.sets.map(set => (
                            <div key={set.setNumber} style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr", gap: "0.4rem", marginBottom: "0.2rem" }}>
                              <Text style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>{set.setNumber}</Text>
                              <Text style={{ fontSize: "0.8rem" }}>{set.reps ?? "—"}</Text>
                              <Text style={{ fontSize: "0.8rem" }}>{set.weightKg != null ? `${set.weightKg} kg` : "—"}</Text>
                              <Text style={{ fontSize: "0.8rem" }}>{set.durationSeconds != null ? `${set.durationSeconds}s` : "—"}</Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!canComplete && !isCompleted && !isPast && (
                <Text style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", marginTop: "0.5rem", display: "block" }}>
                  {t("plans.futureDay")}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("plans.restDay")}</Text>
          )}
        </div>
      )}
    </div>
  );
}

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

  if (!plan) return <div style={{ padding: "2rem" }}>{t("common.loading")}</div>;

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
              .map(session => (
                <Card
                  key={session.id}
                  header={
                    <CardHeader
                      titleText={session.name}
                      subtitleText={`${t("plans.day", { number: session.dayNumber })}${session.notes ? ` · ${session.notes}` : ""}`}
                      action={
                        <Button
                          design="Emphasized"
                          onClick={() => completeWorkout(session)}
                          disabled={completing === session.id}
                        >
                          {completing === session.id ? t("plans.saving") : t("plans.completeWorkout")}
                        </Button>
                      }
                    />
                  }
                  style={{ marginBottom: "1rem" }}
                >
                  <div style={{ padding: "0.75rem 1rem" }}>
                    {session.exercises.length === 0 ? (
                      <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("plans.noExercises")}</Text>
                    ) : (
                      session.exercises.map((ex, exIdx) => (
                        <div key={ex.exerciseId + "-" + exIdx} style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <Text style={{ fontWeight: 600 }}>{ex.name}</Text>
                            <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>
                              {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                            </Tag>
                          </div>
                          {ex.sets.length > 0 && (
                            <div style={{ paddingLeft: "0.75rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                {[t("workoutDetail.set"), t("workoutDetail.reps"), t("workoutDetail.weight"), t("workoutDetail.duration")].map(h => (
                                  <span key={h} style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>{h}</span>
                                ))}
                              </div>
                              {ex.sets.map(set => (
                                <div key={set.setNumber} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem", alignItems: "center" }}>
                                  <Text style={{ fontSize: "0.875rem", color: "var(--sapNeutralTextColor)" }}>{set.setNumber}</Text>
                                  <Text style={{ fontSize: "0.875rem" }}>{set.reps ?? "—"}</Text>
                                  <Text style={{ fontSize: "0.875rem" }}>{set.weightKg != null ? `${set.weightKg} kg` : "—"}</Text>
                                  <Text style={{ fontSize: "0.875rem" }}>{set.durationSeconds != null ? `${set.durationSeconds}s` : "—"}</Text>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ))
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
          {plan.sessions.sort((a, b) => a.dayNumber - b.dayNumber).map(session => (
            <Card
              key={session.id}
              header={<CardHeader titleText={session.name} subtitleText={t("plans.day", { number: session.dayNumber })} />}
              style={{ marginBottom: "1rem" }}
            >
              <div style={{ padding: "0.75rem 1rem" }}>
                {session.exercises.length === 0 ? (
                  <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("plans.noExercises")}</Text>
                ) : (
                  session.exercises.map((ex, exIdx) => (
                    <div key={ex.exerciseId + "-" + exIdx} style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <Text style={{ fontWeight: 600 }}>{ex.name}</Text>
                        <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>
                          {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                        </Tag>
                      </div>
                      {ex.sets.length > 0 && (
                        <div style={{ paddingLeft: "0.75rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem" }}>
                            {[t("workoutDetail.set"), t("workoutDetail.reps"), t("workoutDetail.weight"), t("workoutDetail.duration")].map(h => (
                              <span key={h} style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>{h}</span>
                            ))}
                          </div>
                          {ex.sets.map(set => (
                            <div key={set.setNumber} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem" }}>
                              <Text style={{ fontSize: "0.875rem", color: "var(--sapNeutralTextColor)" }}>{set.setNumber}</Text>
                              <Text style={{ fontSize: "0.875rem" }}>{set.reps ?? "—"}</Text>
                              <Text style={{ fontSize: "0.875rem" }}>{set.weightKg != null ? `${set.weightKg} kg` : "—"}</Text>
                              <Text style={{ fontSize: "0.875rem" }}>{set.durationSeconds != null ? `${set.durationSeconds}s` : "—"}</Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
