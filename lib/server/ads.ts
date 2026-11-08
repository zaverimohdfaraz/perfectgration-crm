import "server-only";
import { createHmac } from "node:crypto";
/**
 * Reads campaign results straight from Meta (Marketing API) and Google (Google Ads API) and stores
 * one row per campaign per day in the `adinsights` collection.
 *
 * Everything here is OPTIONAL. If the keys for a platform are not in the environment, that platform is
 * simply shown as "Not connected" and nothing else in the app is affected.
 */
import { metaLeads, type AdPlatform, type AdRow, type AdStatus } from "@/lib/ads";
import { AdInsightModel, SettingsModel } from "./models";

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const metaConfig = () => {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const accounts = list(process.env.META_AD_ACCOUNT_IDS).map((a) => (a.startsWith("act_") ? a : `act_${a}`));
  const secret = process.env.META_APP_SECRET?.trim();
  // appsecret_proof is required when the Meta app has "Require app secret" switched on; it is harmless otherwise.
  const proof = token && secret ? createHmac("sha256", secret).update(token).digest("hex") : undefined;
  return token && accounts.length ? { token, accounts, proof, version: process.env.META_API_VERSION?.trim() || "v25.0" } : null;
};

export const googleConfig = () => {
  const e = process.env;
  const ids = list(e.GOOGLE_ADS_CUSTOMER_IDS).map((a) => a.replace(/-/g, ""));
  const ok = e.GOOGLE_ADS_DEVELOPER_TOKEN && e.GOOGLE_ADS_CLIENT_ID && e.GOOGLE_ADS_CLIENT_SECRET && e.GOOGLE_ADS_REFRESH_TOKEN && ids.length;
  return ok ? {
    developerToken: e.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(), clientId: e.GOOGLE_ADS_CLIENT_ID!.trim(), clientSecret: e.GOOGLE_ADS_CLIENT_SECRET!.trim(),
    refreshToken: e.GOOGLE_ADS_REFRESH_TOKEN!.trim(), customers: ids, loginCustomerId: e.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "").trim() || undefined,
    version: e.GOOGLE_ADS_API_VERSION?.trim() || "v26",
  } : null;
};

/** Day as YYYY-MM-DD, `days` days before today (UTC). */
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(25_000) });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) {
    const e = data as { error?: { message?: string; error_user_msg?: string; details?: { errors?: { message?: string }[] }[] } } | null;
    const msg = e?.error?.details?.[0]?.errors?.[0]?.message || e?.error?.error_user_msg || e?.error?.message || text.slice(0, 200) || res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  return data;
}

/* ─── Meta ─── */
type MetaInsight = { campaign_id: string; campaign_name: string; date_start: string; spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[] };
async function fetchMeta(days: number): Promise<AdRow[]> {
  const cfg = metaConfig();
  if (!cfg) return [];
  const base = `https://graph.facebook.com/${cfg.version}`;
  const rows: AdRow[] = [];
  for (const account of cfg.accounts) {
    const auth = new URLSearchParams({ access_token: cfg.token, ...(cfg.proof ? { appsecret_proof: cfg.proof } : {}) });
    const info = (await getJson(`${base}/${account}?fields=currency&${auth}`)) as { currency?: string };
    const params = new URLSearchParams({
      level: "campaign", time_increment: "1", limit: "500",
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      time_range: JSON.stringify({ since: ago(days), until: ago(0) }),
      access_token: cfg.token,
      ...(cfg.proof ? { appsecret_proof: cfg.proof } : {}),
    });
    let url: string | undefined = `${base}/${account}/insights?${params}`;
    for (let page = 0; url && page < 50; page++) {
      const r = (await getJson(url)) as { data?: MetaInsight[]; paging?: { next?: string } };
      for (const x of r.data ?? []) {
        rows.push({
          platform: "meta", accountId: account, campaignId: x.campaign_id, campaignName: x.campaign_name, date: x.date_start,
          spend: Number(x.spend) || 0, currency: info.currency ?? "", impressions: Number(x.impressions) || 0, clicks: Number(x.clicks) || 0, leads: metaLeads(x.actions),
        });
      }
      url = r.paging?.next;
    }
  }
  return rows;
}

/* ─── Google ─── */
type GoogleRow = { customer?: { currencyCode?: string }; campaign?: { id?: string; name?: string }; segments?: { date?: string }; metrics?: { costMicros?: string; impressions?: string; clicks?: string; conversions?: number | string } };

