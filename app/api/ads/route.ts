import { api, bad, deny } from "@/lib/server/http";
import { adStatus, readAds, syncAds } from "@/lib/server/ads";
import type { AdsResponse } from "@/lib/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STALE_MS = 26 * 3_600_000;

/**
 * Ad results for a date range (Social Media page). Leaders and the Social Media team only.
 * If a platform is connected but has not been synced in the last day, it is synced first,
 * so the numbers stay fresh even without the daily scheduled job.
 */
export const GET = api(async ({ req, user }) => {
  if (user.role === "consultant" && user.workTeam !== "social") throw deny("Ad results are for the Social Media team and leaders.");
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) throw bad("Choose a valid date range.");
  let status = await adStatus();
  if (status.some((s) => s.configured && (!s.lastSyncAt || Date.now() - Date.parse(s.lastSyncAt) > STALE_MS))) {
    await syncAds(30);
    status = await adStatus();
  }
  const configured = status.some((s) => s.configured);
  const res: AdsResponse = { status, rows: configured ? await readAds(from, to) : [] };
  return res;
});
