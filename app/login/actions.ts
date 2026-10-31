"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS } from "@/lib/demo-data";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * PHASE 1 STUB. There are no real passwords yet. To stop strangers using a public preview,
 * set the environment variable DEMO_ACCESS_CODE: the password field must then match it.
 * Phase 2 replaces this with hashed passwords, rate limiting and a forced first-login change.
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = USERS.find((u) => u.email.toLowerCase() === email);
  const emailParam = encodeURIComponent(email);
  const code = process.env.DEMO_ACCESS_CODE;

  if (!user || (code && password !== code)) redirect(`/login?error=invalid&email=${emailParam}`);
  if (user.inactive) redirect(`/login?error=inactive&email=${emailParam}`);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/dashboard");
}
