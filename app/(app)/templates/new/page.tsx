"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Ui5CustomEvent, InputDomRef } from "@ui5/webcomponents-react";
import {
  Button,
  Card,
  CardHeader,
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

type Exercise = {
  id: number;
  name: string;
  category: string;
  muscleGroup: string | null;
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

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exercises").then(r => r.json()).then(setAllExercises);
  }, []);

  const filtered = allExercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
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
    setExerciseEntries(prev => [
      ...prev,
      { exercise: ex, sets: [{ tempId: ++tempIdCounter, setNumber: 1, reps: "", weightKg: "", durationSeconds: "" }] },
    ]);
    setDialogOpen(false);
    setSearch("");
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
          ...entry,
          sets: entry.sets.map(s => s.tempId === setTempId ? { ...s, [field]: value } : s),
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

  async function save() {
    if (!name.trim()) { setError("Template name is required."); return; }
    if (exerciseEntries.length === 0) { setError("Add at least one exercise."); return; }
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        notes: notes.trim() || undefined,
        exercises: exerciseEntries.map(entry => ({
          exerciseId: entry.exercise.id,
          sets: entry.sets
            .filter(s => s.reps || s.durationSeconds)
            .map(s => ({
              setNumber: s.setNumber,
              reps: s.reps ? parseInt(s.reps) : undefined,
              weightKg: s.weightKg ? parseFloat(s.weightKg) : undefined,
              durationSeconds: s.durationSeconds ? parseInt(s.durationSeconds) : undefined,
            })),
        })),
      };
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/templates");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>New Plan</Title>

      <Card header={<CardHeader titleText="Plan Details" />} style={{ marginBottom: "1rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", padding: "1rem" }}>
          <div>
            <Label required>Name</Label>
            <Input value={name} onInput={handleInput(setName)} placeholder="e.g. Push Day A" style={{ width: "100%" }} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onInput={handleInput(setNotes)} placeholder="Optional notes for the athlete" style={{ width: "100%" }} />
          </div>
        </FlexBox>
      </Card>

      {exerciseEntries.map((entry, exIdx) => (
        <Card
          key={entry.exercise.id + "-" + exIdx}
          header={
            <CardHeader
              titleText={entry.exercise.name}
              subtitleText={entry.exercise.muscleGroup ?? entry.exercise.category}
              action={<Button design="Negative" onClick={() => removeExercise(exIdx)}>Remove</Button>}
            />
          }
          style={{ marginBottom: "1rem" }}
        >
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "0.875rem" }}>
              <span>Set</span><span>Reps</span><span>Weight (kg)</span><span>Duration (s)</span><span />
            </div>
            {entry.sets.map(set => (
              <div key={set.tempId} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr 2rem", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                <Text>{set.setNumber}</Text>
                <Input value={set.reps} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "reps", e.target.value ?? "")} placeholder="—" />
                <Input value={set.weightKg} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "weightKg", e.target.value ?? "")} placeholder="—" />
                <Input value={set.durationSeconds} onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(exIdx, set.tempId, "durationSeconds", e.target.value ?? "")} placeholder="—" />
                <Button design="Transparent" onClick={() => removeSet(exIdx, set.tempId)}>✕</Button>
              </div>
            ))}
            <Button onClick={() => addSet(exIdx)} style={{ marginTop: "0.5rem" }}>Add Set</Button>
          </div>
        </Card>
      ))}

      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginTop: "1rem" }}>
        <Button onClick={() => setDialogOpen(true)}>Add Exercise</Button>
        <FlexBox style={{ gap: "0.5rem" }}>
          {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
          <Button onClick={() => router.push("/templates")}>Cancel</Button>
          <Button design="Emphasized" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Plan"}
          </Button>
        </FlexBox>
      </FlexBox>

      <Dialog
        open={dialogOpen}
        headerText={creating ? "New Exercise" : "Add Exercise"}
        onClose={() => { setDialogOpen(false); setCreating(false); setSearch(""); }}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            {creating ? (
              <>
                <Button design="Transparent" onClick={() => setCreating(false)}>← Back</Button>
                <Button design="Emphasized" onClick={createAndAdd} disabled={createSaving || !newExName.trim()}>
                  {createSaving ? "Saving..." : "Save & Add"}
                </Button>
              </>
            ) : (
              <Button design="Transparent" onClick={() => { setDialogOpen(false); setSearch(""); }}>Cancel</Button>
            )}
          </div>
        }
      >
        {creating ? (
          <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <Label required>Name</Label>
              <Input value={newExName} onInput={(e: Ui5CustomEvent<InputDomRef>) => setNewExName(e.target.value ?? "")} style={{ width: "100%" }} placeholder="e.g. Bulgarian Split Squat" />
            </div>
            <div>
              <Label required>Category</Label>
              <Select style={{ width: "100%" }} onChange={(e) => setNewExCategory(e.detail.selectedOption.value as string)}>
                <Option value="strength" selected={newExCategory === "strength"}>Strength</Option>
                <Option value="cardio" selected={newExCategory === "cardio"}>Cardio</Option>
                <Option value="flexibility" selected={newExCategory === "flexibility"}>Flexibility</Option>
                <Option value="other" selected={newExCategory === "other"}>Other</Option>
              </Select>
            </div>
            <div>
              <Label>Muscle Group</Label>
              <Select style={{ width: "100%" }} onChange={(e) => setNewExMuscleGroup(e.detail.selectedOption.value as string)}>
                <Option value="" selected={!newExMuscleGroup}>— None —</Option>
                <Option value="chest">Chest</Option>
                <Option value="back">Back</Option>
                <Option value="legs">Legs</Option>
                <Option value="shoulders">Shoulders</Option>
                <Option value="arms">Arms</Option>
                <Option value="core">Core</Option>
                <Option value="full_body">Full Body</Option>
              </Select>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0.75rem 1rem 0" }}>
            <Input
              placeholder="Search exercises..."
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
                    onClick={() => addExercise(ex)}
                  >
                    {ex.name}
                  </ListItemStandard>
                ))}
              </List>
            ) : (
              <div style={{ padding: "0.5rem 0 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Text style={{ color: "var(--sapNeutralTextColor)" }}>No exercises found.</Text>
                <Button
                  design="Default"
                  onClick={() => { setNewExName(search); setCreating(true); }}
                >
                  + Create &ldquo;{search || "new exercise"}&rdquo;
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
