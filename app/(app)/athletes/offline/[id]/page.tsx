"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef, DatePickerDomRef } from "@ui5/webcomponents-react";
import type { DatePickerChangeEventDetail } from "@ui5/webcomponents/dist/DatePicker.js";
import {
  BusyIndicator,
  Button,
  Card,
  CardHeader,
  DatePicker,
  Dialog,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  List,
  ListItemStandard,
  Option,
  Select,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import {
  PlanCalendar,
  type Plan,
  type ExerciseData,
  type SetData,
  type EnrollmentData,
} from "@/components/PlanCalendar";

type OfflineAthlete = {
  id: number;
  name: string;
  email: string | null;
};

type Exercise = {
  id: number;
  name: string;
  category: string;
  muscleGroup: string | null;
  isBuiltin: boolean;
};

type SetEntry = {
  tempId: number;
  setNumber: number;
  reps: string;
  weightKg: string;
  durationSeconds: string;
};

type ExerciseEntry = {
  exercise: Exercise;
  sets: SetEntry[];
  rounds: string; // circuit rounds — if set, expand to N identical sets on save
};

type WorkoutRow = {
  id: number;
  name: string;
  date: string | number;
  exerciseCount: number;
};

type MetricRow = {
  id: number;
  date: string | number;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
};

type PlanListItem = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  isPublic: boolean;
  authorId: string;
  sessionCount: number;
};

type EnrollmentListItem = {
  id: number;
  planId: number;
  planName: string;
  weeksCount: number;
  startDate: string | null;
};

type EnrollmentWithPlan = {
  enrollment: EnrollmentData;
  plan: Plan;
};

let tempIdCounter = 0;

