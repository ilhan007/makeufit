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
  FlexBox,
  FlexBoxJustifyContent,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

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

const initials = (name: string | null) =>
  name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

export default function AthletesPage() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  useEffect(() => {
    fetch("/api/coach/athletes/pending").then(r => r.json()).then(d => setPending(Array.isArray(d) ? d : []));
    fetch("/api/coach/athletes").then(r => r.json()).then(d => setAthletes(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">{t("athletes.title")}</Title>
        <Link href="/plans">
          <Button design="Default">{t("athletes.managePlans")}</Button>
        </Link>
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

      <Card header={<CardHeader titleText={t("athletes.active")} subtitleText={t("athletes.activeCount_other", { count: athletes.length })} />}>
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
    </div>
  );
}
