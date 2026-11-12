"use client";

import "@ui5/webcomponents-fiori/dist/illustrations/tnt/Avatar.js";
import { IllustratedMessage } from "@ui5/webcomponents-react";

export function WelcomeIllustration({
  titleText,
  subtitleText,
}: {
  titleText: string;
  subtitleText: string;
}) {
  return (
    <IllustratedMessage
      name="TntAvatar"
      design="Auto"
      titleText={titleText}
      subtitleText={subtitleText}
    />
  );
}
