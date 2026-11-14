"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { EmptyState } from "@/components/EmptyState";
import { AcceptRequestButton } from "@/components/coach/AcceptRequestButton";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Dialog,
  FlexBox,
  FlexBoxJustifyContent,
  Input,
  Label,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import type { Ui5CustomEvent } from "@ui5/webcomponents-react";
import type { InputDomRef } from "@ui5/webcomponents-react";

type PendingRequest = {
  id: number;
  athleteName: string | null;
  athleteEmail: string;
  athleteImage: string | null;
  athleteId: string;
};

type Athlete = {
  relationshipId: number;
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  athleteImage: string | null;
  lastWorkout: { date: string; name: string } | null;
  totalWorkouts?: number;
};

type OfflineAthlete = {
  id: number;
  name: string;
  email: string | null;
  coachId: string;
  createdAt: number | null;
};

const initials = (name: string | null) =>
  name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

export default function AthletesPage() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [offlineAthletes, setOfflineAthletes] = useState<OfflineAthlete[]>([]);

  // Add athlete dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    fetch("/api/coach/athletes/pending").then(r => r.json()).then(d => setPending(Array.isArray(d) ? d : []));
    fetch("/api/coach/athletes").then(r => r.json()).then(d => setAthletes(Array.isArray(d) ? d : []));
    fetch("/api/offline-athletes").then(r => r.json()).then(d => setOfflineAthletes(Array.isArray(d) ? d : []));
  }, []);

  function handleInput(setter: (v: string) => void) {
    return (e: Ui5CustomEvent<InputDomRef>) => setter(e.target.value ?? "");
  }

  function openDialog() {
    setNewName("");
    setNewEmail("");
    setNameError("");
    setDialogOpen(true);
  }

  async function saveOfflineAthlete() {
    if (!newName.trim()) {
      setNameError(t("offlineAthletes.nameRequired"));
      return;
    }
    setNameError("");
    setSaving(true);
    try {
      const res = await fetch("/api/offline-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined }),
      });
      if (res.ok) {
        const newAthlete = await res.json();
        setOfflineAthletes(prev => [...prev, newAthlete]);
        setDialogOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">{t("athletes.title")}</Title>
        <FlexBox style={{ gap: "0.5rem" }}>
          <Button design="Emphasized" onClick={openDialog}>{t("offlineAthletes.addAthlete")}</Button>
          <Link href="/plans">
            <Button design="Default">{t("athletes.managePlans")}</Button>
          </Link>
        </FlexBox>
      </FlexBox>

      {pending.length > 0 && (
        <Card
          header={<CardHeader titleText={t("athletes.pending")} subtitleText={t("athletes.waiting_other", { count: pending.length })} />}
          style={{ marginBottom: "1.5rem" }}
        >
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {pending.map(r => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "0.75rem", marginBottom: "0.5rem",
                borderRadius: 8, background: "var(--sapHighlightColor, #e8f4ff)",
                border: "1px solid var(--sapSelectedColor, #0070f2)",
              }}>
                <Avatar initials={initials(r.athleteName)} colorScheme="Accent5" size="S">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.athleteImage && <img src={r.athleteImage} alt={r.athleteName ?? "Athlete"} />}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 600, display: "block" }}>{r.athleteName ?? r.athleteEmail}</Text>
                  <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{r.athleteEmail}</Text>
                </div>
                <AcceptRequestButton requestId={r.id} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        header={<CardHeader titleText={t("athletes.active")} subtitleText={t("athletes.activeCount_other", { count: athletes.length })} />}
        style={{ marginBottom: "1.5rem" }}
      >
        {athletes.length === 0 ? (
          <EmptyState name="NoEntries" titleText={t("athletes.noAthletes")} subtitleText={t("athletes.noAthletesSubtitle")} />
        ) : (
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {athletes.map(a => (
              <Link key={a.athleteId} href={`/athletes/${a.athleteId}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 8, cursor: "pointer",
                  background: "var(--sapTileBackground)",
                  border: "1px solid var(--sapTileBorderColor)",
                }}>
                  <Avatar initials={initials(a.athleteName)} colorScheme="Accent3" size="S">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.athleteImage && <img src={a.athleteImage} alt={a.athleteName ?? "Athlete"} />}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 600, display: "block" }}>{a.athleteName ?? a.athleteEmail}</Text>
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>
                      {a.lastWorkout ? t("athletes.lastWorkout", { date: new Date(a.lastWorkout.date).toLocaleDateString() }) : ""}
                    </Text>
                  </div>
                  <Tag design="Set2" colorScheme="8">{t("athletes.activeTag")}</Tag>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card header={<CardHeader titleText={t("offlineAthletes.title")} subtitleText={`${offlineAthletes.length}`} />}>
        {offlineAthletes.length === 0 ? (
          <EmptyState name="NoEntries" titleText={t("offlineAthletes.noOfflineAthletes")} subtitleText={t("offlineAthletes.noOfflineAthletesSubtitle")} />
        ) : (
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {offlineAthletes.map(a => (
              <Link key={a.id} href={`/athletes/offline/${a.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 8, cursor: "pointer",
                  background: "var(--sapTileBackground)",
                  border: "1px solid var(--sapTileBorderColor)",
                }}>
                  <Avatar initials={initials(a.name)} colorScheme="Accent6" size="S" />
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 600, display: "block" }}>{a.name}</Text>
                    {a.email && (
                      <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{a.email}</Text>
                    )}
                  </div>
                  <Tag design="Set1" colorScheme="6">{t("offlineAthletes.offlineTag")}</Tag>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        headerText={t("offlineAthletes.addAthlete")}
        onClose={() => setDialogOpen(false)}
        style={{ width: 440 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            <Button design="Transparent" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button design="Emphasized" onClick={saveOfflineAthlete} disabled={saving}>
              {saving ? t("offlineAthletes.saving") : t("offlineAthletes.save")}
            </Button>
          </div>
        }
      >
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <Label required>{t("offlineAthletes.name")}</Label>
            <Input
              value={newName}
              onInput={handleInput(setNewName)}
              placeholder={t("offlineAthletes.namePlaceholder")}
              style={{ width: "100%" }}
            />
            {nameError && <Text style={{ color: "var(--sapNegativeTextColor)", fontSize: "0.875rem" }}>{nameError}</Text>}
          </div>
          <div>
            <Label>{t("offlineAthletes.email")}</Label>
            <Input
              value={newEmail}
              onInput={handleInput(setNewEmail)}
              placeholder={t("offlineAthletes.emailPlaceholder")}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
