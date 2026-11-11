"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, List, ListItemStandard, Text } from "@ui5/webcomponents-react";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  sessionCount: number;
};

export function AssignTemplateButton({ athleteId }: { athleteId: string; coachId: string }) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) fetch("/api/plans").then(r => r.json()).then(setPlans);
  }, [open]);

  async function assign(planId: number) {
    setAssigning(planId);
    await fetch(`/api/plans/${planId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId }),
    });
    setAssigning(null);
    setSuccess("Plan assigned!");
    setTimeout(() => { setSuccess(""); setOpen(false); }, 1500);
  }

  return (
    <>
      <Button design="Emphasized" onClick={() => setOpen(true)}>Assign Plan</Button>
      <Dialog
        open={open}
        headerText="Assign Plan"
        onClose={() => setOpen(false)}
        style={{ width: 440 }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem", width: "100%", boxSizing: "border-box" }}>
            {success && <Text style={{ color: "var(--sapPositiveTextColor)", alignSelf: "center", marginRight: "auto" }}>{success}</Text>}
            <Button design="Transparent" onClick={() => setOpen(false)}>Close</Button>
          </div>
        }
      >
        <div style={{ padding: "0.75rem 1rem 0" }}>
          {plans.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              No plans yet. Create one in the Plans section.
            </Text>
          ) : (
            <List>
              {plans.map(p => (
                <ListItemStandard
                  key={p.id}
                  description={`${p.sessionCount} session${p.sessionCount !== 1 ? "s" : ""} · ${p.weeksCount} week${p.weeksCount !== 1 ? "s" : ""}${p.description ? ` · ${p.description}` : ""}`}
                  additionalText={assigning === p.id ? "Assigning..." : ""}
                  onClick={() => assign(p.id)}
                >
                  {p.name}
                </ListItemStandard>
              ))}
            </List>
          )}
        </div>
      </Dialog>
    </>
  );
}
