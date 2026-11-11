"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Role = "athlete" | "coach" | "both";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue>({
  role: "athlete",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("athlete");

  useEffect(() => {
    fetch("/api/user/role")
      .then((r) => r.json())
      .then((d) => { if (d.role) setRole(d.role); })
      .catch(() => {});
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
