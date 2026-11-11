"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ui5/webcomponents-react";

export function DeleteExerciseButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Button design="Negative" disabled={loading} onClick={handleDelete}>
      {loading ? "..." : "Remove"}
    </Button>
  );
}
