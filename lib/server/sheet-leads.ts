import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { CaseModel, SettingsModel } from "./models";
import { ingestLead } from "./leads-ingest";
import { connectDb } from "./db";
import { parseSheetLead, type IncomingLead } from "@/lib/leads";
import { trust } from "./trusted";

/**
 * Reads the Meta lead-form spreadsheet (Google Sheets) with a service account and adds every new row as a lead.
 * Rows that were already added (by this sheet or by the webhook) are skipped. Nothing is written to the sheet.
 *
 * Needs two environment variables:
 *   GOOGLE_SHEETS_LEADS_ID       the id in the sheet's address (between /d/ and /edit)
 *   GOOGLE_SERVICE_ACCOUNT_JSON  the whole JSON key file of the service account (the sheet must be shared with its email, as Viewer)
 */
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const EVERY_MS = 5 * 60_000;
/** A safety limit only. Meta adds new leads at the bottom, so every row up to this limit is read. */
const MAX_ROWS = 50_000;

export type SheetSyncResult = { at?: string; rows: number; created: number; existing: number; skipped: number; failed: number; error?: string };

export function sheetConfig(): { id: string; email: string; key: string } | undefined {
  const id = process.env.GOOGLE_SHEETS_LEADS_ID?.trim();
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!id || !raw) return undefined;
  try {
    const j = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (j.client_email && j.private_key) return { id, email: j.client_email, key: j.private_key };
  } catch { /* reported below */ }
  console.error("[sheet-leads] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  return undefined;
}

async function accessToken(cfg: { email: string; key: string }): Promise<string> {
  const key = await importPKCS8(cfg.key, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" }).setIssuer(cfg.email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt().setExpirationTime("1h").sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in failed: ${j.error_description ?? j.error ?? r.status}`);
  return j.access_token;
}

/** Every row of the first sheet, as {column heading: value}. */
export async function readSheetRows(): Promise<Record<string, string>[]> {
  const cfg = sheetConfig();
  if (!cfg) return [];
  const token = await accessToken(cfg);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cfg.id)}/values/A:ZZ`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as { values?: unknown[][]; error?: { message?: string } };
  if (!r.ok) throw new Error(`Google Sheets: ${j.error?.message ?? r.status}`);
  const [head = [], ...body] = j.values ?? [];
  const keys = head.map((h) => String(h ?? "").trim());
  if (body.length > MAX_ROWS) throw new Error(`The sheet has more than ${MAX_ROWS} rows`);
  return body.map((row) => Object.fromEntries(keys.map((k, i) => [k, String(row[i] ?? "")])));
}

async function saveStatus(s: { at: string; ok: boolean; rows: number; created: number; skipped: number; error?: string }) {
  await SettingsModel.updateOne({ _id: "main" }, { $set: { leadSheet: s } }, { upsert: true });
}

/** Adds every new lead from the sheet. Safe to run again at any time. */
export async function syncSheetLeads(): Promise<SheetSyncResult> {
  await connectDb();
  const at = new Date().toISOString();
  try {
    const parsed = (await readSheetRows()).map(parseSheetLead);
    const rows = parsed.length;
    const leads = parsed.filter((l): l is IncomingLead => !!l);
    const skipped = parsed.length - leads.length;
    const ids = leads.map((l) => l.externalId);
    const known = new Set(
      ((await CaseModel.find(trust({ externalId: { $in: ids } })).select({ externalId: 1 }).lean()) as { externalId?: string }[])
        .map((c) => c.externalId),
    );
    let created = 0, failed = 0, firstError: string | undefined;
    for (const l of leads.filter((x) => !known.has(x.externalId))) {
      try {
        const res = await ingestLead(l);
        if (res.status === "created") created++;
      } catch (e) {
        failed++;
        firstError ??= (e as Error).message;
        console.error("[sheet-leads] a row could not be added:", (e as Error).message);
      }
    }
    const error = failed ? `${failed} lead${failed === 1 ? "" : "s"} could not be added: ${firstError}` : undefined;
    await saveStatus({ at, ok: !failed, rows, created, skipped, error });
    return { at, rows, created, existing: known.size, skipped, failed, error };
  } catch (e) {
    const error = (e as Error).message;
    await saveStatus({ at, ok: false, rows: 0, created: 0, skipped: 0, error }).catch(() => undefined);
    console.error("[sheet-leads] sync failed:", error);
    return { at, rows: 0, created: 0, existing: 0, skipped: 0, failed: 0, error };
  }
}

/** Called when someone opens the Social Media page: syncs if the last sync is more than 5 minutes old. */
export async function syncSheetIfDue(): Promise<void> {
  if (!sheetConfig()) return;
  await connectDb();
  const s = (await SettingsModel.findById("main").select({ leadSheet: 1 }).lean()) as { leadSheet?: { at?: string } } | null;
  if (s?.leadSheet?.at && Date.now() - Date.parse(s.leadSheet.at) < EVERY_MS) return;
  await syncSheetLeads();
}

/** What the Social Media page shows about the last sheet sync. */
export async function sheetStatus() {
  const cfg = sheetConfig();
  await connectDb();
  const s = (await SettingsModel.findById("main").select({ leadSheet: 1 }).lean()) as { leadSheet?: Record<string, unknown> } | null;
  return { configured: !!cfg, last: (s?.leadSheet ?? null) as null | { at: string; ok: boolean; rows: number; created: number; skipped: number; error?: string } };
}