async function fetchGoogle(days: number): Promise<AdRow[]> {
  const cfg = googleConfig();
  if (!cfg) return [];
  const tok = (await getJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: cfg.refreshToken, grant_type: "refresh_token" }),
  })) as { access_token?: string };
  if (!tok.access_token) throw new Error("Google did not return an access token. Check the client ID, secret and refresh token.");
  const query = `SELECT customer.currency_code, campaign.id, campaign.name, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${ago(days)}' AND '${ago(0)}'`;
  const rows: AdRow[] = [];
  for (const customer of cfg.customers) {
    const batches = (await getJson(`https://googleads.googleapis.com/${cfg.version}/customers/${customer}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.access_token}`, "developer-token": cfg.developerToken, "Content-Type": "application/json",
        ...(cfg.loginCustomerId ? { "login-customer-id": cfg.loginCustomerId } : {}),
      },
      body: JSON.stringify({ query }),
    })) as { results?: GoogleRow[] }[];
    for (const b of batches ?? []) {
      for (const x of b.results ?? []) {
        if (!x.campaign?.id || !x.segments?.date) continue;
        rows.push({
          platform: "google", accountId: customer, campaignId: x.campaign.id, campaignName: x.campaign.name ?? x.campaign.id, date: x.segments.date,
          spend: Math.round((Number(x.metrics?.costMicros) || 0) / 10_000) / 100, currency: x.customer?.currencyCode ?? "",
          impressions: Number(x.metrics?.impressions) || 0, clicks: Number(x.metrics?.clicks) || 0, leads: Math.round(Number(x.metrics?.conversions) || 0),
        });
      }
    }
  }
  return rows;
}

/* ─── Sync and read ─── */
type SyncResult = { platform: AdPlatform; configured: boolean; ok?: boolean; rows?: number; error?: string };

/**
 * Fetches the last `days` days (default 30) for every configured platform and saves them.
 * Recent days are fetched again each time because the platforms keep correcting them for a few days.
 * One platform failing never stops the other.
 */
export async function syncAds(days = 30): Promise<SyncResult[]> {
  const out: SyncResult[] = [];
  for (const [platform, configured, run] of [["meta", !!metaConfig(), fetchMeta], ["google", !!googleConfig(), fetchGoogle]] as const) {
    if (!configured) { out.push({ platform, configured: false }); continue; }
    const at = new Date().toISOString();
    try {
      const rows = await run(days);
      if (rows.length) {
        await AdInsightModel.bulkWrite(rows.map((r) => ({
          replaceOne: { filter: { _id: `${r.platform}:${r.accountId}:${r.campaignId}:${r.date}` }, replacement: { _id: `${r.platform}:${r.accountId}:${r.campaignId}:${r.date}`, ...r, syncedAt: at }, upsert: true },
        })), { ordered: false });
      }
      await SettingsModel.updateOne({ _id: "main" }, { $set: { [`adSync.${platform}`]: { at, ok: true } } }, { upsert: true });
      out.push({ platform, configured: true, ok: true, rows: rows.length });
    } catch (e) {
      const error = (e as Error).message.slice(0, 300);
      console.error(`[ads] ${platform} sync failed:`, error);
      await SettingsModel.updateOne({ _id: "main" }, { $set: { [`adSync.${platform}`]: { at, ok: false, error } } }, { upsert: true }).catch(() => undefined);
      out.push({ platform, configured: true, ok: false, error });
    }
  }
  return out;
}

export async function adStatus(): Promise<AdStatus[]> {
  const s = (await SettingsModel.findById("main").select({ adSync: 1 }).lean()) as { adSync?: Record<string, { at?: string; ok?: boolean; error?: string }> } | null;
  return (["meta", "google"] as const).map((p) => {
    const st = s?.adSync?.[p];
    return { platform: p, configured: p === "meta" ? !!metaConfig() : !!googleConfig(), lastSyncAt: st?.at, ok: st?.ok, error: st?.error };
  });
}

export async function readAds(from: string, to: string): Promise<AdRow[]> {
  const rows = (await AdInsightModel.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean()) as unknown as (AdRow & { _id: string; syncedAt?: string })[];
  return rows.map(({ _id, syncedAt, ...r }) => { void _id; void syncedAt; return r; });
}
