import { api, bad, requireAdmin } from "@/lib/server/http";
import { readLogins } from "@/lib/server/logins";
import { MAX_DAYS, type LoginsResponse } from "@/lib/logins";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The daily sign-in record for a range of days. Administrator only. */
export const GET = api(async ({ req, user }) => {
  requireAdmin(user);
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) throw bad("Choose a valid date range.");
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 >= MAX_DAYS) throw bad(`Choose a range of at most ${MAX_DAYS} days.`);
  const res: LoginsResponse = { rows: await readLogins(from, to) };
  return res;
});
