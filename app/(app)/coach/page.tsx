"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Dialog,
  FlexBox,
  List,
  ListItemCustom,
  MessageStrip,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

type CoachRelationship = {
  id: number;
  status: "pending" | "accepted" | "declined";
  coachName: string | null;
  coachEmail: string;
  coachImage: string | null;
};

type AssignedWorkout = {
  id: number;
  assignedAt: number;
  seenAt: number | null;
  templateId: number;
  templateName: string;
  templateNotes: string | null;
};

type CoachCandidate = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  bio: string | null;
};

export default function CoachPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [relationships, setRelationships] = useState<CoachRelationship[]>([]);
  const [assigned, setAssigned] = useState<AssignedWorkout[]>([]);
  const [candidates, setCandidates] = useState<CoachCandidate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/coach/request").then(r => r.json()).then(setRelationships);
    fetch("/api/assigned").then(r => r.json()).then(setAssigned);
  }, []);

  function openDialog() {
    fetch("/api/coaches").then(r => r.json()).then(setCandidates);
    setDialogOpen(true);
  }

  async function requestCoach(coachId: string) {
    setError("");
    setRequesting(coachId);
    try {
      const res = await fetch("/api/coach/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setRelationships(prev => [...prev, data]);
      setDialogOpen(false);
    } finally {
      setRequesting(null);
    }
  }

  function startWorkout(assignedId: number, templateId: number) {
    fetch(`/api/assigned/${assignedId}/seen`, { method: "PATCH" });
    router.push(`/workouts/new?templateId=${templateId}&assignedId=${assignedId}`);
  }

  const accepted = relationships.find(r => r.status === "accepted");
  const pending = relationships.find(r => r.status === "pending");
  const unseenCount = assigned.filter(a => !a.seenAt).length;

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("coach.title")}</Title>

      {/* Coach status */}
      <Card header={<CardHeader titleText={t("coach.coachCard")} />} style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem 1.5rem" }}>
          {accepted ? (
            <FlexBox style={{ gap: "1rem", alignItems: "center" }}>
              <Avatar
                initials={accepted.coachName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                colorScheme="Accent6"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {accepted.coachImage && <img src={accepted.coachImage} alt={accepted.coachName ?? "Coach"} />}
              </Avatar>
              <div>
                <Text style={{ fontWeight: 600, display: "block" }}>{accepted.coachName ?? accepted.coachEmail}</Text>
                <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{accepted.coachEmail}</Text>
              </div>
              <Tag design="Set2" colorScheme="8">{t("coach.active")}</Tag>
            </FlexBox>
          ) : pending ? (
            <MessageStrip design="Information" hideCloseButton>
              {t("coach.pendingRequest", { name: pending.coachName ?? pending.coachEmail })}
            </MessageStrip>
          ) : (
            <div>
              <Text style={{ display: "block", marginBottom: "1rem", color: "var(--sapNeutralTextColor)" }}>
                {t("coach.noCoach")}
              </Text>
              <Button design="Emphasized" onClick={openDialog}>{t("coach.findCoach")}</Button>
              {error && <Text style={{ color: "var(--sapNegativeTextColor)", marginTop: "0.5rem", display: "block" }}>{error}</Text>}
            </div>
          )}
        </div>
      </Card>

      {/* Assigned workouts */}
      <Card header={
        <CardHeader
          titleText={t("coach.assignedWorkouts")}
          subtitleText={unseenCount > 0 ? t("coach.unseenCount_other", { count: unseenCount }) : undefined}
        />
      }>
        {assigned.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--sapNeutralTextColor)" }}>
            {t("coach.noAssigned")}
          </div>
        ) : (
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {assigned.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 8,
                background: !a.seenAt ? "var(--sapHighlightColor, #e8f4ff)" : "var(--sapTileBackground)",
                border: `1px solid ${!a.seenAt ? "var(--sapSelectedColor, #0070f2)" : "var(--sapTileBorderColor)"}`,
              }}>
                <div style={{ flex: 1 }}>
                  <FlexBox style={{ gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                    <Text style={{ fontWeight: 600 }}>{a.templateName}</Text>
                    {!a.seenAt && <Tag design="Set2" colorScheme="5">{t("coach.new")}</Tag>}
                  </FlexBox>
                  {a.templateNotes && (
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{a.templateNotes}</Text>
                  )}
                  <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.75rem", display: "block", marginTop: "0.25rem" }}>
                    {t("coach.assigned", { date: new Date(a.assignedAt * 1000).toLocaleDateString() })}
                  </Text>
                </div>
                <Button design="Emphasized" onClick={() => startWorkout(a.id, a.templateId)}>
                  {t("coach.startWorkout")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Coach picker dialog */}
      <Dialog
        open={dialogOpen}
        headerText={t("coach.findCoachTitle")}
        onClose={() => setDialogOpen(false)}
        style={{ width: 480 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Transparent" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          {candidates.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              {t("coach.noCoaches")}
            </Text>
          ) : (
            <List style={{ maxHeight: 360, overflowY: "auto" }}>
              {candidates.map(c => (
                <ListItemCustom
                  key={c.id}
                  style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
                  onClick={() => requestCoach(c.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                    <Avatar
                      initials={c.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                      colorScheme="Accent6"
                      size="S"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.image && <img src={c.image} alt={c.name ?? c.email} />}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--sapTextColor)" }}>{c.name ?? c.email}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>{c.email}</div>
                      {c.bio && <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)", marginTop: "0.2rem", fontStyle: "italic" }}>{c.bio}</div>}
                    </div>
                    {requesting === c.id && (
                      <Text style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>{t("coach.sending")}</Text>
                    )}
                  </div>
                </ListItemCustom>
              ))}
            </List>
          )}
        </div>
      </Dialog>
    </div>
  );
}
