"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ui5/webcomponents-react";

type Props = {
  url: string;
  redirectTo?: string;
  label?: string;
};

export function DeleteButton({ url, redirectTo, label = "Delete" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(url, { method: "DELETE" });
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <Button design="Negative" disabled={loading} onClick={handleDelete}>
      {loading ? "..." : label}
    </Button>
  );
}
