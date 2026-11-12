"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRole } from "@/components/layout/RoleContext";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { Button, Card, CardHeader, Label, Text, Title } from "@ui5/webcomponents-react";

type Role = "athlete" | "coach" | "both";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const userImage = session?.user?.image;
  const { role, setRole: setContextRole } = useRole();

  const [roleSaving, setRoleSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [bioLoaded, setBioLoaded] = useState(false);

  if (!bioLoaded) {
    setBioLoaded(true);
    fetch("/api/user/bio").then(r => r.json()).then(d => { if (d.bio != null) setBio(d.bio); });
  }

  const ROLES: { value: Role; label: string; description: string }[] = [
    { value: "athlete", label: t("profile.athlete"), description: t("profile.athleteDesc") },
    { value: "coach", label: t("profile.coach"), description: t("profile.coachDesc") },
    { value: "both", label: t("profile.both"), description: t("profile.bothDesc") },
  ];

  async function selectRole(newRole: Role) {
    if (newRole === role || roleSaving) return;
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

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>{t("profile.title")}</Title>

      <Card style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName ?? "User"} style={{ width: 56, height: 56, borderRadius: "50%" }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{userName}</div>
            <div style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{session?.user?.email}</div>
          </div>
        </div>
      </Card>

      <Card header={<CardHeader titleText={t("profile.profileType")} subtitleText={t("profile.profileTypeSubtitle")} />} style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem" }}>
          <Label style={{ display: "block", marginBottom: "0.75rem" }}>{t("profile.iAmA")}</Label>
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
              <Label style={{ display: "block", marginBottom: "0.5rem" }}>{t("profile.coachBio")}</Label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={500}
                placeholder={t("profile.bioPlaceholder")}
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.6rem 0.75rem", borderRadius: 6,
                  border: "1px solid var(--sapField_BorderColor)",
                  background: "var(--sapField_Background)",
                  color: "var(--sapField_TextColor)",
                  fontFamily: "inherit", fontSize: "0.875rem", resize: "vertical",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button onClick={saveBio} disabled={bioSaving}>
                  {bioSaving ? t("profile.saving") : t("profile.saveBio")}
                </Button>
                {bioSaved && <Text style={{ color: "var(--sapPositiveTextColor)", fontSize: "0.875rem" }}>{t("profile.saved")}</Text>}
                <Text style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--sapNeutralTextColor)" }}>{bio.length}/500</Text>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
