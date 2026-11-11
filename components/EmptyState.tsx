"use client";

import "@ui5/webcomponents-fiori/dist/illustrations/NoActivities.js";
import "@ui5/webcomponents-fiori/dist/illustrations/NoData.js";
import "@ui5/webcomponents-fiori/dist/illustrations/NoEntries.js";
import { IllustratedMessage } from "@ui5/webcomponents-react";

type Props = {
  name: string;
  titleText: string;
  subtitleText: string;
};

export function EmptyState({ name, titleText, subtitleText }: Props) {
  return (
    <IllustratedMessage
      name={name}
      titleText={titleText}
      subtitleText={subtitleText}
    />
  );
}
