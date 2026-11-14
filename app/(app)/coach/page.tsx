"use client";

import { useState, useEffect, useRef } from "react";
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
  TextArea,
  Title,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/ai.js";

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

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GeneratedPlan = {
  name: string;
  description: string;
  weeksCount: number;
  isPublic: boolean;
  sessions: Array<{
    dayNumber: number;
    name: string;
    notes?: string;
    exercises: Array<{
      name: string;
      sets: Array<{
        setNumber: number;
        reps: number | null;
        weightKg: number | null;
        durationSeconds: number | null;
      }>;
    }>;
  }>;
};

const GOAL_OPTIONS = ["strength", "weightLoss", "endurance", "flexibility", "generalFitness"] as const;
const EXPERIENCE_OPTIONS = ["beginner", "intermediate", "advanced"] as const;

export default function CoachPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [relationships, setRelationships] = useState<CoachRelationship[]>([]);
  const [assigned, setAssigned] = useState<AssignedWorkout[]>([]);
  const [candidates, setCandidates] = useState<CoachCandidate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState("");

  // AI Coach state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTab, setAiTab] = useState<"chat" | "generate">("chat");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Generate Plan state
  const [goal, setGoal] = useState<typeof GOAL_OPTIONS[number]>("generalFitness");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [experience, setExperience] = useState<typeof EXPERIENCE_OPTIONS[number]>("beginner");
  const [planNotes, setPlanNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/coach/request").then(r => r.json()).then(setRelationships);
    fetch("/api/assigned").then(r => r.json()).then(setAssigned);
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

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

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatError("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setChatError(t("aiCoach.errorChat"));
    } finally {
      setChatLoading(false);
    }
  }

  async function generatePlan() {
    setGenerateError("");
    setGeneratedPlan(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-plan",
          goal,
          daysPerWeek,
          durationWeeks,
          experience,
          notes: planNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedPlan(data.plan);
    } catch {
      setGenerateError(t("aiCoach.errorGenerating"));
    } finally {
      setGenerating(false);
    }
  }

  async function savePlan() {
    if (!generatedPlan) return;
    setSaving(true);
    try {
      // 1. Create the plan shell
      const planRes = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedPlan.name,
          description: generatedPlan.description,
          weeksCount: generatedPlan.weeksCount,
          isPublic: false,
        }),
      });
      if (!planRes.ok) throw new Error("Failed to create plan");
      const plan = await planRes.json();

      // 2. For each session, first create/find exercises then add the session
      for (const session of generatedPlan.sessions) {
        type ApiSet = { setNumber: number; reps?: number; weightKg?: number; durationSeconds?: number };
        type ApiExercise = { exerciseId: number; sets: ApiSet[] };
        const exercisesWithIds: ApiExercise[] = [];

        for (const ex of session.exercises) {
          // Create exercise as a custom exercise for this user
          const exRes = await fetch("/api/exercises", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: ex.name, category: "strength" }),
          });
          if (!exRes.ok) throw new Error("Failed to create exercise");
          const exData = await exRes.json();
          exercisesWithIds.push({
            exerciseId: exData.id,
            sets: ex.sets.map(s => {
              const setEntry: { setNumber: number; reps?: number; weightKg?: number; durationSeconds?: number } = {
                setNumber: s.setNumber,
              };
              if (s.reps != null) setEntry.reps = s.reps;
              if (s.weightKg != null) setEntry.weightKg = s.weightKg;
              if (s.durationSeconds != null) setEntry.durationSeconds = s.durationSeconds;
              return setEntry;
            }),
          });
        }

        // Add session with exercises
        const sessionRes = await fetch(`/api/plans/${plan.id}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayNumber: session.dayNumber,
            name: session.name,
            notes: session.notes,
            exercises: exercisesWithIds,
          }),
        });
        if (!sessionRes.ok) throw new Error("Failed to create session");
      }

      // 3. Redirect to the new plan
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      console.error(err);
      setGenerateError(t("aiCoach.errorGenerating"));
    } finally {
      setSaving(false);
    }
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
          {/* AI Coach option at the top */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              marginBottom: "0.75rem",
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--sapButton_Emphasized_Background, #0070f2) 0%, #7c3aed 100%)",
              cursor: "pointer",
              border: "none",
            }}
            onClick={() => { setDialogOpen(false); setAiDialogOpen(true); }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { setDialogOpen(false); setAiDialogOpen(true); } }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", flexShrink: 0,
            }}>
              ✨
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{t("aiCoach.title")}</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", marginTop: "0.1rem" }}>{t("aiCoach.poweredBy")}</div>
            </div>
            <Tag design="Set2" colorScheme="5" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>AI</Tag>
          </div>

          {candidates.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              {t("coach.noCoaches")}
            </Text>
          ) : (
            <List style={{ maxHeight: 320, overflowY: "auto" }}>
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

      {/* AI Coach Dialog */}
      <Dialog
        open={aiDialogOpen}
        headerText={t("aiCoach.title")}
        onClose={() => { setAiDialogOpen(false); setGeneratedPlan(null); setGenerateError(""); setChatError(""); }}
        style={{ width: "min(640px, 95vw)" }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Transparent" onClick={() => { setAiDialogOpen(false); setGeneratedPlan(null); setGenerateError(""); setChatError(""); }}>
              {t("common.cancel")}
            </Button>
          </div>
        }
      >
        <div style={{ padding: "0 1rem", minHeight: 440 }}>
          {/* "Powered by Gemini" subtitle */}
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "1rem" }}>✨</span>
            <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.8rem" }}>{t("aiCoach.poweredBy")}</Text>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              onClick={() => setAiTab("chat")}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 20,
                border: "1px solid",
                borderColor: aiTab === "chat" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "var(--sapTileBorderColor)",
                background: aiTab === "chat" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "transparent",
                color: aiTab === "chat" ? "#fff" : "var(--sapTextColor)",
                cursor: "pointer",
                fontWeight: aiTab === "chat" ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              {t("aiCoach.chat")}
            </button>
            <button
              onClick={() => setAiTab("generate")}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 20,
                border: "1px solid",
                borderColor: aiTab === "generate" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "var(--sapTileBorderColor)",
                background: aiTab === "generate" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "transparent",
                color: aiTab === "generate" ? "#fff" : "var(--sapTextColor)",
                cursor: "pointer",
                fontWeight: aiTab === "generate" ? 600 : 400,
                fontSize: "0.875rem",
              }}
            >
              {t("aiCoach.generatePlan")}
            </button>
          </div>

          {/* CHAT TAB */}
          {aiTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: 380 }}>
              {/* Messages area */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "0.5rem",
                background: "var(--sapTileBackground)",
                borderRadius: 8,
                marginBottom: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}>
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--sapNeutralTextColor)", margin: "auto", padding: "2rem 0" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</div>
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>
                      {t("aiCoach.chatPlaceholder")}
                    </Text>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                      gap: "0.5rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: msg.role === "user" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "#7c3aed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", color: "#fff", fontWeight: 700,
                    }}>
                      {msg.role === "user" ? "U" : "AI"}
                    </div>
                    <div style={{
                      maxWidth: "80%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: msg.role === "user" ? "var(--sapButton_Emphasized_Background, #0070f2)" : "var(--sapBaseColor, #fff)",
                      color: msg.role === "user" ? "#fff" : "var(--sapTextColor)",
                      border: msg.role === "ai" ? "1px solid var(--sapTileBorderColor)" : "none",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "#7c3aed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", color: "#fff", fontWeight: 700, flexShrink: 0,
                    }}>AI</div>
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.8rem", fontStyle: "italic" }}>
                      {t("aiCoach.typingIndicator")}
                    </Text>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat error */}
              {chatError && (
                <Text style={{ color: "var(--sapNegativeTextColor)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                  {chatError}
                </Text>
              )}

              {/* Input area */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <TextArea
                  value={chatInput}
                  onInput={e => setChatInput((e.target as unknown as HTMLTextAreaElement).value)}
                  placeholder={t("aiCoach.chatPlaceholder")}
                  rows={2}
                  style={{ flex: 1, resize: "none" }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                />
                <Button
                  design="Emphasized"
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{ alignSelf: "flex-end" }}
                >
                  {t("aiCoach.send")}
                </Button>
              </div>
            </div>
          )}

          {/* GENERATE PLAN TAB */}
          {aiTab === "generate" && (
            <div style={{ overflowY: "auto", maxHeight: 400, paddingRight: "0.25rem" }}>
              {!generatedPlan ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Goal */}
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.875rem", color: "var(--sapTextColor)" }}>
                      {t("aiCoach.goal")}
                    </label>
                    <select
                      value={goal}
                      onChange={e => setGoal(e.target.value as typeof GOAL_OPTIONS[number])}
                      style={{
                        width: "100%", padding: "0.5rem 0.75rem", borderRadius: 6,
                        border: "1px solid var(--sapField_BorderColor, #89919a)",
                        background: "var(--sapField_Background, #fff)",
                        color: "var(--sapTextColor)", fontSize: "0.875rem",
                      }}
                    >
                      {GOAL_OPTIONS.map(g => (
                        <option key={g} value={g}>{t(`aiCoach.${g}`)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Days per week */}
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.875rem", color: "var(--sapTextColor)" }}>
                      {t("aiCoach.daysPerWeek")}: <strong>{daysPerWeek}</strong>
                    </label>
                    <input
                      type="range"
                      min={1} max={7} step={1}
                      value={daysPerWeek}
                      onChange={e => setDaysPerWeek(Number(e.target.value))}
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--sapNeutralTextColor)" }}>
                      <span>1</span><span>7</span>
                    </div>
                  </div>

                  {/* Duration weeks */}
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.875rem", color: "var(--sapTextColor)" }}>
                      {t("aiCoach.durationWeeks")}: <strong>{durationWeeks}</strong>
                    </label>
                    <input
                      type="range"
                      min={1} max={16} step={1}
                      value={durationWeeks}
                      onChange={e => setDurationWeeks(Number(e.target.value))}
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--sapNeutralTextColor)" }}>
                      <span>1</span><span>16</span>
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.875rem", color: "var(--sapTextColor)" }}>
                      {t("aiCoach.experience")}
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {EXPERIENCE_OPTIONS.map(exp => (
                        <button
                          key={exp}
                          onClick={() => setExperience(exp)}
                          style={{
                            flex: 1, padding: "0.5rem",
                            borderRadius: 6,
                            border: "1px solid",
                            borderColor: experience === exp ? "var(--sapButton_Emphasized_Background, #0070f2)" : "var(--sapTileBorderColor)",
                            background: experience === exp ? "var(--sapButton_Emphasized_Background, #0070f2)" : "transparent",
                            color: experience === exp ? "#fff" : "var(--sapTextColor)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: experience === exp ? 600 : 400,
                          }}
                        >
                          {t(`aiCoach.${exp}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem", fontSize: "0.875rem", color: "var(--sapTextColor)" }}>
                      {t("aiCoach.notes")}
                    </label>
                    <TextArea
                      value={planNotes}
                      onInput={e => setPlanNotes((e.target as unknown as HTMLTextAreaElement).value)}
                      placeholder={t("aiCoach.notesPlaceholder")}
                      rows={3}
                      style={{ width: "100%" }}
                    />
                  </div>

                  {generateError && (
                    <Text style={{ color: "var(--sapNegativeTextColor)", fontSize: "0.875rem" }}>
                      {generateError}
                    </Text>
                  )}

                  <Button
                    design="Emphasized"
                    onClick={generatePlan}
                    disabled={generating}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {generating ? t("aiCoach.generating") : t("aiCoach.generate")}
                  </Button>
                </div>
              ) : (
                /* Plan Preview */
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <Title level="H4">{t("aiCoach.planPreview")}</Title>
                    <Button design="Transparent" onClick={() => setGeneratedPlan(null)} style={{ fontSize: "0.8rem" }}>
                      ← {t("common.back")}
                    </Button>
                  </div>

                  <Card
                    header={
                      <CardHeader
                        titleText={generatedPlan.name}
                        subtitleText={generatedPlan.description}
                      />
                    }
                    style={{ marginBottom: "1rem" }}
                  >
                    <div style={{ padding: "0.5rem 1rem 1rem" }}>
                      <FlexBox style={{ gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <Tag design="Set2" colorScheme="6">{generatedPlan.weeksCount} weeks</Tag>
                        <Tag design="Set2" colorScheme="5">{generatedPlan.sessions.length} days/week</Tag>
                      </FlexBox>

                      {generatedPlan.sessions.map(session => (
                        <div
                          key={session.dayNumber}
                          style={{
                            marginBottom: "0.75rem",
                            padding: "0.75rem",
                            border: "1px solid var(--sapTileBorderColor)",
                            borderRadius: 8,
                            background: "var(--sapTileBackground)",
                          }}
                        >
                          <Text style={{ fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>
                            {t("aiCoach.day", { number: session.dayNumber })}: {session.name}
                          </Text>
                          {session.notes && (
                            <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.8rem", display: "block", marginBottom: "0.4rem", fontStyle: "italic" }}>
                              {session.notes}
                            </Text>
                          )}
                          <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.8rem" }}>
                            {session.exercises.map(e => e.name).join(" · ")}
                          </Text>
                          <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.75rem", display: "block", marginTop: "0.25rem" }}>
                            {t(`aiCoach.exercises_${session.exercises.length === 1 ? "one" : "other"}`, { count: session.exercises.length })}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {generateError && (
                    <Text style={{ color: "var(--sapNegativeTextColor)", fontSize: "0.875rem", marginBottom: "0.5rem", display: "block" }}>
                      {generateError}
                    </Text>
                  )}

                  <Button
                    design="Emphasized"
                    onClick={savePlan}
                    disabled={saving}
                  >
                    {saving ? t("aiCoach.saving") : t("aiCoach.savePlan")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
