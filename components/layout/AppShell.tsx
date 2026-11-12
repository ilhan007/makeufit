"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRole } from "@/components/layout/RoleContext";
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/activity-2.js";
import "@ui5/webcomponents-icons/dist/bbyd-dashboard.js";
import "@ui5/webcomponents-icons/dist/bar-chart.js";
import "@ui5/webcomponents-icons/dist/log.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/manager.js";
import "@ui5/webcomponents-icons/dist/group.js";
import "@ui5/webcomponents-icons/dist/document-text.js";
import "@ui5/webcomponents-icons/dist/menu2.js";
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
  { text: "Workout History", icon: "activity-2", href: "/workouts", roles: ["athlete", "coach", "both"] },
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <ShellBar
        primaryTitle="MakeUFit"
        onLogoClick={() => router.push("/dashboard")}
        style={{ flexShrink: 0 }}
        logo={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="28" height="28" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard")}>
            <path fill="#ffffff" d="M8.715 4.006c.241-.03.5.01.647.238.336.523.641 1.041 1.08 1.491.653.67 1.582 1.284 2.809 1.284a.75.75 0 0 1 0 1.5c-1.915 0-3.26-1.04-4.07-1.94l-.362 1.668 1.944 2.032c.133.14.208.326.208.519v4.452a.75.75 0 0 1-1.5 0v-4.151L8.264 9.836 7.192 12.5a.75.75 0 0 1-.89.444l-3.747-1.01a.75.75 0 1 1 .39-1.448l3.103.836 1.227-3.045.576-2.653-2.331.291v1.863a.751.751 0 0 1-1.5 0V5.255a.75.75 0 0 1 .656-.744l4.04-.505ZM9.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
          </svg>
        }
        startButton={
          isMobile ? (
            <Icon
              name="menu2"
              style={{ width: 24, height: 24, color: "#fff", cursor: "pointer" }}
              onClick={() => setNavOpen(o => !o)}
            />
          ) : undefined
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
      />

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
