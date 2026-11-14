/**
 * Ad results from Meta Ads and Google Ads, shared by the screens and the server.
 * The server stores one row per platform, campaign and day (collection `adinsights`).
 */
import type { Range } from "./analytics";

export type AdPlatform = "meta" | "google";
export const PLATFORM_LABEL: Record<AdPlatform, string> = { meta: "Meta Ads (Facebook and Instagram)", google: "Google Ads" };

export type AdRow = {
  platform: AdPlatform;
  accountId: string;
  campaignId: string;
  campaignName: string;
  /** Day in the ad account's own time zone, YYYY-MM-DD. */
  date: string;
  spend: number;
  currency: string;
  impressions: number;
  clicks: number;
  /** Leads as counted by the ad platform (lead forms, conversions). */
  leads: number;
};

export type AdStatus = {
  platform: AdPlatform;
  /** True when the keys for this platform are present in the environment. */
  configured: boolean;
  lastSyncAt?: string;
  ok?: boolean;
  /** Some ad accounts synced and some did not; `error` says which ones. */
  partial?: boolean;
  error?: string;
};

export type AdsResponse = { status: AdStatus[]; rows: AdRow[]; demo?: boolean };

const TZ = 3 * 3_600_000;
/** Riyadh calendar day for a moment, YYYY-MM-DD. */
export const dayKey = (ms: number) => new Date(ms + TZ).toISOString().slice(0, 10);
/** First and last day (inclusive) of a range, as YYYY-MM-DD. */
export const rangeDays = (r: Range) => ({ from: dayKey(r.from), to: dayKey(r.to - 1) });

/** Leads in a Meta insights row. "lead" is Meta's total when present; otherwise lead-form and website leads are added up. */
const LEAD_TYPES = ["onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
export function metaLeads(actions: { action_type: string; value: string }[] | undefined): number {
  if (!actions?.length) return 0;
  const all = actions.find((a) => a.action_type === "lead");
  if (all) return Number(all.value) || 0;
  return actions.filter((a) => LEAD_TYPES.includes(a.action_type)).reduce((s, a) => s + (Number(a.value) || 0), 0);
}

export const campaignKey = (name: string) => name.trim().toLowerCase();

export type CampaignTotal = { platform: AdPlatform; campaignName: string; currency: string; spend: number; impressions: number; clicks: number; leads: number };

/** Adds up the daily rows per campaign, biggest spend first. */
export function byCampaign(rows: AdRow[]): CampaignTotal[] {
  const map = new Map<string, CampaignTotal>();
  for (const r of rows) {
    const k = `${r.platform}|${r.campaignId}`;
    const t = map.get(k) ?? { platform: r.platform, campaignName: r.campaignName, currency: r.currency, spend: 0, impressions: 0, clicks: 0, leads: 0 };
    t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.leads += r.leads;
    t.campaignName = r.campaignName;
    map.set(k, t);
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

/** Sample results so the demo shows how the panel looks once the accounts are connected. */
export function demoAds(r: Range): AdsResponse {
  const { from, to } = rangeDays(r);
  const camps: { platform: AdPlatform; id: string; name: string; base: number }[] = [
    { platform: "meta", id: "m1", name: "IG Study Abroad Oct", base: 180 },
    { platform: "meta", id: "m2", name: "FB Work Permit Leads", base: 140 },
    { platform: "google", id: "g1", name: "Search · Study visa Canada", base: 120 },
    { platform: "google", id: "g2", name: "Search · EB2-NIW", base: 90 },
  ];
  const rows: AdRow[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); dayKey(t - TZ) <= to; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const seed = Number(date.replace(/-/g, "")) % 97;
    for (const c of camps) {
      const k = ((seed * (c.base % 13 + 3)) % 40) / 100 + 0.8;
      const spend = Math.round(c.base * k);
      const impressions = Math.round(spend * (c.platform === "meta" ? 95 : 22));
      const clicks = Math.round(impressions * (c.platform === "meta" ? 0.012 : 0.06));
      rows.push({ platform: c.platform, accountId: "demo", campaignId: c.id, campaignName: c.name, date, spend, currency: "SAR", impressions, clicks, leads: Math.max(0, Math.round(clicks * (c.platform === "meta" ? 0.004 : 0.003))) });
    }
  }
  return { demo: true, rows, status: [{ platform: "meta", configured: true, ok: true }, { platform: "google", configured: true, ok: true }] };
}
