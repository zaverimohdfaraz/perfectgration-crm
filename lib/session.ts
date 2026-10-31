import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS, type User } from "./demo-data";

export const SESSION_COOKIE = "pg_session";

/**
 * PHASE 1 STUB. The session is a plain user id in a cookie so the UI can be
 * reviewed by role. Phase 2 replaces this with hashed passwords and a
 * server-side session store. Do not ship this file to production.
 */
export async function getSession(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = USERS.find((u) => u.id === id);
  return user && !user.inactive ? user : null;
}

export async function requireUser(): Promise<User> {
  const user = await getSession();
  if (!user) redirect("/login?error=expired");
  return user;
}
