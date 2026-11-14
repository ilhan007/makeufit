"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-left.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";
import { Button, Icon, Tag, Text } from "@ui5/webcomponents-react";

export type SetData = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  editReps: string;
  editWeight: string;
  editDuration: string;
};

export type ExerciseData = {
  exerciseId: number;
  name: string;
  category: string;
  muscleGroup: string | null;
  sets: SetData[];
};

export type Session = {
  id: number;
  dayNumber: number;
  name: string;
  notes: string | null;
  exercises: ExerciseData[];
};

export type Plan = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  isPublic: boolean;
  authorId: string;
  sessions: Session[];
};

export type EnrollmentData = {
  enrollmentId: number;
  planId: number;
  planName: string;
  startDate: string | null;
  totalDays: number;
  sessions: { dayNumber: number; name: string; sessionId: number }[];
  completions: { dayNumber: number; workoutId: number; completedAt: string }[];
};

// ── Day accent colors (rotates through days) ─────────────────────────────────

export const DAY_ACCENTS = [
  { bg: "#eef4ff", border: "#3b82f6", text: "#1d4ed8" },
  { bg: "#f3f0ff", border: "#8b5cf6", text: "#6d28d9" },
  { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
  { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
  { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c" },
  { bg: "#f0f9ff", border: "#0ea5e9", text: "#0369a1" },
];

// ── Calendar helpers ──────────────────────────────────────────────────────────

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function weekStart(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-start
  return addDays(d, diff);
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_DAYS_BG = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

// ── Shared exercise chip display ──────────────────────────────────────────────

export function ExerciseChips({
  exercises,
  repsLabel,
  accentColor,
  accentBg,
}: {
  exercises: ExerciseData[];
  repsLabel: string;
  accentColor?: string;
  accentBg?: string;
}) {
  const headerBg = accentBg ?? "var(--sapHighlightColor, #e8f4ff)";
  const headerBorder = accentColor
    ? `${accentColor}40`
    : "var(--sapTileBorderColor)";
  if (exercises.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {exercises.map((ex, i) => (
        <div
          key={ex.exerciseId + "-" + i}
          style={{
            borderRadius: 8,
            border: "1px solid var(--sapTileBorderColor)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.75rem",
              background: headerBg,
              borderBottom: `1px solid ${headerBorder}`,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "var(--sapTextColor)",
              }}
            >
              {ex.name}
            </span>
            <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.65rem" }}>
              {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
            </Tag>
          </div>
          {ex.sets.length > 0 && (
            <div
              style={{
                padding: "0.5rem 0.75rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.35rem",
              }}
            >
              {ex.sets.map((set) => {
                const parts: string[] = [];
                if (set.reps != null) parts.push(`${set.reps} ${repsLabel}`);
                if (set.weightKg != null) parts.push(`${set.weightKg} kg`);
                if (set.durationSeconds != null)
                  parts.push(`${set.durationSeconds}s`);
                return (
                  <span
                    key={set.setNumber}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.6rem",
                      borderRadius: 20,
                      background: "var(--sapTileBackground)",
                      border: "1px solid var(--sapTileBorderColor)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--sapNeutralTextColor)",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                      }}
                    >
                      {set.setNumber}
                    </span>
                    <span style={{ color: "var(--sapTileBorderColor)" }}>·</span>
                    <span>{parts.length > 0 ? parts.join(" · ") : "—"}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Plan Calendar (follower view) ─────────────────────────────────────────────

export function PlanCalendar({
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

  const startDate = enrollment.startDate
    ? new Date(enrollment.startDate)
    : today;
  startDate.setHours(0, 0, 0, 0);

  // Map dayNumber → calendar date
  const dayToDate = (dn: number) => addDays(startDate, dn - 1);
  // Map calendar date → dayNumber (null if out of plan range)
  const dateToDay = (d: Date): number | null => {
    const diff =
      Math.round((d.getTime() - startDate.getTime()) / 86400000) + 1;
    if (diff < 1 || diff > enrollment.totalDays) return null;
    return diff;
  };

  const completedDays = new Set(enrollment.completions.map((c) => c.dayNumber));
  const sessionByDay = new Map(
    enrollment.sessions.map((s) => [s.dayNumber, s])
  );

  // Current week view
  const [weekOffset, setWeekOffset] = useState(() => {
    const todayDay = dateToDay(today);
    if (todayDay !== null) {
      const ws = weekStart(today);
      const planStart = weekStart(startDate);
      return Math.round(
        (ws.getTime() - planStart.getTime()) / (7 * 86400000)
      );
    }
    return 0;
  });

  const planEndDate = addDays(startDate, enrollment.totalDays - 1);
  const firstWeekStart = weekStart(startDate);
  const viewWeekStart = addDays(firstWeekStart, weekOffset * 7);
  const totalWeeks = Math.ceil(enrollment.totalDays / 7);

  const canPrev = weekOffset > 0;
  const canNext = weekOffset < totalWeeks - 1;

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(viewWeekStart, i)
  );

  // Selected day for detail panel
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const todayDn = dateToDay(today);
    if (todayDn !== null && sessionByDay.has(todayDn)) return todayDn;
    // Find next incomplete workout day
    const nextSession = enrollment.sessions
      .filter((s) => !completedDays.has(s.dayNumber))
      .sort((a, b) => a.dayNumber - b.dayNumber)[0];
    return nextSession?.dayNumber ?? null;
  });

  const selectedSession =
    selectedDay !== null ? sessionByDay.get(selectedDay) ?? null : null;
  const selectedPlanSession = selectedSession
    ? plan.sessions.find((s) => s.id === selectedSession.sessionId) ?? null
    : null;
  const isCompleted =
    selectedDay !== null && completedDays.has(selectedDay);
  const selectedDate =
    selectedDay !== null ? dayToDate(selectedDay) : null;
  const isPast = selectedDate ? selectedDate <= today : false;
  const canComplete =
    selectedDay !== null &&
    !isCompleted &&
    isPast &&
    selectedSession !== null;

  return (
    <div>
      {/* Week navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <Button
          design="Transparent"
          icon="slim-arrow-left"
          disabled={!canPrev}
          onClick={() => setWeekOffset((o) => o - 1)}
        />
        <Text style={{ fontWeight: 600, fontSize: "0.95rem" }}>
          {t("plans.weekOf", {
            date: viewWeekStart.toLocaleDateString(
              i18n.language === "bg" ? "bg-BG" : "en-US",
              { month: "short", day: "numeric" }
            ),
          })}
        </Text>
        <Button
          design="Transparent"
          icon="slim-arrow-right"
          disabled={!canNext}
          onClick={() => setWeekOffset((o) => o + 1)}
        />
      </div>

      {/* 7-day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "0.4rem",
          marginBottom: "1.25rem",
        }}
      >
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
          let textColor = isOutOfRange
            ? "var(--sapContent_DisabledTextColor)"
            : "var(--sapTextColor)";

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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 0.25rem",
                borderRadius: 8,
                border,
                background: bg,
                cursor:
                  isInPlan && !isOutOfRange ? "pointer" : "default",
                opacity: isOutOfRange ? 0.35 : 1,
                minHeight: 64,
                transition: "background 0.12s, border-color 0.12s",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isSelected
                    ? "rgba(255,255,255,0.8)"
                    : "var(--sapNeutralTextColor)",
                  marginBottom: 2,
                }}
              >
                {dayNames[i]}
              </span>
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: isToday ? 700 : 400,
                  color: textColor,
                }}
              >
                {d.getDate()}
              </span>
              {done && (
                <Icon
                  name="accept"
                  style={{
                    fontSize: "0.75rem",
                    color: isSelected
                      ? "#fff"
                      : "var(--sapPositiveColor, #256f3a)",
                    marginTop: 2,
                  }}
                />
              )}
              {!done && hasSession && !isOutOfRange && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    marginTop: 3,
                    background: isSelected
                      ? "#fff"
                      : isPastDay
                      ? "var(--sapCriticalColor, #e9730c)"
                      : "var(--sapNeutralColor, #8a8b8c)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay !== null && (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid var(--sapTileBorderColor)",
            background: "var(--sapTileBackground)",
            padding: "1rem 1.25rem",
          }}
        >
          {selectedSession ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <Text
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      display: "block",
                    }}
                  >
                    {selectedSession.name}
                  </Text>
                  <Text
                    style={{
                      color: "var(--sapNeutralTextColor)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {t("plans.day", { number: selectedDay })} ·{" "}
                    {selectedDate?.toLocaleDateString(
                      i18n.language === "bg" ? "bg-BG" : "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </div>
                {isCompleted ? (
                  <Tag design="Set2" colorScheme="8">
                    {t("plans.completed")}
                  </Tag>
                ) : (
                  <Button
                    design="Emphasized"
                    disabled={
                      !canComplete || completing === selectedDay
                    }
                    onClick={() =>
                      canComplete &&
                      selectedSession &&
                      onComplete(selectedDay, selectedSession.sessionId)
                    }
                  >
                    {completing === selectedDay
                      ? t("plans.saving")
                      : t("plans.completeWorkout")}
                  </Button>
                )}
              </div>

              {selectedPlanSession && (
                <ExerciseChips
                  exercises={selectedPlanSession.exercises}
                  repsLabel={t("workoutDetail.reps").toLowerCase()}
                />
              )}

              {!canComplete && !isCompleted && !isPast && (
                <Text
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--sapNeutralTextColor)",
                    marginTop: "0.5rem",
                    display: "block",
                  }}
                >
                  {t("plans.futureDay")}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              {t("plans.restDay")}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
