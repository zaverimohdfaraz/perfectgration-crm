import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/lib/store";
import { requireUser } from "@/lib/session";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <DemoProvider userId={user.id}>
      <AppShell signOutAction={signOut}>{children}</AppShell>
    </DemoProvider>
  );
}
