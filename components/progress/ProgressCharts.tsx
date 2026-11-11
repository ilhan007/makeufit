"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardHeader,
  CheckBox,
  Dialog,
  FlexBox,
  FlexBoxDirection,
  Input,
  List,
  ListItemStandard,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef } from "@ui5/webcomponents-react";
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

type Props = {
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

export function ProgressCharts({ weightData, exerciseList, prData }: Props) {
  const [trackedIds, setTrackedIds] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Load persisted selection from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const ids: number[] = JSON.parse(saved);
        const valid = ids.filter(id => exerciseList.some(e => e.id === id));
        setTrackedIds(valid);
        if (valid.length > 0) setActiveId(valid[0]);
      }
    } catch {
      // ignore
    }
  }, [exerciseList]);

  function toggleExercise(id: number) {
    setTrackedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Keep activeId valid
      if (next.length > 0 && (activeId === null || !next.includes(activeId))) {
        setActiveId(next[0]);
      } else if (next.length === 0) {
        setActiveId(null);
      }
      return next;
    });
  }

  const filtered = exerciseList.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeData = activeId ? (prData[activeId] ?? []) : [];
  const activeColorIndex = trackedIds.indexOf(activeId ?? -1);
  const activeColor = CHIP_COLORS[activeColorIndex % CHIP_COLORS.length];

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Progress</Title>

      {/* Body weight chart */}
      <Card header={<CardHeader titleText="Body Weight Over Time" />} style={{ marginBottom: "2rem" }}>
        {weightData.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text>No weight data yet. Log your first body metric!</Text></div>
        ) : (
          <div style={{ padding: "1rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightData}>
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

      {/* Exercise progress chart */}
      <Card header={
        <CardHeader
          titleText="Exercise Progress (Max Weight)"
          action={
            <Button design="Default" onClick={() => setDialogOpen(true)}>
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
              {/* Toggle chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {trackedIds.map((id, idx) => {
                  const ex = exerciseList.find(e => e.id === id);
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

              {/* Chart for active exercise */}
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
        open={dialogOpen}
        headerText="Track Exercises"
        onClose={() => setDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Emphasized" onClick={() => setDialogOpen(false)}>Done</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          <Input
            placeholder="Search exercises..."
            value={search}
            onInput={(e: Ui5CustomEvent<InputDomRef>) => setSearch(e.target.value ?? "")}
            showClearIcon
            style={{ width: "100%", marginBottom: "0.75rem" }}
          />
          <List style={{ maxHeight: 380, overflowY: "auto" }}>
            {filtered.map(ex => (
              <ListItemStandard
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
              >
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
