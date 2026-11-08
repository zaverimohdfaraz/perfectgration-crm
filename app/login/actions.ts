"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { USERS } from "@/lib/demo-data";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { homeFor } from "@/lib/nav";

const LIVE = process.env.NEXT_PUBLIC_DATA_MODE === "api";
const cookieOptions = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const emailParam = encodeURIComponent(email);
  if (LIVE) return liveSignIn(email, password, emailParam);

  // Demo mode: demo people only. Set DEMO_ACCESS_CODE to stop strangers opening a public preview.
  const user = USERS.find((u) => u.email.toLowerCase() === email);
  const code = process.env.DEMO_ACCESS_CODE;
  if (!user || (code && password !== code)) redirect(`/login?error=invalid&email=${emailParam}`);
  if (user.inactive) redirect(`/login?error=inactive&email=${emailParam}`);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, user.id, cookieOptions(60 * 60 * 8));
  redirect(homeFor(user));
}

async function liveSignIn(email: string, password: string, emailParam: string) {
  const { connectDb } = await import("@/lib/server/db");
  const { UserModel } = await import("@/lib/server/models");
  const { checkPassword, signSession, MAX_FAILED, LOCK_MINUTES, SESSION_HOURS } = await import("@/lib/server/auth");
  const { outUser } = await import("@/lib/server/data");

  await connectDb();
  type Stored = { _id: string; passwordHash: string; workTeam?: string; inactive?: boolean; failedLogins?: number; lockedUntil?: string; sessionVersion?: number; mustChangePassword?: boolean };
  const doc = (await UserModel.findOne({ email }).lean()) as (Stored & Record<string, unknown>) | null;

  // The same answer whether the email exists or not, so accounts cannot be discovered.
  if (!doc) {
    await checkPassword(password, "$2a$12$MMbNovc1O2B/WJ8bPN4x2OupaaecEDfGjOXalEtWTECaqQsHci7vW"); // same timing
    redirect(`/login?error=invalid&email=${emailParam}`);
  }
  if (doc.lockedUntil && Date.parse(doc.lockedUntil) > Date.now()) redirect(`/login?error=locked&email=${emailParam}`);

  const ok = await checkPassword(password, doc.passwordHash);
  if (!ok) {
    const failed = (doc.failedLogins ?? 0) + 1;
    const lock = failed >= MAX_FAILED;
    await UserModel.updateOne({ _id: doc._id }, { $set: { failedLogins: lock ? 0 : failed, ...(lock ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() } : {}) } });
    await logins((m) => m.recordFailed(doc._id));
    redirect(`/login?error=${lock ? "locked" : "invalid"}&email=${emailParam}`);
  }
  if (doc.inactive) redirect(`/login?error=inactive&email=${emailParam}`);

  await UserModel.updateOne({ _id: doc._id }, { $set: { failedLogins: 0, lastSeen: new Date().toISOString(), lastActiveAt: new Date().toISOString() }, $unset: { lockedUntil: 1 } });
  // Daily sign-in record for the administrator (who signed in, when, and on which device).
  const { deviceFrom } = await import("@/lib/logins");
  const device = deviceFrom((await headers()).get("user-agent"));
  await logins((m) => m.recordSignIn(doc._id, device));
  // A Sales member coming online gets their share of the waiting leads straight away. Never blocks signing in.
  if (doc.workTeam === "sales" && !doc.mustChangePassword) {
    try { const { runLeadSharing } = await import("@/lib/server/lead-share"); await runLeadSharing(true); } catch (e) { console.error("[lead-share]", e); }
  }
  const token = await signSession(doc._id, doc.sessionVersion ?? 1);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_HOURS * 3600));
  redirect(doc.mustChangePassword ? "/change-password" : homeFor(outUser(doc)));
}

/** Writes to the sign-in record never stop anyone signing in. */
async function logins(write: (m: typeof import("@/lib/server/logins")) => Promise<void>) {
  try { await write(await import("@/lib/server/logins")); } catch (e) { console.error("[logins]", e); }
}
