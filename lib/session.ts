import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USERS, type User } from "./demo-data";
import { SESSION_COOKIE } from "./session-cookie";
import { loadAccount } from "./server/http";

export { SESSION_COOKIE } from "./session-cookie";

const LIVE = process.env.NEXT_PUBLIC_DATA_MODE === "api";

/**
 * Live mode: the cookie holds a signed token; the person is loaded from the database and checked on every request.
 * Demo mode: the cookie holds a demo person's id so the screens can be reviewed by role. Demo mode has no real data.
 */
export async function getSession(): Promise<User | null> {
  if (LIVE) {
    const a = await loadAccount();
    return a && !a.mustChangePassword ? a.user : null;
  }
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = USERS.find((u) => u.id === id);
  return user && !user.inactive ? user : null;
}

export async function requireUser(): Promise<User> {
  if (LIVE) {
    const a = await loadAccount();
    if (!a) redirect("/login?error=expired");
    if (a.mustChangePassword) redirect("/change-password");
    return a.user;
  }
  const user = await getSession();
  if (!user) redirect("/login?error=expired");
  return user;
}
