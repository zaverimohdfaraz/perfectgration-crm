import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS, type User } from "./demo-data";

export const SESSION_COOKIE = "pg_session";

/**
 * PHASE 1 STUB. The session is a plain user id in a cookie so the UI can be
 * reviewed by role. Phase 2 replaces this with hashed passwords and a
 * server-side session store. Do not ship this file to production.
 */
export function getSession(): User | null {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = USERS.find((u) => u.id === id);
  return user && !user.inactive ? user : null;
}

export function requireUser(): User {
  const user = getSession();
  if (!user) redirect("/login?error=expired");
  return user;
}
