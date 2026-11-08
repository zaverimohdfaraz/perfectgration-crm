"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export async function signOut() {
  if (process.env.NEXT_PUBLIC_DATA_MODE === "api") {
    // Going offline: this person's untouched shared leads go to the Sales members still online.
    try {
      const { loadAccount } = await import("@/lib/server/http");
      const { runLeadSharing, setActive } = await import("@/lib/server/lead-share");
      const a = await loadAccount();
      if (a) {
        await setActive(a.user.id, false);
        try { const { recordSignOut } = await import("@/lib/server/logins"); await recordSignOut(a.user.id); } catch (e) { console.error("[logins]", e); }
        if (a.user.workTeam === "sales") await runLeadSharing(true);
      }
    } catch (e) {
      console.error("[sign-out]", e);
    }
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
