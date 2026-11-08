import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/lib/store";
import { requireUser } from "@/lib/session";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Live mode: load this person's data from the database, already filtered by what they are allowed to see.
  const initial = process.env.NEXT_PUBLIC_DATA_MODE === "api" ? await (await import("@/lib/server/data")).loadBootstrap(user) : undefined;
  return (
    <DemoProvider userId={user.id} initial={initial}>
      <AppShell signOutAction={signOut}>{children}</AppShell>
    </DemoProvider>
  );
}
