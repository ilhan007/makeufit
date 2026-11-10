"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  List,
  ListItemStandard,
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
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA")); // yyyy-MM-dd
  const [notes, setNotes] = useState("");
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setAllExercises);
  }, []);

  const filtered = allExercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
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
    if (!name.trim()) { setError("Workout name is required."); return; }
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
      router.push(`/workouts/${workout.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>New Workout</Title>

      <Card header={<CardHeader titleText="Workout Details" />} style={{ marginBottom: "1rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", padding: "1rem" }}>
          <div>
            <Label required>Name</Label>
            <Input value={name} onInput={handleInput(setName)} placeholder="e.g. Push Day" style={{ width: "100%" }} />
          </div>
          <div>
            <Label required>Date</Label>
            <DatePicker
              value={date}
              onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setDate(e.target.value ?? date)}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onInput={handleInput(setNotes)} placeholder="Optional notes" style={{ width: "100%" }} />
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
            {entry.sets.map((set) => (
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
          <Button design="Emphasized" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Workout"}
          </Button>
        </FlexBox>
      </FlexBox>

      <Dialog
        open={dialogOpen}
        headerText="Add Exercise"
        onClose={() => setDialogOpen(false)}
        style={{ width: 480 }}
        footer={<Button onClick={() => setDialogOpen(false)}>Cancel</Button>}
      >
        <div style={{ padding: "1rem" }}>
          <Input
            placeholder="Search exercises..."
            value={search}
            onInput={handleInput(setSearch)}
            showClearIcon
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
          <List style={{ maxHeight: 360, overflowY: "auto" }}>
            {filtered.map((ex) => (
              <ListItemStandard
                key={ex.id}
                description={ex.muscleGroup ?? ex.category}
                onClick={() => addExercise(ex)}
              >
                {ex.name}
              </ListItemStandard>
            ))}
          </List>
        </div>
      </Dialog>
    </div>
  );
}
