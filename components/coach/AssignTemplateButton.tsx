"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, List, ListItemStandard, Text } from "@ui5/webcomponents-react";

type Template = {
  id: number;
  name: string;
  notes: string | null;
  exerciseCount: number;
};

export function AssignTemplateButton({ athleteId }: { athleteId: string; coachId: string }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) fetch("/api/templates").then(r => r.json()).then(setTemplates);
  }, [open]);

  async function assign(templateId: number) {
    setAssigning(templateId);
    await fetch(`/api/templates/${templateId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId }),
    });
    setAssigning(null);
    setSuccess("Workout assigned!");
    setTimeout(() => { setSuccess(""); setOpen(false); }, 1500);
  }

  return (
    <>
      <Button design="Emphasized" onClick={() => setOpen(true)}>Assign Workout</Button>
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
          {templates.length === 0 ? (
            <Text style={{ color: "var(--sapNeutralTextColor)" }}>
              No plans yet. Create one in the Plans section.
            </Text>
          ) : (
            <List>
              {templates.map(t => (
                <ListItemStandard
                  key={t.id}
                  description={`${t.exerciseCount} exercise${t.exerciseCount !== 1 ? "s" : ""}${t.notes ? ` · ${t.notes}` : ""}`}
                  additionalText={assigning === t.id ? "Assigning..." : ""}
                  onClick={() => assign(t.id)}
                >
                  {t.name}
                </ListItemStandard>
              ))}
            </List>
          )}
        </div>
      </Dialog>
    </>
  );
}
