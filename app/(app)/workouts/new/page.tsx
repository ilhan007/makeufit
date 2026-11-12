"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef, DatePickerDomRef } from "@ui5/webcomponents-react";
import type { DatePickerChangeEventDetail } from "@ui5/webcomponents/dist/DatePicker.js";
import {
  Button,
  Card,
  CardHeader,
  DatePicker,
  Dialog,
  FlexBox,
  FlexBoxJustifyContent,
  Input,
  Label,
  List,
  ListItemStandard,
  Option,
  Select,
  Text,
  Title,
} from "@ui5/webcomponents-react";

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
};

let tempIdCounter = 0;

export default function NewWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneId = searchParams.get("cloneId");
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA")); // yyyy-MM-dd
  const [notes, setNotes] = useState("");
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExCategory, setNewExCategory] = useState("strength");
  const [newExMuscleGroup, setNewExMuscleGroup] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [myPlans, setMyPlans] = useState<Array<{ id: number; name: string; sessionCount: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setAllExercises);
  }, []);

  // Pre-populate from a cloned past workout
  useEffect(() => {
    if (!cloneId) return;
    fetch(`/api/workouts/${cloneId}`)
      .then(r => r.json())
      .then(workout => {
        if (!workout || workout.error) return;
        setName(workout.name);
        if (workout.notes) setNotes(workout.notes);
        setExerciseEntries(
          workout.exercises.map((ex: {
            exerciseId: number; exerciseName: string; category: string; muscleGroup: string | null;
            sets: Array<{ setNumber: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }>;
          }) => ({
            exercise: { id: ex.exerciseId, name: ex.exerciseName, category: ex.category, muscleGroup: ex.muscleGroup, isBuiltin: true },
            sets: ex.sets.map(s => ({
              tempId: ++tempIdCounter,
              setNumber: s.setNumber,
              reps: s.reps != null ? String(s.reps) : "",
              weightKg: s.weightKg != null ? String(s.weightKg) : "",
              durationSeconds: s.durationSeconds != null ? String(s.durationSeconds) : "",
            })),
          }))
        );
      });
  }, [cloneId]);

  const filtered = allExercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  function openPlanDialog() {
    fetch("/api/plans").then(r => r.json()).then(setMyPlans);
    setPlanDialogOpen(true);
  }

  function pickPlan(planId: number) {
    fetch(`/api/plans/${planId}`).then(r => r.json()).then(plan => {
      if (!plan || plan.error) return;
      setName(plan.name);
      if (plan.description) setNotes(plan.description);
      // Use first session's exercises if available
      if (plan.sessions?.length > 0) {
        const firstSession = plan.sessions[0];
        setExerciseEntries(
          firstSession.exercises.map((ex: {
            exerciseId: number; name: string; category: string; muscleGroup: string | null;
            sets: Array<{ setNumber: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }>;
          }) => ({
            exercise: { id: ex.exerciseId, name: ex.name, category: ex.category, muscleGroup: ex.muscleGroup, isBuiltin: true },
            sets: ex.sets.map(s => ({
              tempId: ++tempIdCounter,
              setNumber: s.setNumber,
              reps: s.reps != null ? String(s.reps) : "",
              weightKg: s.weightKg != null ? String(s.weightKg) : "",
              durationSeconds: s.durationSeconds != null ? String(s.durationSeconds) : "",
            })),
          }))
        );
      }
      setPlanDialogOpen(false);
    });
  }

  async function createAndAdd() {
    if (!newExName.trim()) return;
    setCreateSaving(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newExName.trim(),
        category: newExCategory,
        muscleGroup: newExMuscleGroup || undefined,
      }),
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

  function addExercise(ex: Exercise) {
    setExerciseEntries((prev) => [
      ...prev,
      { exercise: ex, sets: [{ tempId: ++tempIdCounter, setNumber: 1, reps: "", weightKg: "", durationSeconds: "" }] },
    ]);
    setDialogOpen(false);
    setSearch("");
  }

  function addSet(exIdx: number) {
    setExerciseEntries((prev) =>
      prev.map((entry, i) =>
        i !== exIdx
          ? entry
          : {
              ...entry,
              sets: [
                ...entry.sets,
                { tempId: ++tempIdCounter, setNumber: entry.sets.length + 1, reps: "", weightKg: "", durationSeconds: "" },
              ],
            }
      )
    );
  }

  function updateSet(exIdx: number, setTempId: number, field: keyof SetEntry, value: string) {
    setExerciseEntries((prev) =>
      prev.map((entry, i) =>
        i !== exIdx
          ? entry
          : { ...entry, sets: entry.sets.map((s) => s.tempId === setTempId ? { ...s, [field]: value } : s) }
      )
    );
  }

  function removeSet(exIdx: number, setTempId: number) {
    setExerciseEntries((prev) =>
      prev.map((entry, i) =>
        i !== exIdx
          ? entry
          : { ...entry, sets: entry.sets.filter((s) => s.tempId !== setTempId).map((s, idx) => ({ ...s, setNumber: idx + 1 })) }
      )
    );
  }

  function removeExercise(exIdx: number) {
    setExerciseEntries((prev) => prev.filter((_, i) => i !== exIdx));
  }

  async function save() {
    if (!name.trim()) { setError(t("newWorkout.nameRequired")); return; }
    setError("");
    setSaving(true);
    try {
      const wRes = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date: new Date(date).toISOString(), notes: notes.trim() || undefined }),
      });
      if (!wRes.ok) throw new Error("Failed to create workout");
      const workout = await wRes.json();

      for (const entry of exerciseEntries) {
        for (const set of entry.sets) {
          if (!set.reps && !set.durationSeconds) continue;
          await fetch(`/api/workouts/${workout.id}/sets`, {
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
      router.push("/workouts");
    } catch {
      setError(t("newWorkout.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("newWorkout.title")}</Title>

      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "end" }}>
          <div>
            <Label required>{t("newWorkout.name")}</Label>
            <Input value={name} onInput={handleInput(setName)} placeholder={t("newWorkout.namePlaceholder")} style={{ width: "100%" }} />
          </div>
          <div>
            <Label required>{t("newWorkout.date")}</Label>
            <DatePicker
              value={date}
              onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setDate(e.target.value ?? date)}
            />
          </div>
          <div>
            <Label>{t("newWorkout.notes")}</Label>
            <Input value={notes} onInput={handleInput(setNotes)} placeholder={t("newWorkout.notesPlaceholder")} style={{ width: "100%" }} />
          </div>
        </div>
      </Card>

      {exerciseEntries.map((entry, exIdx) => (
        <Card
          key={entry.exercise.id + "-" + exIdx}
          header={
            <CardHeader
              titleText={entry.exercise.name}
              subtitleText={entry.exercise.muscleGroup ?? entry.exercise.category}
              action={<Button design="Negative" onClick={() => removeExercise(exIdx)}>{t("newWorkout.remove")}</Button>}
            />
          }
          style={{ marginBottom: "1rem" }}
        >
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "0.875rem" }}>
              <span>{t("newWorkout.set")}</span><span>{t("newWorkout.reps")}</span><span>{t("newWorkout.weight")}</span><span>{t("newWorkout.duration")}</span><span />
            </div>
            {entry.sets.map((set) => (
              <div key={set.tempId} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                <Text>{set.setNumber}</Text>
                <Input value={set.reps} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "reps", e.target.value ?? "")} placeholder="—" />
                <Input value={set.weightKg} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "weightKg", e.target.value ?? "")} placeholder="—" />
                <Input value={set.durationSeconds} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "durationSeconds", e.target.value ?? "")} placeholder="—" />
                <Button design="Transparent" onClick={() => removeSet(exIdx, set.tempId)}>✕</Button>
              </div>
            ))}
            <Button onClick={() => addSet(exIdx)} style={{ marginTop: "0.5rem" }}>{t("newWorkout.addSet")}</Button>
          </div>
        </Card>
      ))}

      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginTop: "1rem" }}>
        <FlexBox style={{ gap: "0.5rem" }}>
          <Button onClick={() => setDialogOpen(true)}>{t("newWorkout.addExercise")}</Button>
          <Button design="Default" onClick={openPlanDialog}>{t("newWorkout.fromPlan")}</Button>
        </FlexBox>
        <FlexBox style={{ gap: "0.5rem" }}>
          {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
          <Button design="Emphasized" onClick={save} disabled={saving}>
            {saving ? t("newWorkout.saving") : t("newWorkout.save")}
          </Button>
        </FlexBox>
      </FlexBox>

      <Dialog
        open={dialogOpen}
        headerText={creating ? t("newWorkout.newExercise") : t("newWorkout.addExerciseTitle")}
        onClose={() => { setDialogOpen(false); setCreating(false); setSearch(""); }}
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
              <Button design="Transparent" onClick={() => { setDialogOpen(false); setSearch(""); }}>{t("newWorkout.cancel")}</Button>
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
              value={search}
              onInput={handleInput(setSearch)}
              showClearIcon
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            {filtered.length > 0 ? (
              <List style={{ maxHeight: 320, overflowY: "auto" }}>
                {filtered.map((ex) => (
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
                <Button
                  design="Default"
                  onClick={() => { setNewExName(search); setCreating(true); }}
                >
                  {t("newWorkout.createExercise", { name: search || "new exercise" })}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={planDialogOpen}
        headerText={t("newWorkout.startFromPlan")}
        onClose={() => setPlanDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Transparent" onClick={() => setPlanDialogOpen(false)}>{t("newWorkout.cancel")}</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          {myPlans.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              {t("newWorkout.noPlans")}
            </Text>
          ) : (
            <List style={{ maxHeight: 360, overflowY: "auto" }}>
              {myPlans.map(p => (
                <ListItemStandard
                  key={p.id}
                  description={`${p.sessionCount} session${p.sessionCount !== 1 ? "s" : ""}`}
                  onClick={() => pickPlan(p.id)}
                >
                  {p.name}
                </ListItemStandard>
              ))}
            </List>
          )}
        </div>
      </Dialog>
    </div>
  );
}
