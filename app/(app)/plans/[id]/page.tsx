"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Input,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef } from "@ui5/webcomponents-react";

type SetData = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  // editable overrides (string for input binding)
  editReps: string;
  editWeight: string;
  editDuration: string;
};

type ExerciseData = {
  exerciseId: number;
  name: string;
  category: string;
  muscleGroup: string | null;
  sets: SetData[];
};

type Session = {
  id: number;
  dayNumber: number;
  name: string;
  notes: string | null;
  exercises: ExerciseData[];
};

type Plan = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  isPublic: boolean;
  authorId: string;
  sessions: Session[];
};

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [using, setUsing] = useState(false);
  const [used, setUsed] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null); // sessionId being completed

  useEffect(() => {
    fetch(`/api/plans/${params.id}`)
      .then(r => r.json())
      .then((data: Omit<Plan, "sessions"> & { sessions: Array<Omit<Session, "exercises"> & { exercises: Array<Omit<ExerciseData, "sets"> & { sets: Array<Omit<SetData, "editReps" | "editWeight" | "editDuration">> }> }> }) => {
        const hydrated: Plan = {
          ...data,
          sessions: data.sessions.map(s => ({
            ...s,
            exercises: s.exercises.map(ex => ({
              ...ex,
              sets: ex.sets.map(set => ({
                ...set,
                editReps: set.reps != null ? String(set.reps) : "",
                editWeight: set.weightKg != null ? String(set.weightKg) : "",
                editDuration: set.durationSeconds != null ? String(set.durationSeconds) : "",
              })),
            })),
          })),
        };
        setPlan(hydrated);
      });
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
    fetch("/api/my-plans").then(r => r.json()).then((rows: Array<{ planId: number }>) => {
      const id = parseInt(String(params.id));
      setIsFollowing(Array.isArray(rows) && rows.some(r => r.planId === id));
    });
  }, [params.id]);

  function updateSet(sessionId: number, exerciseId: number, setNumber: number, field: "editReps" | "editWeight" | "editDuration", value: string) {
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id !== sessionId ? s : {
          ...s,
          exercises: s.exercises.map(ex => ex.exerciseId !== exerciseId ? ex : {
            ...ex,
            sets: ex.sets.map(set => set.setNumber !== setNumber ? set : { ...set, [field]: value }),
          }),
        }),
      };
    });
  }

  async function useThisPlan() {
    setUsing(true);
    await fetch("/api/my-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan!.id }),
    });
    setUsing(false);
    setUsed(true);
    setIsFollowing(true);
    setTimeout(() => router.push("/plans"), 800);
  }

  async function completeWorkout(session: Session) {
    setCompleting(session.id);
    try {
      const wRes = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: session.name,
          date: new Date().toISOString(),
          notes: `From plan: ${plan!.name}`,
        }),
      });
      if (!wRes.ok) throw new Error("Failed");
      const workout = await wRes.json();

      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          const reps = set.editReps ? parseInt(set.editReps) : undefined;
          const weightKg = set.editWeight ? parseFloat(set.editWeight) : undefined;
          const durationSeconds = set.editDuration ? parseInt(set.editDuration) : undefined;
          if (!reps && !durationSeconds) continue;
          await fetch(`/api/workouts/${workout.id}/sets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exerciseId: ex.exerciseId,
              setNumber: set.setNumber,
              reps,
              weightKg,
              durationSeconds,
            }),
          });
        }
      }
      router.push("/workouts");
    } catch {
      setCompleting(null);
    }
  }

  if (!plan) return <div style={{ padding: "2rem" }}>Loading...</div>;

  const isOwner = plan.authorId === userId;
  const isPublicNotOwner = !isOwner && plan.isPublic;

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "0.5rem", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <Link href="/plans">
              <Button design="Transparent" icon="nav-back" />
            </Link>
            <Title level="H2">{plan.name}</Title>
            {plan.isPublic && <Tag design="Set2" colorScheme="8">Public</Tag>}
          </div>
          <Text style={{ color: "var(--sapNeutralTextColor)", marginLeft: "3rem" }}>
            {plan.sessions.length} session{plan.sessions.length !== 1 ? "s" : ""} · {plan.weeksCount} week{plan.weeksCount !== 1 ? "s" : ""}
            {plan.description && ` · ${plan.description}`}
          </Text>
        </div>
        <FlexBox style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
          {isOwner && (
            <Link href={`/plans/${plan.id}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          {isPublicNotOwner && (
            <Button design={isFollowing ? "Default" : "Emphasized"} onClick={useThisPlan} disabled={using || used || isFollowing}>
              {isFollowing ? "Following" : used ? "Added to My Plans!" : using ? "Adding..." : "Use This Plan"}
            </Button>
          )}
        </FlexBox>
      </FlexBox>

      <div style={{ marginTop: "1.5rem" }}>
        {plan.sessions.length === 0 ? (
          <Card>
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--sapNeutralTextColor)" }}>
              No sessions yet.
              {isOwner && (
                <div style={{ marginTop: "1rem" }}>
                  <Link href={`/plans/${plan.id}/edit`}>
                    <Button design="Emphasized">Add Sessions</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        ) : (
          plan.sessions
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map(session => (
              <Card
                key={session.id}
                header={
                  <CardHeader
                    titleText={session.name}
                    subtitleText={`Day ${session.dayNumber}${session.notes ? ` · ${session.notes}` : ""}`}
                    action={
                      isOwner && (
                        <Button
                          design="Emphasized"
                          onClick={() => completeWorkout(session)}
                          disabled={completing === session.id}
                        >
                          {completing === session.id ? "Saving..." : "Complete Workout"}
                        </Button>
                      )
                    }
                  />
                }
                style={{ marginBottom: "1rem" }}
              >
                <div style={{ padding: "0.75rem 1rem" }}>
                  {session.exercises.length === 0 ? (
                    <Text style={{ color: "var(--sapNeutralTextColor)" }}>No exercises in this session.</Text>
                  ) : (
                    session.exercises.map((ex, exIdx) => (
                      <div key={ex.exerciseId + "-" + exIdx} style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <Text style={{ fontWeight: 600 }}>{ex.name}</Text>
                          <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>
                            {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                          </Tag>
                        </div>
                        {ex.sets.length > 0 && (
                          <div style={{ paddingLeft: "0.75rem" }}>
                            {/* Header */}
                            <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>Set</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>Reps</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>Weight (kg)</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--sapNeutralTextColor)", fontWeight: 600 }}>Duration (s)</span>
                            </div>
                            {ex.sets.map(set => (
                              <div key={set.setNumber} style={{ display: "grid", gridTemplateColumns: "3rem 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.35rem", alignItems: "center" }}>
                                <Text style={{ fontSize: "0.875rem", color: "var(--sapNeutralTextColor)" }}>{set.setNumber}</Text>
                                {isOwner ? (
                                  <>
                                    <Input
                                      value={set.editReps}
                                      placeholder={set.reps != null ? String(set.reps) : "—"}
                                      onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.id, ex.exerciseId, set.setNumber, "editReps", e.target.value ?? "")}
                                    />
                                    <Input
                                      value={set.editWeight}
                                      placeholder={set.weightKg != null ? String(set.weightKg) : "—"}
                                      onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.id, ex.exerciseId, set.setNumber, "editWeight", e.target.value ?? "")}
                                    />
                                    <Input
                                      value={set.editDuration}
                                      placeholder={set.durationSeconds != null ? String(set.durationSeconds) : "—"}
                                      onInput={(e: Ui5CustomEvent<InputDomRef>) => updateSet(session.id, ex.exerciseId, set.setNumber, "editDuration", e.target.value ?? "")}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Text style={{ fontSize: "0.875rem" }}>{set.reps ?? "—"}</Text>
                                    <Text style={{ fontSize: "0.875rem" }}>{set.weightKg != null ? `${set.weightKg} kg` : "—"}</Text>
                                    <Text style={{ fontSize: "0.875rem" }}>{set.durationSeconds != null ? `${set.durationSeconds}s` : "—"}</Text>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))
        )}
      </div>

      {isOwner && plan.sessions.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
          <Button design="Negative" onClick={async () => {
            if (!confirm("Delete this plan?")) return;
            await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
            router.push("/plans");
          }}>Delete Plan</Button>
        </div>
      )}
    </div>
  );
}
