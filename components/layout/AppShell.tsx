"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRole } from "@/components/layout/RoleContext";
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/physical-activity.js";
import "@ui5/webcomponents-icons/dist/activity-items.js";
import "@ui5/webcomponents-icons/dist/bbyd-dashboard.js";
import "@ui5/webcomponents-icons/dist/bar-chart.js";
import "@ui5/webcomponents-icons/dist/log.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/manager.js";
import "@ui5/webcomponents-icons/dist/group.js";
import "@ui5/webcomponents-icons/dist/document-text.js";
import {
  Avatar,
  Icon,
  ShellBar,
  SideNavigation,
  SideNavigationItem,
} from "@ui5/webcomponents-react";
import type { ReactNode } from "react";

const allNavItems = [
  { text: "Dashboard", icon: "home", href: "/dashboard", roles: ["athlete", "coach", "both"] },
  { text: "Workout History", icon: "physical-activity", href: "/workouts", roles: ["athlete", "coach", "both"] },
  { text: "Workout Plans", icon: "document-text", href: "/plans", roles: ["athlete", "coach", "both"] },
  { text: "Progress", icon: "bbyd-dashboard", href: "/metrics", roles: ["athlete", "coach", "both"] },
  { text: "My Coach", icon: "manager", href: "/coach", roles: ["athlete", "both"] },
  { text: "Athletes", icon: "group", href: "/athletes", roles: ["coach", "both"] },
];

export function AppShell({
  children,
  userName,
  userImage,
}: {
  children: ReactNode;
  userName?: string | null;
  userImage?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unseenCount, setUnseenCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { role } = useRole();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setUnseenCount(0); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!mounted) return null;

  const navItems = allNavItems.filter(item => item.roles.includes(role));
  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <ShellBar
        primaryTitle="MakeUFit"
        onLogoClick={() => router.push("/dashboard")}
        style={{ flexShrink: 0 }}
        logo={
          <Icon
            name="physical-activity"
            style={{ width: 32, height: 32, color: "#fff", cursor: "pointer" }}
            onClick={() => router.push("/dashboard")}
          />
        }
        profile={
          <div ref={menuRef} style={{ position: "relative" }}>
            <Avatar
              initials={userImage ? undefined : initials}
              colorScheme="Accent6"
              size="XS"
              accessibleName={userName ?? "User"}
              style={{ cursor: "pointer" }}
              onClick={() => setMenuOpen(o => !o)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {userImage && <img src={userImage} alt={userName ?? "User"} />}
            </Avatar>
            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                minWidth: 160, zIndex: 1000, overflow: "hidden",
              }}>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  style={menuItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Profile
                </button>
                <div style={{ height: 1, background: "#e2e8f0" }} />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  style={{ ...menuItemStyle, color: "#ef4444" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        }
      >
      </ShellBar>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <SideNavigation
          style={{ width: 240, height: "100%", flexShrink: 0 }}
          onSelectionChange={(e) => {
            const item = e.detail.item;
            const href = navItems.find((n) => n.text === item.text)?.href;
            if (href) router.push(href);
          }}
        >
          {navItems.map((item) => (
            <SideNavigationItem
              key={item.href}
              text={item.text}
              icon={item.icon}
              selected={pathname === item.href || pathname.startsWith(item.href + "/")}
              {...(item.href === "/coach" && unseenCount > 0 ? { counter: String(unseenCount) } : {})}
            />
          ))}
        </SideNavigation>

        <main style={{
          flex: 1,
          overflow: "auto",
          padding: "1.5rem 2rem",
          background: "var(--sapBackgroundColor)",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.75rem 1rem",
  background: "transparent", border: "none", textAlign: "left",
  fontSize: "0.9rem", cursor: "pointer", color: "#1e293b",
};
