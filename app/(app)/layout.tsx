import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { RoleProvider } from "@/components/layout/RoleContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <RoleProvider>
      <AppShell userName={session.user?.name} userImage={session.user?.image}>{children}</AppShell>
    </RoleProvider>
  );
}
