import { api, bad, deny } from "@/lib/server/http";
import { adStatus, readAds, syncAds } from "@/lib/server/ads";
import { syncSheetIfDue } from "@/lib/server/sheet-leads";
import type { AdsResponse } from "@/lib/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STALE_MS = 26 * 3_600_000;
/** After a failed sync, try again after this long (not on every page load). */
const RETRY_MS = 30 * 60_000;

/**
 * Ad results for a date range (Social Media page). Leaders and the Social Media team only.
 * If a platform is connected but has not been synced in the last day, it is synced first,
 * so the numbers stay fresh even without the daily scheduled job.
 */
export const GET = api(async ({ req, user }) => {
  if (user.role === "consultant" && user.workTeam !== "social") throw deny("Ad results are for the Social Media team and leaders.");
  // New leads from the spreadsheet (at most every 5 minutes) are added while the Social Media page is open.
  await syncSheetIfDue().catch(() => undefined);
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) throw bad("Choose a valid date range.");
  let status = await adStatus();
  const due = (s: (typeof status)[number]) => {
    if (!s.configured) return false;
    if (!s.lastSyncAt) return true;
    // A failed attempt does not count as a fresh sync: retry it after RETRY_MS.
    // A partial sync (one ad account failed) is retried on the same short timer.
    return Date.now() - Date.parse(s.lastSyncAt) > (s.ok === true && !s.partial ? STALE_MS : RETRY_MS);
  };
  if (status.some(due)) {
    await syncAds(30);
    status = await adStatus();
  }
  const configured = status.some((s) => s.configured);
  const res: AdsResponse = { status, rows: configured ? await readAds(from, to) : [] };
  return res;
});
