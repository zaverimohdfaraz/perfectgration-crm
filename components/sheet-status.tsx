"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";
import { fmtDateTime } from "@/lib/dates";

type Last = { at: string; ok: boolean; rows: number; created: number; skipped: number; error?: string } | null;
type Status = { configured: boolean; problem?: string | null; account?: string | null; last: Last };

/** Shows the last sync of the lead spreadsheet, and lets a leader run a sync now. */
export function SheetStatus() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/leads/sheet", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setSt).catch(() => setSt(null));
  useEffect(() => { load(); }, []);

  const syncNow = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/leads/sheet", { method: "POST" });
      const j = await r.json();
      if (!r.ok) setMsg(j.error ?? "The sync failed.");
      else {
        const x = j.result;
        setMsg(x.error ? `Sync error: ${x.error}` : `Read ${x.rows} rows · ${x.created} new lead${x.created === 1 ? "" : "s"} added · ${x.existing} already in the CRM · ${x.skipped} skipped (no ID)`);
      }
      await load();
    } finally { setBusy(false); }
  };

  if (!st) return null;
  const l = st.last;
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4 text-sm">
      <p className="font-semibold text-ink">Google Sheet leads</p>
      {st.problem ? (
        <p className="mt-1 text-red-700">Not connected: {st.problem}</p>
      ) : !st.configured ? (
        <p className="mt-1 text-ink-muted">Not connected. The two Vercel settings GOOGLE_SHEETS_LEADS_ID and GOOGLE_SERVICE_ACCOUNT_JSON are missing.</p>
      ) : (
        <>
          <p className="mt-1 text-ink-muted">
            {l ? <>Last sync {fmtDateTime(l.at)} · {l.ok ? `read ${l.rows} rows, ${l.created} new` : <span className="text-red-700">failed: {l.error ?? "unknown error"}</span>}</> : "Not synced yet."}
          </p>
          {st.account && <p className="mt-1 text-ink-muted">The sheet must be shared (Viewer) with <span className="font-medium text-ink">{st.account}</span>.</p>}
        </>
      )}
      {st.configured && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={syncNow} disabled={busy}>{busy ? "Syncing…" : "Sync now"}</Button>
          {msg && <p className="text-ink">{msg}</p>}
        </div>
      )}
    </div>
  );
}
