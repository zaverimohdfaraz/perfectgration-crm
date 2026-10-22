"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS } from "@/lib/demo-data";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * PHASE 1 STUB: the password is not checked. Phase 2 verifies a hashed
 * password, applies login rate limiting, and forces a change on first login.
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = USERS.find((u) => u.email.toLowerCase() === email);
  const emailParam = encodeURIComponent(email);

  if (!user) redirect(`/login?error=invalid&email=${emailParam}`);
  if (user.inactive) redirect(`/login?error=inactive&email=${emailParam}`);

  cookies().set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/dashboard");
}
