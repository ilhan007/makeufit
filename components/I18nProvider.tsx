"use client";

import "@/lib/i18n/config";
import { type ReactNode } from "react";

export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
