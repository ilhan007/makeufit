"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRole } from "@/components/layout/RoleContext";
import { Button, Card, CardHeader, Label, Text, Title } from "@ui5/webcomponents-react";

type Role = "athlete" | "coach" | "both";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "athlete", label: "Athlete", description: "Track your own workouts & metrics" },
  { value: "coach", label: "Coach", description: "Manage athletes & assign workouts" },
  { value: "both", label: "Both", description: "Train yourself and coach others" },
];

export default function ProfilePage() {
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const userImage = session?.user?.image;
  const { role, setRole: setContextRole } = useRole();

  const [roleSaving, setRoleSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [bioLoaded, setBioLoaded] = useState(false);

  // Load bio once
  if (!bioLoaded) {
    setBioLoaded(true);
    fetch("/api/user/bio").then(r => r.json()).then(d => { if (d.bio != null) setBio(d.bio); });
  }

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
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Profile</Title>

      {/* Identity */}
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

      {/* Role */}
      <Card header={<CardHeader titleText="Profile Type" subtitleText="How do you use MakeUFit?" />} style={{ marginBottom: "1.5rem" }}>
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
                onChange={e => setBio(e.target.value)}
                maxLength={500}
                placeholder="Tell athletes about your coaching style and specialities..."
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
                <Button onClick={saveBio} disabled={bioSaving}>{bioSaving ? "Saving..." : "Save Bio"}</Button>
                {bioSaved && <Text style={{ color: "var(--sapPositiveTextColor)", fontSize: "0.875rem" }}>Saved!</Text>}
                <Text style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--sapNeutralTextColor)" }}>{bio.length}/500</Text>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
