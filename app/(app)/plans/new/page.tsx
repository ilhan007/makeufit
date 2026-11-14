"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import type { Ui5CustomEvent, InputDomRef } from "@ui5/webcomponents-react";
import {
  Button,
  Card,
  CheckBox,
  Dialog,
  Icon,
  Input,
  Label,
  List,
  ListItemStandard,
  Option,
  Select,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

type Exercise = { id: number; name: string; category: string; muscleGroup: string | null };
type SetEntry = { tempId: number; setNumber: number; reps: string; weightKg: string; durationSeconds: string };
type ExerciseEntry = { exercise: Exercise; sets: SetEntry[] };
type Session = { tempId: number; dayNumber: number; name: string; rounds: string; exercises: ExerciseEntry[] };

let tempIdCounter = 0;

const DAY_ACCENTS = [
  { bg: "var(--sapIndicationColor_5b, #e8f4ff)", accent: "var(--sapIndicationColor_5, #0070f2)" },
  { bg: "var(--sapIndicationColor_7b, #f5f0ff)", accent: "var(--sapIndicationColor_7, #6c32a9)" },
  { bg: "var(--sapIndicationColor_8b, #f5fce8)", accent: "var(--sapIndicationColor_8, #256f3a)" },
  { bg: "var(--sapIndicationColor_1b, #fef7e0)", accent: "var(--sapIndicationColor_1, #e9730c)" },
  { bg: "var(--sapIndicationColor_6b, #fdf0f0)", accent: "var(--sapIndicationColor_6, #c0392b)" },
  { bg: "var(--sapIndicationColor_3b, #e8f8ff)", accent: "var(--sapIndicationColor_3, #0854a0)" },
];

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
    setSessions(prev => [...prev, { tempId: ++tempIdCounter, dayNumber: nextDay, name: t("plans.day", { number: nextDay }), rounds: "", exercises: [] }]);
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

  function updateRounds(sessionTempId: number, value: string) {
    setSessions(prev => prev.map(s =>
      s.tempId !== sessionTempId ? s : { ...s, rounds: value }
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
      if (!planRes.ok) throw new Error("Failed");
      const plan = await planRes.json();
      for (const session of sessions) {
        await fetch(`/api/plans/${plan.id}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayNumber: session.dayNumber,
            name: session.name,
            exercises: session.exercises.map(e => {
                const roundCount = session.rounds ? parseInt(session.rounds) : 0;
                const templateSet = e.sets[0];
                const setsToSave = roundCount > 1
                  ? Array.from({ length: roundCount }, (_, i) => ({ ...templateSet, setNumber: i + 1 }))
                  : e.sets;
                return {
                  exerciseId: e.exercise.id,
                  sets: setsToSave.filter(s => s.reps || s.durationSeconds).map(s => ({
                    setNumber: s.setNumber,
                    reps: s.reps ? parseInt(s.reps) : undefined,
                    weightKg: s.weightKg ? parseFloat(s.weightKg) : undefined,
                    durationSeconds: s.durationSeconds ? parseInt(s.durationSeconds) : undefined,
                  })),
                };
              }),
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
    <div style={{ maxWidth: 800, paddingBottom: "5rem" }}>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("plans.newPlan")}</Title>

      {/* Plan details card */}
      <Card style={{ marginBottom: "1.5rem", borderRadius: 12, overflow: "hidden" }}>
        {/* Colored header stripe */}
        <div style={{ background: "var(--sapIndicationColor_5b, #e8f4ff)", borderBottom: "1px solid var(--sapTileBorderColor)", padding: "0.85rem 1.25rem" }}>
          <Text style={{ fontWeight: 700, fontSize: "1rem", color: "var(--sapIndicationColor_5, #0070f2)" }}>
            {t("plans.planDetails")}
          </Text>
        </div>
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Name + Description side by side on wide screens */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <Label required style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>{t("newWorkout.name")}</Label>
              <Input value={name} onInput={handleInput(setName)} placeholder={t("plans.namePlaceholder")} style={{ width: "100%" }} />
            </div>
            <div>
              <Label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>{t("plans.description")}</Label>
              <Input value={description} onInput={handleInput(setDescription)} placeholder={t("plans.descriptionPlaceholder")} style={{ width: "100%" }} />
            </div>
          </div>
          {/* Duration + Public toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Label required style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t("plans.durationWeeks")}</Label>
              <Input value={weeksCount} onInput={handleInput(setWeeksCount)} type="Number" style={{ width: 80 }} />
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.5rem 1rem", borderRadius: 8,
              background: isPublic ? "var(--sapIndicationColor_8b, #f5fce8)" : "var(--sapTileBackground)",
              border: `1px solid ${isPublic ? "var(--sapPositiveColor, #256f3a)" : "var(--sapTileBorderColor)"}`,
              transition: "background 0.15s, border-color 0.15s",
              cursor: "pointer",
            }} onClick={() => setIsPublic(p => !p)}>
              <CheckBox checked={isPublic} onChange={(e) => setIsPublic(e.target.checked ?? false)} />
              <Label style={{ cursor: "pointer", color: isPublic ? "var(--sapPositiveColor, #256f3a)" : "var(--sapTextColor)", fontWeight: isPublic ? 600 : 400 }}>
                {t("plans.makePublic")}
              </Label>
              {isPublic && <Tag design="Set2" colorScheme="8" style={{ fontSize: "0.7rem" }}>{t("plans.public")}</Tag>}
            </div>
          </div>
        </div>
      </Card>

      {/* Day session cards */}
      {sessions.map((session, sessionIndex) => {
        const accent = DAY_ACCENTS[sessionIndex % DAY_ACCENTS.length];
        return (
          <Card key={session.tempId} style={{ marginBottom: "1rem", borderRadius: 12, overflow: "hidden" }}>
            {/* Colored day header */}
            <div style={{
              background: accent.bg,
              borderBottom: "1px solid var(--sapTileBorderColor)",
              padding: "0.75rem 1.25rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: accent.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.8rem", flexShrink: 0,
                }}>
                  {session.dayNumber}
                </div>
                <Input
                  value={session.name}
                  onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSessionName(session.tempId, e.target.value ?? "")}
                  style={{ minWidth: 160, background: "transparent" }}
                />
                {/* Rounds — belongs to the whole day session */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginLeft: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", whiteSpace: "nowrap" }}>Rounds:</span>
                  <Input
                    value={session.rounds}
                    onInput={(e: Ui5CustomEvent<InputDomRef>) => updateRounds(session.tempId, e.target.value ?? "")}
                    placeholder="—"
                    type="Number"
                    style={{ width: 60 }}
                  />
                </div>
              </div>
              <Button design="Transparent" onClick={() => removeSession(session.tempId)}>
                <Icon name="delete" style={{ color: "var(--sapNegativeTextColor)" }} />
              </Button>
            </div>

            <div style={{ padding: "1rem 1.25rem" }}>
              {session.rounds && parseInt(session.rounds) > 1 && (
                <div style={{ marginBottom: "0.75rem", padding: "0.4rem 0.75rem", borderRadius: 6, background: accent.bg, border: `1px solid ${accent.accent}55`, fontSize: "0.8rem", color: accent.accent, fontWeight: 600 }}>
                  Circuit · {session.rounds} rounds — each exercise below repeats × {session.rounds}
                </div>
              )}
              {/* Exercise blocks */}
              {session.exercises.map((entry, exIdx) => (
                <div key={entry.exercise.id + "-" + exIdx} style={{
                  marginBottom: "0.75rem", borderRadius: 8,
                  border: `1px solid ${accent.accent}33`,
                  background: accent.bg + "66",
                  overflow: "hidden",
                }}>
                  {/* Exercise header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    borderBottom: `1px solid ${accent.accent}22`,
                    background: accent.bg,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Text style={{ fontWeight: 700, fontSize: "0.9rem" }}>{entry.exercise.name}</Text>
                      <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.65rem" }}>
                        {entry.exercise.muscleGroup ? entry.exercise.muscleGroup.replace(/_/g, " ") : entry.exercise.category}
                      </Tag>
                    </div>
                    <Button design="Transparent" onClick={() => removeExercise(session.tempId, exIdx)} style={{ padding: "0 0.25rem" }}>
                      <Icon name="delete" style={{ fontSize: "0.875rem", color: "var(--sapNeutralTextColor)" }} />
                    </Button>
                  </div>

                  {/* Sets table */}
                  <div style={{ padding: "0.5rem 0.75rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 2rem", gap: "0.4rem", marginBottom: "0.35rem" }}>
                      {[t("workoutDetail.set"), t("workoutDetail.reps"), t("workoutDetail.weight"), t("workoutDetail.duration"), ""].map((h, i) => (
                        <span key={i} style={{ fontSize: "0.7rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>{h}</span>
                      ))}
                    </div>
                    {entry.sets.map(set => (
                      <div key={set.tempId} style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 2rem", gap: "0.4rem", marginBottom: "0.3rem", alignItems: "center" }}>
                        <Text style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", textAlign: "center" }}>{set.setNumber}</Text>
                        <Input value={set.reps} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "reps", e.target.value ?? "")} placeholder="—" />
                        <Input value={set.weightKg} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "weightKg", e.target.value ?? "")} placeholder="—" />
                        <Input value={set.durationSeconds} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.tempId, exIdx, set.tempId, "durationSeconds", e.target.value ?? "")} placeholder="—" />
                        <button onClick={() => removeSet(session.tempId, exIdx, set.tempId)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--sapNeutralTextColor)", fontSize: "0.9rem", padding: 0 }}>✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSet(session.tempId, exIdx)}
                      style={{
                        marginTop: "0.25rem", border: `1px dashed ${accent.accent}`, borderRadius: 6,
                        background: "none", cursor: "pointer", padding: "0.25rem 0.75rem",
                        fontSize: "0.8rem", color: accent.accent, fontFamily: "inherit",
                      }}
                    >
                      + {t("newWorkout.addSet")}
                    </button>
                  </div>
                </div>
              ))}

              {/* Add exercise button */}
              <button
                onClick={() => openExercisePicker(session.tempId)}
                style={{
                  width: "100%", padding: "0.6rem", borderRadius: 8,
                  border: `2px dashed ${accent.accent}55`,
                  background: "none", cursor: "pointer",
                  color: accent.accent, fontFamily: "inherit",
                  fontSize: "0.875rem", fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                }}
              >
                <Icon name="add" style={{ fontSize: "0.875rem", color: accent.accent }} />
                {t("newWorkout.addExercise")}
              </button>
            </div>
          </Card>
        );
      })}

      {/* Add Day button */}
      <button
        onClick={addSession}
        style={{
          width: "100%", padding: "0.85rem", borderRadius: 12, marginBottom: "1rem",
          border: "2px dashed var(--sapTileBorderColor)",
          background: "none", cursor: "pointer",
          color: "var(--sapNeutralTextColor)", fontFamily: "inherit",
          fontSize: "0.95rem", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        }}
      >
        <Icon name="add" style={{ fontSize: "1rem", color: "var(--sapNeutralTextColor)" }} />
        {t("plans.addDay")}
      </button>

      {/* Sticky bottom action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--sapPageBackground, #f5f5f5)",
        borderTop: "1px solid var(--sapTileBorderColor)",
        padding: "0.75rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem",
        zIndex: 100,
      }}>
        {error && <Text style={{ color: "var(--sapNegativeTextColor)", fontSize: "0.875rem" }}>{error}</Text>}
        <Button onClick={() => router.push("/plans")}>{t("common.cancel")}</Button>
        <Button design="Emphasized" onClick={save} disabled={saving}>
          {saving ? t("plans.saving") : t("plans.savePlan")}
        </Button>
      </div>

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
              <Label required style={{ display: "block", marginBottom: "0.35rem" }}>{t("newWorkout.name")}</Label>
              <Input value={newExName} onInput={(e: Ui5CustomEvent<InputDomRef>) => setNewExName(e.target.value ?? "")} style={{ width: "100%" }} placeholder="e.g. Bulgarian Split Squat" />
            </div>
            <div>
              <Label required style={{ display: "block", marginBottom: "0.35rem" }}>{t("newWorkout.category")}</Label>
              <Select style={{ width: "100%" }} onChange={(e) => setNewExCategory(e.detail.selectedOption.value as string)}>
                <Option value="strength" selected={newExCategory === "strength"}>{t("newWorkout.strength")}</Option>
                <Option value="cardio" selected={newExCategory === "cardio"}>{t("newWorkout.cardio")}</Option>
                <Option value="flexibility" selected={newExCategory === "flexibility"}>{t("newWorkout.flexibility")}</Option>
                <Option value="other" selected={newExCategory === "other"}>{t("newWorkout.other")}</Option>
              </Select>
            </div>
            <div>
              <Label style={{ display: "block", marginBottom: "0.35rem" }}>{t("newWorkout.muscleGroup")}</Label>
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
