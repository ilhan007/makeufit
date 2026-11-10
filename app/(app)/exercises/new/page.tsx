"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef } from "@ui5/webcomponents-react";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  Option,
  Select,
  Text,
  Title,
} from "@ui5/webcomponents-react";

export default function NewExercisePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("strength");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  async function save() {
    if (!name.trim()) { setError("Name is required."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, muscleGroup: muscleGroup.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/exercises");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>New Custom Exercise</Title>
      <Card header={<CardHeader titleText="Exercise Details" />} style={{ maxWidth: 480 }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", padding: "1rem" }}>
          <div>
            <Label required>Name</Label>
            <Input value={name} onInput={handleInput(setName)} style={{ width: "100%" }} />
          </div>
          <div>
            <Label required>Category</Label>
            <Select onChange={(e) => setCategory(e.detail.selectedOption.value as string)}>
              <Option value="strength" selected>Strength</Option>
              <Option value="cardio">Cardio</Option>
              <Option value="flexibility">Flexibility</Option>
              <Option value="other">Other</Option>
            </Select>
          </div>
          <div>
            <Label>Muscle Group</Label>
            <Input value={muscleGroup} onInput={handleInput(setMuscleGroup)} placeholder="e.g. chest, back, legs" style={{ width: "100%" }} />
          </div>
          <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem" }}>
            {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
            <Button onClick={() => router.push("/exercises")}>Cancel</Button>
            <Button design="Emphasized" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </FlexBox>
        </FlexBox>
      </Card>
    </div>
  );
}
