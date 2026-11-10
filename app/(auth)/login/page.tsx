"use client";

import { signIn } from "next-auth/react";
import {
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Text,
} from "@ui5/webcomponents-react";

export default function LoginPage() {
  return (
    <FlexBox
      direction={FlexBoxDirection.Column}
      alignItems={FlexBoxAlignItems.Center}
      justifyContent={FlexBoxJustifyContent.Center}
      style={{ minHeight: "100vh", background: "var(--sapBackgroundColor)" }}
    >
      <Card
        header={<CardHeader titleText="MakeuFit" subtitleText="Your personal fitness tracker" />}
        style={{ width: 360, padding: "2rem" }}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
          <Text>Track your workouts, body metrics, and progress — all in one place.</Text>
          <Button
            design="Emphasized"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            style={{ width: "100%" }}
          >
            Sign in with Google
          </Button>
        </FlexBox>
      </Card>
    </FlexBox>
  );
}
