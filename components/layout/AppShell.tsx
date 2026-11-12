"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRole } from "@/components/layout/RoleContext";
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/physical-activity.js";
import "@ui5/webcomponents-icons/dist/bbyd-dashboard.js";
import "@ui5/webcomponents-icons/dist/bar-chart.js";
import "@ui5/webcomponents-icons/dist/log.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/manager.js";
import "@ui5/webcomponents-icons/dist/group.js";
import "@ui5/webcomponents-icons/dist/document-text.js";
import "@ui5/webcomponents-icons/dist/menu2.js";
import "@ui5/webcomponents-icons/dist/light-mode.js";
import "@ui5/webcomponents-icons/dist/dark-mode.js";
import "@ui5/webcomponents-icons/dist/text-align-left.js";
import "@ui5/webcomponents-icons/dist/text-align-right.js";
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";
import applyDirection from "@ui5/webcomponents-base/dist/locale/applyDirection.js";
import {
  Avatar,
  Button,
  ShellBar,
  ShellBarItem,
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

const MOBILE_BREAKPOINT = 768;

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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { role } = useRole();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => { setUnseenCount(0); }, [pathname]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  // Close nav on mobile when navigating
  useEffect(() => { if (isMobile) setNavOpen(false); }, [pathname, isMobile]);

  useEffect(() => {
    if (!menuOpen) return;
    let active = false;
    const t = setTimeout(() => { active = true; }, 0);
    function handleClick(e: MouseEvent) {
      if (!active) return;
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => { clearTimeout(t); document.removeEventListener("click", handleClick); };
  }, [menuOpen]);

  if (!mounted) return null;

  const navItems = allNavItems.filter(item => item.roles.includes(role));
  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  function handleProfileClick(e: CustomEvent) {
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setMenuOpen(o => !o);
  }

  function navigate(href: string) {
    router.push(href);
    if (isMobile) setNavOpen(false);
  }

  async function toggleTheme() {
    const next = isDark ? "sap_horizon" : "sap_horizon_dark";
    await setTheme(next);
    setIsDark(d => !d);
  }

  async function toggleDirection() {
    const next = isRTL ? "ltr" : "rtl";
    document.body.dir = next;
    await applyDirection();
    setIsRTL(r => !r);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <ShellBar
        primaryTitle="MakeUFit"
        onLogoClick={() => router.push("/dashboard")}
        style={{ flexShrink: 0 }}
        logo={
          <span style={{ display: "flex", alignItems: "center", color: "var(--sapContent_IconColor)" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              style={{ width: 28, height: 28, fill: "currentColor" }}
            >
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" transform="rotate(45 12 12)" />
            </svg>
          </span>
        }
        startButton={isMobile
          ? <Button design="Transparent" icon="menu2" onClick={() => setNavOpen(o => !o)} />
          : undefined
        }
        profile={
          <Avatar
            initials={userImage ? undefined : initials}
            colorScheme="Accent6"
            size="XS"
            accessibleName={userName ?? "User"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {userImage && <img src={userImage} alt={userName ?? "User"} />}
          </Avatar>
        }
        onProfileClick={handleProfileClick}
      >
        <ShellBarItem
          icon={isDark ? "light-mode" : "dark-mode"}
          text={isDark ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
        />
        <ShellBarItem
          icon={isRTL ? "text-align-left" : "text-align-right"}
          text={isRTL ? "Switch to LTR" : "Switch to RTL"}
          onClick={toggleDirection}
        />
      </ShellBar>

      {menuOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.top,
            right: menuPos.right,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            minWidth: 160,
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
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
        </div>,
        document.body
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Mobile overlay */}
        {isMobile && navOpen && (
          <div
            onClick={() => setNavOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
              zIndex: 100,
            }}
          />
        )}

        <div style={{
          width: 240,
          height: "100%",
          flexShrink: 0,
          // On mobile: slide in/out as a drawer
          ...(isMobile ? {
            position: "fixed",
            top: 0,
            left: navOpen ? 0 : -260,
            bottom: 0,
            zIndex: 101,
            transition: "left 0.2s ease",
          } : {}),
        }}>
          <SideNavigation
            style={{ width: 240, height: "100%" }}
            onSelectionChange={(e) => {
              const item = e.detail.item;
              const href = navItems.find((n) => n.text === item.text)?.href;
              if (href) navigate(href);
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
        </div>

        <main style={{
          flex: 1,
          overflow: "auto",
          padding: isMobile ? "1rem" : "1.5rem 2rem",
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
