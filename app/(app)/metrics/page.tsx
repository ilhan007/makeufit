"use client";

import { useState, useEffect } from "react";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef, DatePickerDomRef } from "@ui5/webcomponents-react";
import type { DatePickerChangeEventDetail } from "@ui5/webcomponents/dist/DatePicker.js";
import {
  Button,
  Card,
  CardHeader,
  DatePicker,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Text,
  Title,
} from "@ui5/webcomponents-react";

type Metric = {
  id: number;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armsCm: number | null;
  notes: string | null;
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [armsCm, setArmsCm] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/metrics").then((r) => r.json()).then(setMetrics);
  }, []);

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { date: new Date(date).toISOString() };
      if (weightKg) body.weightKg = parseFloat(weightKg);
      if (bodyFatPct) body.bodyFatPct = parseFloat(bodyFatPct);
      if (chestCm) body.chestCm = parseFloat(chestCm);
      if (waistCm) body.waistCm = parseFloat(waistCm);
      if (hipsCm) body.hipsCm = parseFloat(hipsCm);
      if (armsCm) body.armsCm = parseFloat(armsCm);
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newMetric = await res.json();
      setMetrics((prev) => [newMetric, ...prev]);
      setWeightKg(""); setBodyFatPct(""); setChestCm(""); setWaistCm(""); setHipsCm(""); setArmsCm(""); setNotes("");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMetric(id: number) {
    await fetch(`/api/metrics/${id}`, { method: "DELETE" });
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Body Metrics</Title>

      <Card header={<CardHeader titleText="Log Entry" />} style={{ marginBottom: "2rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <Label required>Date</Label>
              <DatePicker
                value={date}
                onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setDate(e.target.value ?? date)}
              />
            </div>
            <div><Label>Weight (kg)</Label><Input value={weightKg} onInput={handleInput(setWeightKg)} placeholder="e.g. 75.5" /></div>
            <div><Label>Body Fat %</Label><Input value={bodyFatPct} onInput={handleInput(setBodyFatPct)} placeholder="e.g. 18" /></div>
            <div><Label>Chest (cm)</Label><Input value={chestCm} onInput={handleInput(setChestCm)} /></div>
            <div><Label>Waist (cm)</Label><Input value={waistCm} onInput={handleInput(setWaistCm)} /></div>
            <div><Label>Hips (cm)</Label><Input value={hipsCm} onInput={handleInput(setHipsCm)} /></div>
            <div><Label>Arms (cm)</Label><Input value={armsCm} onInput={handleInput(setArmsCm)} /></div>
            <div><Label>Notes</Label><Input value={notes} onInput={handleInput(setNotes)} /></div>
          </div>
          <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem" }}>
            {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
            <Button design="Emphasized" onClick={save} disabled={saving}>{saving ? "Saving..." : "Log Entry"}</Button>
          </FlexBox>
        </FlexBox>
      </Card>

      <Card header={<CardHeader titleText="History" />}>
        <Table
          headerRow={
            <TableHeaderRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Weight</TableHeaderCell>
              <TableHeaderCell>Body Fat %</TableHeaderCell>
              <TableHeaderCell>Waist</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableHeaderRow>
          }
        >
          {metrics.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
              <TableCell>{m.weightKg ? `${m.weightKg} kg` : "—"}</TableCell>
              <TableCell>{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</TableCell>
              <TableCell>{m.waistCm ? `${m.waistCm} cm` : "—"}</TableCell>
              <TableCell>{m.notes ?? "—"}</TableCell>
              <TableCell>
                <Button design="Negative" onClick={() => deleteMetric(m.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </div>
  );
}