export default function OfflineAthletePage() {
  const params = useParams();
  const athleteId = params.id as string;
  const { t } = useTranslation();

  const [athlete, setAthlete] = useState<OfflineAthlete | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutRow[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<MetricRow[]>([]);

  // Plans state
  const [enrollmentsWithPlans, setEnrollmentsWithPlans] = useState<EnrollmentWithPlan[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [coachPlans, setCoachPlans] = useState<PlanListItem[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);

  // Log workout state
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [workoutSaving, setWorkoutSaving] = useState(false);
  const [workoutError, setWorkoutError] = useState("");

  // Exercise dialog state
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [exSearch, setExSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExCategory, setNewExCategory] = useState("strength");
  const [newExMuscleGroup, setNewExMuscleGroup] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // Log metric state
  const [metricDate, setMetricDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [metricSaving, setMetricSaving] = useState(false);
  const [metricError, setMetricError] = useState("");

  useEffect(() => {
    fetch(`/api/offline-athletes/${athleteId}`).then(r => r.json()).then(d => {
      if (!d.error) setAthlete(d);
    });
    fetch("/api/exercises").then(r => r.json()).then(d => setAllExercises(Array.isArray(d) ? d : []));
    fetch(`/api/offline-athletes/${athleteId}/workouts`).then(r => r.json()).then(d => setWorkoutHistory(Array.isArray(d) ? d : []));
    fetch(`/api/offline-athletes/${athleteId}/metrics`).then(r => r.json()).then(d => setMetricsHistory(Array.isArray(d) ? d : []));
    loadEnrollments();
  }, [athleteId]);

  async function loadEnrollments() {
    const rows: EnrollmentListItem[] = await fetch(`/api/offline-athletes/${athleteId}/plans`).then(r => r.json()).then(d => Array.isArray(d) ? d : []);

    // For each enrollment, fetch its full data and the plan details
    const pairs: EnrollmentWithPlan[] = [];
    for (const row of rows) {
      const [enrollmentData, planData] = await Promise.all([
        fetch(`/api/offline-athletes/${athleteId}/plans/${row.id}`).then(r => r.json()),
        fetch(`/api/plans/${row.planId}`).then(r => r.json()),
      ]);
      if (!enrollmentData.error && !planData.error) {
        // Hydrate plan sets with edit fields (same pattern as plans/[id]/page.tsx)
        const hydratedPlan: Plan = {
          ...planData,
          sessions: (planData.sessions ?? []).map((s: { id: number; dayNumber: number; name: string; notes: string | null; exercises: Array<Omit<ExerciseData, "sets"> & { sets: Array<Omit<SetData, "editReps" | "editWeight" | "editDuration">> }> }) => ({
            ...s,
            exercises: (s.exercises ?? []).map((ex: Omit<ExerciseData, "sets"> & { sets: Array<Omit<SetData, "editReps" | "editWeight" | "editDuration">> }) => ({
              ...ex,
              sets: (ex.sets ?? []).map((set: Omit<SetData, "editReps" | "editWeight" | "editDuration">) => ({
                ...set,
                editReps: set.reps != null ? String(set.reps) : "",
                editWeight: set.weightKg != null ? String(set.weightKg) : "",
                editDuration: set.durationSeconds != null ? String(set.durationSeconds) : "",
              })),
            })),
          })),
        };
        pairs.push({ enrollment: enrollmentData, plan: hydratedPlan });
      }
    }
    setEnrollmentsWithPlans(pairs);
  }

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  const filteredExercises = allExercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase())
  );

  function addExercise(ex: Exercise) {
    setExerciseEntries(prev => [
      ...prev,
      { exercise: ex, rounds: "", sets: [{ tempId: ++tempIdCounter, setNumber: 1, reps: "", weightKg: "", durationSeconds: "" }] },
    ]);
    setExDialogOpen(false);
    setExSearch("");
  }

  function addSet(exIdx: number) {
    setExerciseEntries(prev =>
      prev.map((entry, i) =>
        i !== exIdx ? entry : {
          ...entry,
          sets: [...entry.sets, { tempId: ++tempIdCounter, setNumber: entry.sets.length + 1, reps: "", weightKg: "", durationSeconds: "" }],
        }
      )
    );
  }

  function updateSet(exIdx: number, setTempId: number, field: keyof SetEntry, value: string) {
    setExerciseEntries(prev =>
      prev.map((entry, i) =>
        i !== exIdx ? entry : {
          ...entry, sets: entry.sets.map(s => s.tempId === setTempId ? { ...s, [field]: value } : s),
        }
      )
    );
  }

  function removeSet(exIdx: number, setTempId: number) {
    setExerciseEntries(prev =>
      prev.map((entry, i) =>
        i !== exIdx ? entry : {
          ...entry,
          sets: entry.sets.filter(s => s.tempId !== setTempId).map((s, idx) => ({ ...s, setNumber: idx + 1 })),
        }
      )
    );
  }

  function removeExercise(exIdx: number) {
    setExerciseEntries(prev => prev.filter((_, i) => i !== exIdx));
  }

  async function createAndAdd() {
    if (!newExName.trim()) return;
    setCreateSaving(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newExName.trim(), category: newExCategory, muscleGroup: newExMuscleGroup || undefined }),
    });
    if (res.ok) {
      const ex: Exercise = await res.json();
      setAllExercises(prev => [...prev, ex]);
      addExercise(ex);
      setCreating(false);
      setNewExName(""); setNewExCategory("strength"); setNewExMuscleGroup("");
    }
    setCreateSaving(false);
  }

  async function openAssignDialog() {
    const data = await fetch("/api/plans").then(r => r.json());
    setCoachPlans(Array.isArray(data) ? data : []);
    setAssignDialogOpen(true);
  }

  async function assignPlan(planId: number) {
    setEnrolling(true);
    try {
      await fetch(`/api/offline-athletes/${athleteId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      setAssignDialogOpen(false);
      await loadEnrollments();
    } finally {
      setEnrolling(false);
    }
  }

  async function completeDay(enrollmentId: number, dayNumber: number, sessionId: number) {
    setCompleting(dayNumber);
    try {
      const res = await fetch(`/api/offline-athletes/${athleteId}/plans/${enrollmentId}/complete-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, sessionId }),
      });
      if (!res.ok) throw new Error("Failed");
      const completion = await res.json();
      setEnrollmentsWithPlans(prev =>
        prev.map(item =>
          item.enrollment.enrollmentId !== enrollmentId ? item : {
            ...item,
            enrollment: {
              ...item.enrollment,
              completions: [
                ...item.enrollment.completions.filter(c => c.dayNumber !== dayNumber),
                {
                  dayNumber: completion.dayNumber,
                  workoutId: completion.workoutId,
                  completedAt: completion.completedAt,
                },
              ],
            },
          }
        )
      );
    } finally {
      setCompleting(null);
    }
  }

  async function saveWorkout() {
    if (!workoutName.trim()) { setWorkoutError(t("newWorkout.nameRequired")); return; }
    setWorkoutError("");
    setWorkoutSaving(true);
    try {
      // Parse date safely — DatePicker returns locale string like "Nov 13, 2026" or "11/13/2026"
      const parsedDate = new Date(workoutDate);
      const isoDate = isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();

      const wRes = await fetch(`/api/offline-athletes/${athleteId}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workoutName.trim(), date: isoDate, notes: workoutNotes.trim() || undefined }),
      });
      if (!wRes.ok) throw new Error("Failed to create workout");
      const workout = await wRes.json();

      for (const entry of exerciseEntries) {
        // Expand rounds: if rounds > 1, repeat the single set template N times
        const roundCount = entry.rounds ? parseInt(entry.rounds) : 0;
        const setsToSave = roundCount > 1
          ? Array.from({ length: roundCount }, (_, i) => ({
              ...entry.sets[0],
              setNumber: i + 1,
              tempId: i,
            }))
          : entry.sets;

        for (const set of setsToSave) {
          if (!set.reps && !set.durationSeconds) continue;
          await fetch(`/api/offline-athletes/${athleteId}/workouts/${workout.id}/sets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exerciseId: entry.exercise.id,
              setNumber: set.setNumber,
              reps: set.reps ? parseInt(set.reps) : undefined,
              weightKg: set.weightKg ? parseFloat(set.weightKg) : undefined,
              durationSeconds: set.durationSeconds ? parseInt(set.durationSeconds) : undefined,
            }),
          });
        }
      }
      // Refresh workout history and reset form
      const updated = await fetch(`/api/offline-athletes/${athleteId}/workouts`).then(r => r.json());
      setWorkoutHistory(Array.isArray(updated) ? updated : []);
      setWorkoutName("");
      setWorkoutNotes("");
      setExerciseEntries([]);
      setWorkoutDate(new Date().toLocaleDateString("en-CA"));
    } catch {
      setWorkoutError(t("newWorkout.error"));
    } finally {
      setWorkoutSaving(false);
    }
  }

  async function saveMetric() {
    setMetricError("");
    setMetricSaving(true);
    try {
      const body: Record<string, unknown> = { date: new Date(metricDate).toISOString() };
      if (weightKg) body.weightKg = parseFloat(weightKg);
      if (bodyFatPct) body.bodyFatPct = parseFloat(bodyFatPct);
      if (waistCm) body.waistCm = parseFloat(waistCm);
      const res = await fetch(`/api/offline-athletes/${athleteId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newMetric = await res.json();
      setMetricsHistory(prev => [newMetric, ...prev]);
      setWeightKg(""); setBodyFatPct(""); setWaistCm("");
    } catch {
      setMetricError(t("metrics.error"));
    } finally {
      setMetricSaving(false);
    }
  }

  if (!athlete) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
        <BusyIndicator active size="L" />
      </div>
    );
  }

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <FlexBox style={{ alignItems: "center", gap: "1rem" }}>
          <Title level="H2">{athlete.name}</Title>
          <Tag design="Set1" colorScheme="6">{t("offlineAthletes.offlineTag")}</Tag>
        </FlexBox>
        <Link href="/athletes">
          <Button design="Default">{t("offlineAthletes.back")}</Button>
        </Link>
      </FlexBox>

      {athlete.email && (
        <Text style={{ color: "var(--sapNeutralTextColor)", marginBottom: "1.5rem", display: "block" }}>{athlete.email}</Text>
      )}

      {/* Plans Section */}
      <Card
        header={
          <CardHeader
            titleText={t("offlineAthletes.plans")}
            action={
              <Button design="Default" onClick={openAssignDialog}>
                {t("offlineAthletes.assignPlan")}
              </Button>
            }
          />
        }
        style={{ marginBottom: "1.5rem" }}
      >
        <div style={{ padding: "1rem" }}>
          {enrollmentsWithPlans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <Text style={{ color: "var(--sapNeutralTextColor)", display: "block", marginBottom: "0.5rem" }}>
                {t("offlineAthletes.noPlanAssigned")}
              </Text>
              <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem", display: "block", marginBottom: "1rem" }}>
                {t("offlineAthletes.assignPlanSubtitle")}
              </Text>
              <Button design="Emphasized" onClick={openAssignDialog}>
                {t("offlineAthletes.assignPlan")}
              </Button>
            </div>
          ) : (
            enrollmentsWithPlans.map(({ enrollment, plan }) => (
              <div key={enrollment.enrollmentId} style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div>
                    <Text style={{ fontWeight: 700, fontSize: "1rem", display: "block" }}>{plan.name}</Text>
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.85rem" }}>
                      {plan.weeksCount} {t("plans.weeks_other", { count: plan.weeksCount })} · {enrollment.completions.length}/{enrollment.sessions.length} {t("plans.daysCompleted")}
                    </Text>
                  </div>
                </div>
                <PlanCalendar
                  enrollment={enrollment}
                  plan={plan}
                  onComplete={(dayNumber, sessionId) => completeDay(enrollment.enrollmentId, dayNumber, sessionId)}
                  completing={completing}
                />
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Assign Plan Dialog */}
      <Dialog
        open={assignDialogOpen}
        headerText={t("offlineAthletes.pickPlan")}
        onClose={() => setAssignDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Transparent" onClick={() => setAssignDialogOpen(false)} disabled={enrolling}>
              {t("common.cancel")}
            </Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem" }}>
          {coachPlans.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("newWorkout.noPlans")}</Text>
          ) : (
            <List>
              {coachPlans.map(p => (
                <ListItemStandard
                  key={p.id}
                  description={`${p.weeksCount} weeks · ${p.sessionCount} sessions`}
                  onClick={() => !enrolling && assignPlan(p.id)}
                >
                  {enrolling ? t("offlineAthletes.enrolling") : p.name}
                </ListItemStandard>
              ))}
            </List>
          )}
        </div>
      </Dialog>

      {/* Log Workout */}
      <Card
        header={<CardHeader titleText={t("offlineAthletes.logWorkout")} />}
        style={{ marginBottom: "1.5rem" }}
      >
        <div style={{ padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", marginBottom: "1rem", alignItems: "end" }}>
            <div>
              <Label required>{t("newWorkout.name")}</Label>
              <Input value={workoutName} onInput={handleInput(setWorkoutName)} placeholder={t("newWorkout.namePlaceholder")} style={{ width: "100%" }} />
            </div>
            <div>
              <Label required>{t("newWorkout.date")}</Label>
              <DatePicker
                value={workoutDate}
                onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setWorkoutDate(e.target.value ?? workoutDate)}
              />
            </div>
            <div>
              <Label>{t("newWorkout.notes")}</Label>
              <Input value={workoutNotes} onInput={handleInput(setWorkoutNotes)} placeholder={t("newWorkout.notesPlaceholder")} style={{ width: "100%" }} />
            </div>
          </div>

          {exerciseEntries.map((entry, exIdx) => {
            const isCircuit = !!entry.rounds && parseInt(entry.rounds) > 1;
            return (
            <Card
              key={entry.exercise.id + "-" + exIdx}
              header={
                <CardHeader
                  titleText={entry.exercise.name}
                  subtitleText={entry.exercise.muscleGroup ?? entry.exercise.category}
                  action={<Button design="Negative" onClick={() => removeExercise(exIdx)}>{t("newWorkout.remove")}</Button>}
                />
              }
              style={{ marginBottom: "0.75rem" }}
            >
              <div style={{ padding: "0.75rem" }}>
                {/* Rounds field */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <Label>Rounds (circuit)</Label>
                  <Input
                    type="Number"
                    value={entry.rounds}
                    onInput={(e: Ui5CustomEvent<InputDomRef>) => {
                      const v = e.target.value ?? "";
                      setExerciseEntries(prev => prev.map((en, i) => i === exIdx ? { ...en, rounds: v } : en));
                    }}
                    placeholder="e.g. 3"
                    style={{ width: "5rem" }}
                  />
                  {isCircuit && (
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.85rem" }}>
                      {entry.rounds} × each set below will repeat
                    </Text>
                  )}
                </div>

                {/* Sets */}
                <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "0.875rem" }}>
                  <span>{t("newWorkout.set")}</span>
                  <span>{t("newWorkout.reps")}</span>
                  <span>{t("newWorkout.weight")}</span>
                  <span>{t("newWorkout.duration")}</span>
                  <span />
                </div>
                {(isCircuit ? [entry.sets[0]] : entry.sets).map((set) => (
                  <div key={set.tempId} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                    <Text>{isCircuit ? "×" + entry.rounds : set.setNumber}</Text>
                    <Input value={set.reps} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "reps", e.target.value ?? "")} placeholder="—" />
                    <Input value={set.weightKg} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "weightKg", e.target.value ?? "")} placeholder="—" />
                    <Input value={set.durationSeconds} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "durationSeconds", e.target.value ?? "")} placeholder="—" />
                    {!isCircuit && <Button design="Transparent" onClick={() => removeSet(exIdx, set.tempId)}>✕</Button>}
                    {isCircuit && <span />}
                  </div>
                ))}
                {!isCircuit && (
                  <Button onClick={() => addSet(exIdx)} style={{ marginTop: "0.25rem" }}>{t("newWorkout.addSet")}</Button>
                )}
              </div>
            </Card>
            );
          })}

          <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginTop: "0.75rem" }}>
            <Button onClick={() => setExDialogOpen(true)}>{t("newWorkout.addExercise")}</Button>
            <FlexBox style={{ gap: "0.5rem", alignItems: "center" }}>
              {workoutError && <Text style={{ color: "var(--sapNegativeTextColor)" }}>{workoutError}</Text>}
              <Button design="Emphasized" onClick={saveWorkout} disabled={workoutSaving}>
                {workoutSaving ? t("offlineAthletes.saving") : t("offlineAthletes.logWorkout")}
              </Button>
            </FlexBox>
          </FlexBox>
        </div>
      </Card>

      {/* Log Metric */}
      <Card
        header={<CardHeader titleText={t("offlineAthletes.logMetric")} />}
        style={{ marginBottom: "1.5rem" }}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <Label required>{t("metrics.date")}</Label>
              <DatePicker
                value={metricDate}
                onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setMetricDate(e.target.value ?? metricDate)}
              />
            </div>
            <div><Label>{t("metrics.weight")}</Label><Input value={weightKg} onInput={handleInput(setWeightKg)} placeholder="e.g. 75.5" /></div>
            <div><Label>{t("metrics.bodyFat")}</Label><Input value={bodyFatPct} onInput={handleInput(setBodyFatPct)} placeholder="e.g. 18" /></div>
            <div><Label>{t("metrics.waist")}</Label><Input value={waistCm} onInput={handleInput(setWaistCm)} /></div>
          </div>
          <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem" }}>
            {metricError && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{metricError}</Text>}
            <Button design="Emphasized" onClick={saveMetric} disabled={metricSaving}>
              {metricSaving ? t("offlineAthletes.saving") : t("offlineAthletes.logMetric")}
            </Button>
          </FlexBox>
        </FlexBox>
      </Card>

      {/* Workout History */}
      <Card
        header={<CardHeader titleText={t("offlineAthletes.workoutHistory")} />}
        style={{ marginBottom: "1.5rem" }}
      >
        {workoutHistory.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("athletes.noWorkoutsYet")}</Text></div>
        ) : (
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>{t("athletes.workout")}</TableHeaderCell>
                <TableHeaderCell>{t("athletes.date")}</TableHeaderCell>
                <TableHeaderCell>{t("workouts.exercises_other", { count: "" }).replace(" ", "")}</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {workoutHistory.map(w => (
              <TableRow key={w.id}>
                <TableCell>{w.name}</TableCell>
                <TableCell>{new Date(typeof w.date === "number" ? w.date * 1000 : w.date).toLocaleDateString()}</TableCell>
                <TableCell>{w.exerciseCount}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Metrics History */}
      <Card header={<CardHeader titleText={t("offlineAthletes.metricsHistory")} />}>
        {metricsHistory.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("athletes.noMetrics")}</Text></div>
        ) : (
          <Table
            headerRow={
              <TableHeaderRow>
                <TableHeaderCell>{t("athletes.date")}</TableHeaderCell>
                <TableHeaderCell>{t("athletes.weightKg")}</TableHeaderCell>
                <TableHeaderCell>{t("athletes.bodyFatPct")}</TableHeaderCell>
                <TableHeaderCell>{t("athletes.waistCm")}</TableHeaderCell>
              </TableHeaderRow>
            }
          >
            {metricsHistory.map(m => (
              <TableRow key={m.id}>
                <TableCell>{new Date(typeof m.date === "number" ? m.date * 1000 : m.date).toLocaleDateString()}</TableCell>
                <TableCell>{m.weightKg ? `${m.weightKg} kg` : "—"}</TableCell>
                <TableCell>{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</TableCell>
                <TableCell>{m.waistCm ? `${m.waistCm} cm` : "—"}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      {/* Exercise Add Dialog */}
      <Dialog
        open={exDialogOpen}
        headerText={creating ? t("newWorkout.newExercise") : t("newWorkout.addExerciseTitle")}
        onClose={() => { setExDialogOpen(false); setCreating(false); setExSearch(""); }}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            {creating ? (
              <>
                <Button design="Transparent" onClick={() => setCreating(false)}>{t("newWorkout.back")}</Button>
                <Button design="Emphasized" onClick={createAndAdd} disabled={createSaving || !newExName.trim()}>
                  {createSaving ? t("newWorkout.saving") : t("newWorkout.saveAdd")}
                </Button>
              </>
            ) : (
              <Button design="Transparent" onClick={() => { setExDialogOpen(false); setExSearch(""); }}>{t("newWorkout.cancel")}</Button>
            )}
          </div>
        }
      >
        {creating ? (
          <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <Label required>{t("newWorkout.name")}</Label>
              <Input value={newExName} onInput={(e: Ui5CustomEvent<InputDomRef>) => setNewExName(e.target.value ?? "")} style={{ width: "100%" }} placeholder="e.g. Bulgarian Split Squat" />
            </div>
            <div>
              <Label required>{t("newWorkout.category")}</Label>
              <Select style={{ width: "100%" }} onChange={(e) => setNewExCategory(e.detail.selectedOption.value as string)}>
                <Option value="strength" selected={newExCategory === "strength"}>{t("newWorkout.strength")}</Option>
                <Option value="cardio" selected={newExCategory === "cardio"}>{t("newWorkout.cardio")}</Option>
                <Option value="flexibility" selected={newExCategory === "flexibility"}>{t("newWorkout.flexibility")}</Option>
                <Option value="other" selected={newExCategory === "other"}>{t("newWorkout.other")}</Option>
              </Select>
            </div>
            <div>
              <Label>{t("newWorkout.muscleGroup")}</Label>
              <Select style={{ width: "100%" }} onChange={(e) => setNewExMuscleGroup(e.detail.selectedOption.value as string)}>
                <Option value="" selected={!newExMuscleGroup}>{t("newWorkout.noneOption")}</Option>
                <Option value="chest">{t("newWorkout.chest")}</Option>
                <Option value="back">{t("newWorkout.back_muscle")}</Option>
                <Option value="legs">{t("newWorkout.legs")}</Option>
                <Option value="shoulders">{t("newWorkout.shoulders")}</Option>
                <Option value="arms">{t("newWorkout.arms")}</Option>
                <Option value="core">{t("newWorkout.core")}</Option>
                <Option value="full_body">{t("newWorkout.fullBody")}</Option>
              </Select>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0.75rem 1rem 0" }}>
            <Input
              placeholder={t("newWorkout.search")}
              value={exSearch}
              onInput={handleInput(setExSearch)}
              showClearIcon
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            {filteredExercises.length > 0 ? (
              <List style={{ maxHeight: 320, overflowY: "auto" }}>
                {filteredExercises.map(ex => (
                  <ListItemStandard
                    key={ex.id}
                    description={ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                    onClick={() => addExercise(ex)}
                  >
                    {ex.name}
                  </ListItemStandard>
                ))}
              </List>
            ) : (
              <div style={{ padding: "0.5rem 0 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("newWorkout.noExercisesFound")}</Text>
                <Button design="Default" onClick={() => { setNewExName(exSearch); setCreating(true); }}>
                  {t("newWorkout.createExercise", { name: exSearch || "new exercise" })}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
