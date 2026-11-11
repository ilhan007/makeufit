"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

type SetData = {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
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

function formatSet(set: SetData): string {
  const parts: string[] = [];
  if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weightKg) parts.push(`${set.weightKg} kg`);
  if (set.durationSeconds) parts.push(`${set.durationSeconds}s`);
  return parts.join(" · ") || "—";
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetch(`/api/plans/${params.id}`).then(r => r.json()).then(setPlan);
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setUserId(d.user.id); });
  }, [params.id]);

  async function enroll() {
    setEnrolling(true);
    await fetch("/api/my-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan!.id }),
    });
    setEnrolling(false);
    setEnrolled(true);
  }

  if (!plan) return <div style={{ padding: "2rem" }}>Loading...</div>;

  const isOwner = plan.authorId === userId;

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "0.5rem", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <Link href="/plans">
              <Button design="Transparent" icon="arrow-left" />
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
          {!isOwner && plan.isPublic && (
            <Button design="Emphasized" onClick={enroll} disabled={enrolling || enrolled}>
              {enrolled ? "Enrolled!" : enrolling ? "Enrolling..." : "Follow This Plan"}
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
                  />
                }
                style={{ marginBottom: "1rem" }}
              >
                <div style={{ padding: "0.75rem 1rem" }}>
                  {session.exercises.length === 0 ? (
                    <Text style={{ color: "var(--sapNeutralTextColor)" }}>No exercises in this session.</Text>
                  ) : (
                    session.exercises.map((ex, exIdx) => (
                      <div key={ex.exerciseId + "-" + exIdx} style={{ marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                          <Text style={{ fontWeight: 600 }}>{ex.name}</Text>
                          <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>
                            {ex.muscleGroup ? ex.muscleGroup.replace(/_/g, " ") : ex.category}
                          </Tag>
                        </div>
                        {ex.sets.length > 0 ? (
                          <div style={{ paddingLeft: "0.75rem" }}>
                            {ex.sets.map(set => (
                              <div key={set.setNumber} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                                <Text style={{ color: "var(--sapNeutralTextColor)", minWidth: "3rem", fontSize: "0.875rem" }}>
                                  Set {set.setNumber}
                                </Text>
                                <Text style={{ fontSize: "0.875rem" }}>{formatSet(set)}</Text>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text style={{ paddingLeft: "0.75rem", color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>
                            No target sets defined
                          </Text>
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
