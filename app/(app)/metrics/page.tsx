"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRole } from "@/components/layout/RoleContext";
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

type Role = "athlete" | "coach" | "both";

type ProgressData = {
  weightData: Array<{ date: string; weight: number }>;
  exerciseList: Array<{ id: number; name: string }>;
  prData: Record<number, Array<{ date: string; maxWeight: number }>>;
};

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "athlete", label: "Athlete", description: "Track your own workouts & metrics" },
  { value: "coach", label: "Coach", description: "Manage athletes & assign workouts" },
  { value: "both", label: "Both", description: "Train yourself and coach others" },
];

const CHIP_COLORS = [
  "var(--sapChart_OrderedColor_2, #E8743B)",
  "var(--sapChart_OrderedColor_3, #19A979)",
  "var(--sapChart_OrderedColor_4, #ED4A7B)",
  "var(--sapChart_OrderedColor_5, #945ECF)",
  "var(--sapChart_OrderedColor_6, #13A4B4)",
  "var(--sapChart_OrderedColor_7, #525DF4)",
];

export default function MetricsPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const { role, setRole: setContextRole } = useRole();

  // Metrics state
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Role state
  const [roleSaving, setRoleSaving] = useState(false);

  // Bio state
  const [bio, setBio] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  // Progress state
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [trackedIds, setTrackedIds] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [exSearch, setExSearch] = useState("");

  useEffect(() => {
    fetch("/api/metrics").then((r) => r.json()).then(setMetrics);
    fetch("/api/user/bio").then((r) => r.json()).then((d) => { if (d.bio != null) setBio(d.bio); });
    fetch("/api/progress").then((r) => r.json()).then((data: ProgressData) => {
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

  async function selectRole(newRole: Role) {
    if (newRole === role) return;
    setRoleSaving(true);
    await fetch("/api/user/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setContextRole(newRole);
    setRoleSaving(false);
  }

  async function saveBio() {
    setBioSaving(true);
    await fetch("/api/user/bio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });
    setBioSaving(false);
    setBioSaved(true);
    setTimeout(() => setBioSaved(false), 2000);
  }

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
      if (waistCm) body.waistCm = parseFloat(waistCm);

      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newMetric = await res.json();
      setMetrics((prev) => [newMetric, ...prev]);
      setWeightKg(""); setBodyFatPct(""); setWaistCm("");
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

  function toggleExercise(id: number) {
    setTrackedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (next.length > 0 && (activeId === null || !next.includes(activeId))) {
        setActiveId(next[0]);
      } else if (next.length === 0) {
        setActiveId(null);
      }
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
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Title level="H2">Profile</Title>
        {userName && <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "1rem" }}>{userName}</Text>}
      </div>

      {/* Profile Type */}
      <Card header={<CardHeader titleText="Profile Type" subtitleText="How do you use MakeUFit?" />} style={{ marginBottom: "2rem" }}>
        <div style={{ padding: "1rem" }}>
          <Label style={{ display: "block", marginBottom: "0.75rem" }}>I am a...</Label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {ROLES.map(({ value, label, description }) => {
              const isActive = role === value;
              return (
                <button
                  key={value}
                  onClick={() => selectRole(value)}
                  disabled={roleSaving}
                  style={{
                    padding: "0.75rem 1.25rem",
                    borderRadius: 10,
                    border: `2px solid ${isActive ? "var(--sapSelectedColor, #0070f2)" : "var(--sapTileBorderColor)"}`,
                    background: isActive ? "var(--sapSelectedColor, #0070f2)" : "var(--sapTileBackground)",
                    color: isActive ? "#fff" : "var(--sapTextColor)",
                    cursor: roleSaving ? "not-allowed" : "pointer",
                    textAlign: "left",
                    minWidth: 140,
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    fontFamily: "inherit",
                    opacity: roleSaving ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>{description}</div>
                </button>
              );
            })}
          </div>
          {(role === "coach" || role === "both") && (
            <div style={{ marginTop: "1.25rem" }}>
              <Label style={{ display: "block", marginBottom: "0.5rem" }}>Coach Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder="Tell athletes a bit about yourself, your coaching style, specialities..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.6rem 0.75rem",
                  borderRadius: 6,
                  border: "1px solid var(--sapField_BorderColor)",
                  background: "var(--sapField_Background)",
                  color: "var(--sapField_TextColor)",
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button onClick={saveBio} disabled={bioSaving}>{bioSaving ? "Saving..." : "Save Bio"}</Button>
                {bioSaved && <Text style={{ color: "var(--sapPositiveTextColor)", fontSize: "0.875rem" }}>Saved!</Text>}
                <Text style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--sapNeutralTextColor)" }}>{bio.length}/500</Text>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Personal Metrics */}
      <Title level="H3" style={{ marginBottom: "1rem" }}>Personal Metrics</Title>

      <Card header={<CardHeader titleText="Log Entry" />} style={{ marginBottom: "1.5rem" }}>
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
            <div><Label>Waist (cm)</Label><Input value={waistCm} onInput={handleInput(setWaistCm)} /></div>
          </div>
          <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem" }}>
            {error && <Text style={{ color: "var(--sapNegativeTextColor)", alignSelf: "center" }}>{error}</Text>}
            <Button design="Emphasized" onClick={save} disabled={saving}>{saving ? "Saving..." : "Log Entry"}</Button>
          </FlexBox>
        </FlexBox>
      </Card>

      <Card header={<CardHeader titleText="History" />} style={{ marginBottom: "2rem" }}>
        <Table
          headerRow={
            <TableHeaderRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Weight</TableHeaderCell>
              <TableHeaderCell>Body Fat %</TableHeaderCell>
              <TableHeaderCell>Waist</TableHeaderCell>
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
              <TableCell>
                <Button design="Negative" onClick={() => deleteMetric(m.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>

      {/* Progress */}
      <Title level="H3" style={{ marginBottom: "1rem" }}>Progress</Title>

      <Card header={<CardHeader titleText="Body Weight Over Time" />} style={{ marginBottom: "1.5rem" }}>
        {!progressData || progressData.weightData.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text>No weight data yet. Log your first body metric above!</Text></div>
        ) : (
          <div style={{ padding: "1rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData.weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} kg`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="var(--sapChart_OrderedColor_1, #5899DA)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card header={
        <CardHeader
          titleText="Exercise Progress (Max Weight)"
          action={
            <Button design="Default" onClick={() => setExDialogOpen(true)}>
              {trackedIds.length === 0 ? "Choose Exercises" : "Edit Exercises"}
            </Button>
          }
        />
      }>
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem" }}>
          {trackedIds.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              Select exercises to track their progress over time.
            </Text>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {trackedIds.map((id, idx) => {
                  const ex = progressData?.exerciseList.find(e => e.id === id);
                  if (!ex) return null;
                  const color = CHIP_COLORS[idx % CHIP_COLORS.length];
                  const isActive = id === activeId;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveId(id)}
                      style={{
                        padding: "0.375rem 1rem",
                        borderRadius: 999,
                        border: `2px solid ${color}`,
                        background: isActive ? color : "transparent",
                        color: isActive ? "#fff" : color,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                        fontFamily: "inherit",
                      }}
                    >
                      {ex.name}
                    </button>
                  );
                })}
              </div>
              {activeData.length === 0 ? (
                <Text style={{ color: "var(--sapNeutralTextColor)" }}>No data for this exercise yet.</Text>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v} kg`, "Max Weight"]} />
                    <Line type="monotone" dataKey="maxWeight" stroke={activeColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </FlexBox>
      </Card>

      {/* Exercise picker dialog */}
      <Dialog
        open={exDialogOpen}
        headerText="Track Exercises"
        onClose={() => setExDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Emphasized" onClick={() => setExDialogOpen(false)}>Done</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          <Input
            placeholder="Search exercises..."
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
