"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ShellBar,
  ShellBarItem,
  SideNavigation,
  SideNavigationItem,
} from "@ui5/webcomponents-react";
import type { ReactNode } from "react";

const navItems = [
  { text: "Dashboard", icon: "home", href: "/dashboard" },
  { text: "Workouts", icon: "physical-activity", href: "/workouts" },
  { text: "Exercises", icon: "workout-plan", href: "/exercises" },
  { text: "Metrics", icon: "bbyd-dashboard", href: "/metrics" },
  { text: "Progress", icon: "bar-chart", href: "/progress" },
];

export function AppShell({ children, userName }: { children: ReactNode; userName?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ShellBar
        primaryTitle="MakeuFit"
        secondaryTitle={userName ?? ""}
        onLogoClick={() => router.push("/dashboard")}
      >
        <ShellBarItem
          icon="log"
          text="Sign Out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        />
      </ShellBar>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <SideNavigation
          style={{ width: 220, height: "100%", borderRight: "1px solid var(--sapList_BorderColor)" }}
          onSelectionChange={(e) => {
            const href = e.detail.item.dataset.href;
            if (href) router.push(href);
          }}
        >
          {navItems.map((item) => (
            <SideNavigationItem
              key={item.href}
              text={item.text}
              icon={item.icon}
              selected={pathname.startsWith(item.href)}
              data-href={item.href}
            />
          ))}
        </SideNavigation>
        <main style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
