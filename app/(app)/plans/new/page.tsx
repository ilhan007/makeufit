"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import type { Ui5CustomEvent, InputDomRef } from "@ui5/webcomponents-react";
import {
  Button,
  Card,
  CardHeader,
  CheckBox,
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
  Text,
  Title,
} from "@ui5/webcomponents-react";

type Exercise = { id: number; name: string; category: string; muscleGroup: string | null };
type SetEntry = { tempId: number; setNumber: number; reps: string; weightKg: string; durationSeconds: string };
type ExerciseEntry = { exercise: Exercise; sets: SetEntry[] };
type Session = { tempId: number; dayNumber: number; name: string; exercises: ExerciseEntry[] };

let tempIdCounter = 0;

export default function NewPlanPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeksCount, setWeeksCount] = useState("4");
  const [isPublic, setIsPublic] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Exercise picker dialog state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSessionTempId, setPickerSessionTempId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExCategory, setNewExCategory] = useState("strength");
  const [newExMuscleGroup, setNewExMuscleGroup] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  useEffect(() => {
    fetch("/api/exercises").then(r => r.json()).then(setAllExercises);
  }, []);

  const filtered = allExercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  function addSession() {
    const nextDay = sessions.length > 0 ? Math.max(...sessions.map(s => s.dayNumber)) + 1 : 1;
    setSessions(prev => [...prev, { tempId: ++tempIdCounter, dayNumber: nextDay, name: t("plans.day", { number: nextDay }), exercises: [] }]);
  }

  function removeSession(tempId: number) {
    setSessions(prev => prev.filter(s => s.tempId !== tempId));
  }

  function updateSessionName(tempId: number, name: string) {
    setSessions(prev => prev.map(s => s.tempId === tempId ? { ...s, name } : s));
  }

  function openExercisePicker(sessionTempId: number) {
    setPickerSessionTempId(sessionTempId);
    setSearch("");
    setCreating(false);
    setPickerOpen(true);
  }

  function addExerciseToSession(ex: Exercise) {
    setSessions(prev => prev.map(s =>
      s.tempId !== pickerSessionTempId ? s : {
        ...s,
        exercises: [...s.exercises, { exercise: ex, sets: [{ tempId: ++tempIdCounter, setNumber: 1, reps: "", weightKg: "", durationSeconds: "" }] }],
      }
    ));
    setPickerOpen(false);
  }

  async function createAndAddExercise() {
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
      addExerciseToSession(ex);
      setCreating(false);
      setNewExName(""); setNewExCategory("strength"); setNewExMuscleGroup("");
    }
    setCreateSaving(false);
  }

  function removeExercise(sessionTempId: number, exIdx: number) {
    setSessions(prev => prev.map(s =>
      s.tempId !== sessionTempId ? s : { ...s, exercises: s.exercises.filter((_, i) => i !== exIdx) }
    ));
  }

  function addSet(sessionTempId: number, exIdx: number) {
    setSessions(prev => prev.map(s =>
      s.tempId !== sessionTempId ? s : {
        ...s,
        exercises: s.exercises.map((e, i) =>
          i !== exIdx ? e : { ...e, sets: [...e.sets, { tempId: ++tempIdCounter, setNumber: e.sets.length + 1, reps: "", weightKg: "", durationSeconds: "" }] }
        ),
      }
    ));
  }

  function updateSet(sessionTempId: number, exIdx: number, setTempId: number, field: keyof SetEntry, value: string) {
    setSessions(prev => prev.map(s =>
      s.tempId !== sessionTempId ? s : {
        ...s,
        exercises: s.exercises.map((e, i) =>
          i !== exIdx ? e : { ...e, sets: e.sets.map(set => set.tempId === setTempId ? { ...set, [field]: value } : set) }
        ),
      }
    ));
  }

  function removeSet(sessionTempId: number, exIdx: number, setTempId: number) {
    setSessions(prev => prev.map(s =>
      s.tempId !== sessionTempId ? s : {
        ...s,
        exercises: s.exercises.map((e, i) =>
          i !== exIdx ? e : { ...e, sets: e.sets.filter(set => set.tempId !== setTempId).map((set, idx) => ({ ...set, setNumber: idx + 1 })) }
        ),
      }
    ));
  }

  async function save() {
    if (!name.trim()) { setError(t("plans.nameRequired")); return; }
    if (sessions.length === 0) { setError(t("plans.sessionsRequired")); return; }
    setError("");
    setSaving(true);
    try {
      const planRes = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, weeksCount: parseInt(weeksCount) || 4, isPublic }),
      });
      if (!planRes.ok) throw new Error("Failed to create plan");
      const plan = await planRes.json();

      for (const session of sessions) {
        await fetch(`/api/plans/${plan.id}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayNumber: session.dayNumber,
            name: session.name,
            exercises: session.exercises.map(e => ({
              exerciseId: e.exercise.id,
              sets: e.sets.filter(s => s.reps || s.durationSeconds).map(s => ({
                setNumber: s.setNumber,
                reps: s.reps ? parseInt(s.reps) : undefined,
                weightKg: s.weightKg ? parseFloat(s.weightKg) : undefined,
                durationSeconds: s.durationSeconds ? parseInt(s.durationSeconds) : undefined,
              })),
            })),
          }),
        });
      }

      router.push("/plans");
    } catch {
      setError(t("newWorkout.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("plans.newPlan")}</Title>

      <Card header={<CardHeader titleText={t("plans.planDetails")} />} style={{ marginBottom: "1rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", padding: "1rem" }}>
          <div>
            <Label required>{t("newWorkout.name")}</Label>
            <Input value={name} onInput={handleInput(setName)} placeholder={t("plans.namePlaceholder")} style={{ width: "100%" }} />
          </div>
          <div>
            <Label>{t("plans.description")}</Label>
            <Input value={description} onInput={handleInput(setDescription)} placeholder={t("plans.descriptionPlaceholder")} style={{ width: "100%" }} />
          </div>
          <FlexBox style={{ gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <Label required>{t("plans.durationWeeks")}</Label>
              <Input value={weeksCount} onInput={handleInput(setWeeksCount)} type="Number" style={{ width: 100 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
              <CheckBox checked={isPublic} onChange={(e) => setIsPublic(e.target.checked ?? false)} />
              <Label>{t("plans.makePublic")}</Label>
            </div>
          </FlexBox>
        </FlexBox>
      </Card>

      {sessions.map((session) => (
        <Card
          key={session.tempId}
          header={
            <CardHeader
              titleText={t("plans.day", { number: session.dayNumber })}
              action={<Button design="Negative" onClick={() => removeSession(session.tempId)}>{t("common.delete")}</Button>}
            />
          }
          style={{ marginBottom: "1rem" }}
        >
          <div style={{ padding: "1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <Label>{t("plans.sessionName")}</Label>
              <Input
                value={session.name}
                onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSessionName(session.tempId, e.target.value ?? "")}
                style={{ width: "100%" }}
              />
            </div>

            {session.exercises.map((entry, exIdx) => (
              <div key={entry.exercise.id + "-" + exIdx} style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--sapTileBackground)", borderRadius: 8 }}>
                <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "0.5rem", alignItems: "center" }}>
                  <Text style={{ fontWeight: 600 }}>{entry.exercise.name}</Text>
                  <Button design="Transparent" onClick={() => removeExercise(session.tempId, exIdx)}>✕</Button>
                </FlexBox>
                <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "0.8rem" }}>
                  <span>{t("workoutDetail.set")}</span><span>{t("workoutDetail.reps")}</span><span>{t("workoutDetail.weight")}</span><span>{t("workoutDetail.duration")}</span><span />
                </div>
                {entry.sets.map(set => (
                  <div key={set.tempId} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.4rem", alignItems: "center" }}>
                    <Text>{set.setNumber}</Text>
                    <Input value={set.reps} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "reps", e.target.value ?? "")} placeholder="—" />
                    <Input value={set.weightKg} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "weightKg", e.target.value ?? "")} placeholder="—" />
                    <Input value={set.durationSeconds} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "durationSeconds", e.target.value ?? "")} placeholder="—" />
                    <Button design="Transparent" onClick={() => removeSet(session.tempId, exIdx, set.tempId)}>✕</Button>
                  </div>
                ))}
                <Button onClick={() => addSet(session.tempId, exIdx)} style={{ marginTop: "0.25rem" }}>{t("newWorkout.addSet")}</Button>
              </div>
            ))}

            <Button onClick={() => openExercisePicker(session.tempId)}>{t("newWorkout.addExercise")}</Button>
          </div>
        </Card>
      ))}

      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginTop: "1rem" }}>
        <Button onClick={addSession}>{t("plans.addDay")}</Button>
        <FlexBox style={{ gap: "0.5rem", alignItems: "center" }}>
          {error && <Text style={{ color: "var(--sapNegativeTextColor)" }}>{error}</Text>}
          <Button onClick={() => router.push("/plans")}>{t("common.cancel")}</Button>
          <Button design="Emphasized" onClick={save} disabled={saving}>{saving ? t("plans.saving") : t("plans.savePlan")}</Button>
        </FlexBox>
      </FlexBox>

      {/* Exercise picker dialog */}
      <Dialog
        open={pickerOpen}
        headerText={creating ? t("newWorkout.newExercise") : t("newWorkout.addExerciseTitle")}
        onClose={() => { setPickerOpen(false); setCreating(false); setSearch(""); }}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            {creating ? (
              <>
                <Button design="Transparent" onClick={() => setCreating(false)}>{t("newWorkout.back")}</Button>
                <Button design="Emphasized" onClick={createAndAddExercise} disabled={createSaving || !newExName.trim()}>
                  {createSaving ? t("newWorkout.saving") : t("newWorkout.saveAdd")}
                </Button>
              </>
            ) : (
              <Button design="Transparent" onClick={() => { setPickerOpen(false); setSearch(""); }}>{t("common.cancel")}</Button>
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
                {filtered.map(ex => (
                  <ListItemStandard
                    key={ex.id}
                    description={ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                    onClick={() => addExerciseToSession(ex)}
                  >
                    {ex.name}
                  </ListItemStandard>
                ))}
              </List>
            ) : (
              <div style={{ padding: "0.5rem 0 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("newWorkout.noExercisesFound")}</Text>
                <Button design="Default" onClick={() => { setNewExName(search); setCreating(true); }}>
                  {t("newWorkout.createExercise", { name: search || "new exercise" })}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
