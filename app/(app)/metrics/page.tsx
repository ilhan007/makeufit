"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef, DatePickerDomRef } from "@ui5/webcomponents-react";
import type { DatePickerChangeEventDetail } from "@ui5/webcomponents/dist/DatePicker.js";
import {
  Button,
  Card,
  CardHeader,
  CheckBox,
  DatePicker,
  Dialog,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  List,
  ListItemStandard,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STORAGE_KEY = "progress_tracked_exercises";

type Metric = {
  id: number;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
};

type ProgressData = {
  weightData: Array<{ date: string; weight: number }>;
  exerciseList: Array<{ id: number; name: string }>;
  prData: Record<number, Array<{ date: string; maxWeight: number }>>;
};

const CHIP_COLORS = [
  "var(--sapChart_OrderedColor_2, #E8743B)",
  "var(--sapChart_OrderedColor_3, #19A979)",
  "var(--sapChart_OrderedColor_4, #ED4A7B)",
  "var(--sapChart_OrderedColor_5, #945ECF)",
  "var(--sapChart_OrderedColor_6, #13A4B4)",
  "var(--sapChart_OrderedColor_7, #525DF4)",
];

export default function MetricsPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [trackedIds, setTrackedIds] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [exSearch, setExSearch] = useState("");

  useEffect(() => {
    fetch("/api/metrics").then(r => r.json()).then(setMetrics);
    fetch("/api/progress").then(r => r.json()).then((data: ProgressData) => {
      setProgressData(data);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const ids: number[] = JSON.parse(saved);
          const valid = ids.filter(id => data.exerciseList.some(e => e.id === id));
          setTrackedIds(valid);
          if (valid.length > 0) setActiveId(valid[0]);
        }
      } catch { /* ignore */ }
    });
  }, []);

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const parsedDate = new Date(date);
      const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      const body: Record<string, unknown> = { date: isoDate };
      if (weightKg) body.weightKg = parseFloat(weightKg);
      if (bodyFatPct) body.bodyFatPct = parseFloat(bodyFatPct);
      if (waistCm) body.waistCm = parseFloat(waistCm);
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newMetric = await res.json();
      setMetrics(prev => [newMetric, ...prev]);
      setWeightKg(""); setBodyFatPct(""); setWaistCm("");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMetric(id: number) {
    await fetch(`/api/metrics/${id}`, { method: "DELETE" });
    setMetrics(prev => prev.filter(m => m.id !== id));
  }

  function toggleExercise(id: number) {
    setTrackedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (next.length > 0 && (activeId === null || !next.includes(activeId))) setActiveId(next[0]);
      else if (next.length === 0) setActiveId(null);
      return next;
    });
  }

  const filteredExercises = (progressData?.exerciseList ?? []).filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase())
  );
  const activeData = activeId ? (progressData?.prData[activeId] ?? []) : [];
  const activeColorIndex = trackedIds.indexOf(activeId ?? -1);
  const activeColor = CHIP_COLORS[activeColorIndex % CHIP_COLORS.length];

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("metrics.title")}</Title>

      <Card header={<CardHeader titleText={t("metrics.logEntry")} />} style={{ marginBottom: "1.5rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <div>
              <Label required>{t("metrics.date")}</Label>
              <DatePicker
                value={date}
                onChange={(e: Ui5CustomEvent<DatePickerDomRef, DatePickerChangeEventDetail>) => setDate(e.target.value ?? date)}
              />
            </div>
            <div><Label>{t("metrics.weight")}</Label><Input value={weightKg} onInput={handleInput(setWeightKg)} placeholder="e.g. 75.5" /></div>
            <div><Label>{t("metrics.bodyFat")}</Label><Input value={bodyFatPct} onInput={handleInput(setBodyFatPct)} placeholder="e.g. 18" /></div>
            <div><Label>{t("metrics.waist")}</Label><Input value={waistCm} onInput={handleInput(setWaistCm)} /></div>
          </div>
          <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem" }}>
            {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
            <Button design="Emphasized" onClick={save} disabled={saving}>{saving ? t("metrics.saving") : t("metrics.logEntryBtn")}</Button>
          </FlexBox>
        </FlexBox>
      </Card>

      <Card header={<CardHeader titleText={t("metrics.history")} />} style={{ marginBottom: "2rem" }}>
        <Table
          headerRow={
            <TableHeaderRow>
              <TableHeaderCell>{t("metrics.date")}</TableHeaderCell>
              <TableHeaderCell>{t("metrics.weightCol")}</TableHeaderCell>
              <TableHeaderCell>{t("metrics.bodyFatCol")}</TableHeaderCell>
              <TableHeaderCell>{t("metrics.waistCol")}</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableHeaderRow>
          }
        >
          {metrics.map(m => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
              <TableCell>{m.weightKg ? `${m.weightKg} ${t("metrics.weightUnit")}` : "—"}</TableCell>
              <TableCell>{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</TableCell>
              <TableCell>{m.waistCm ? `${m.waistCm} cm` : "—"}</TableCell>
              <TableCell>
                <Button design="Negative" onClick={() => deleteMetric(m.id)}>{t("metrics.delete")}</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      <Title level="H3" style={{ marginBottom: "1rem" }}>{t("metrics.progress")}</Title>

      <Card header={<CardHeader titleText={t("metrics.bodyWeightChart")} />} style={{ marginBottom: "1.5rem" }}>
        {!progressData || progressData.weightData.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text>{t("metrics.noWeightData")}</Text></div>
        ) : (
          <div style={{ padding: "1rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData.weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} ${t("metrics.weightUnit")}`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="var(--sapChart_OrderedColor_1, #5899DA)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card header={
        <CardHeader
          titleText={t("metrics.exerciseProgress")}
          action={
            <Button design="Default" onClick={() => setExDialogOpen(true)}>
              {trackedIds.length === 0 ? t("metrics.chooseExercises") : t("metrics.editExercises")}
            </Button>
          }
        />
      }>
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem" }}>
          {trackedIds.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("metrics.selectExercises")}</Text>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {trackedIds.map((id, idx) => {
                  const ex = progressData?.exerciseList.find(e => e.id === id);
                  if (!ex) return null;
                  const color = CHIP_COLORS[idx % CHIP_COLORS.length];
                  const isActive = id === activeId;
                  return (
                    <button key={id} onClick={() => setActiveId(id)} style={{
                      padding: "0.375rem 1rem", borderRadius: 999,
                      border: `2px solid ${color}`,
                      background: isActive ? color : "transparent",
                      color: isActive ? "#fff" : color,
                      fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                      transition: "background 0.15s, color 0.15s", fontFamily: "inherit",
                    }}>
                      {ex.name}
                    </button>
                  );
                })}
              </div>
              {activeData.length === 0 ? (
                <Text style={{ color: "var(--sapNeutralTextColor)" }}>{t("metrics.noExerciseData")}</Text>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v} ${t("metrics.weightUnit")}`, t("metrics.maxWeight")]} />
                    <Line type="monotone" dataKey="maxWeight" stroke={activeColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </FlexBox>
      </Card>

      <Dialog
        open={exDialogOpen}
        headerText={t("metrics.trackExercises")}
        onClose={() => setExDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Emphasized" onClick={() => setExDialogOpen(false)}>{t("metrics.done")}</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          <Input
            placeholder={t("metrics.searchExercises")}
            value={exSearch}
            onInput={(e: Ui5CustomEvent<InputDomRef>) => setExSearch(e.target.value ?? "")}
            showClearIcon
            style={{ width: "100%", marginBottom: "0.75rem" }}
          />
          <List style={{ maxHeight: 380, overflowY: "auto" }}>
            {filteredExercises.map(ex => (
              <ListItemStandard key={ex.id} onClick={() => toggleExercise(ex.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <CheckBox checked={trackedIds.includes(ex.id)} onChange={() => toggleExercise(ex.id)} />
                  <span>{ex.name}</span>
                </div>
              </ListItemStandard>
            ))}
          </List>
        </div>
      </Dialog>
    </div>
  );
}
