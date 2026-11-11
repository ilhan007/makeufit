"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FlexBox } from "@ui5/webcomponents-react";

export function AcceptRequestButton({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function respond(status: "accepted" | "declined") {
    setLoading(true);
    await fetch(`/api/coach/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <FlexBox style={{ gap: "0.5rem" }}>
      <Button design="Emphasized" disabled={loading} onClick={() => respond("accepted")}>Accept</Button>
      <Button design="Negative" disabled={loading} onClick={() => respond("declined")}>Decline</Button>
    </FlexBox>
  );
}
