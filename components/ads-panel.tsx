"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "./icons";
import { Panel } from "./ui";
import { Pill } from "./status";
import { BarChart, Kpi } from "./hub";
import { useDemo } from "@/lib/store";
import { PLATFORM_LABEL, byCampaign, campaignKey, demoAds, rangeDays, type AdsResponse, type AdStatus } from "@/lib/ads";
import { entered, enteredIn, pct, series, type Range } from "@/lib/analytics";
import type { Case } from "@/lib/demo-data";
import { fmtDateTime } from "@/lib/dates";
import { btn, td, th } from "@/lib/styles";

const money = (n: number, cur: string) => {
  const v = Math.round(n * 100) / 100;
  return `${cur || ""} ${v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 2 : 0 })}`.trim();
};

function StatusLine({ s, demo }: { s: AdStatus; demo: boolean }) {
  const tone = !s.configured ? "neutral" : s.ok === false ? "danger" : s.partial ? "warning" : "success";
  const label = demo ? "Sample data" : !s.configured ? "Not connected" : s.ok === false ? "Sync failed" : s.partial ? "Some accounts not synced" : s.lastSyncAt ? "Connected" : "Connected · first sync pending";
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{PLATFORM_LABEL[s.platform]}</p>
        <Pill tone={tone}>{label}</Pill>
      </div>
      {!demo && s.lastSyncAt && <p className="mt-1 text-sm text-ink-muted">Last sync {fmtDateTime(s.lastSyncAt)}</p>}
      {!demo && s.ok === false && s.error && <p className="mt-1 break-words text-sm text-red-800">{s.error}</p>}
      {!demo && s.ok !== false && s.partial && s.error && <p className="mt-1 break-words text-sm text-amber-900">{s.error}. The other accounts are up to date.</p>}
      {!demo && !s.configured && <p className="mt-1 text-sm text-ink-muted">Add the {s.platform === "meta" ? "Meta" : "Google Ads"} keys in the environment settings to connect. See docs/ADS_SETUP.md.</p>}
    </li>
  );
}

/** Meta and Google Ads results beside the CRM's own leads, for the chosen date range. */
export function AdsPanel({ range, cases, leader }: { range: Range; cases: Case[]; leader: boolean }) {
  const d = useDemo();
  const demo = d.mode === "demo";
  const { from, to } = rangeDays(range);
  const [data, setData] = useState<AdsResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demo) { setData(demoAds(range)); return; }
    let live = true;
    setError("");
    fetch(`/api/ads?from=${from}&to=${to}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j as { error?: string }).error || "Ad results could not be loaded."); return j as AdsResponse; })
      .then((j) => { if (live) setData(j); })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, from, to]);

  const syncNow = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/ads/sync", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error || "Sync failed.");
      const again = await fetch(`/api/ads?from=${from}&to=${to}`, { cache: "no-store" }).then((x) => x.json());
      setData(again as AdsResponse);
      d.toast("Ad results updated.");
    } catch (e) { d.toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const campaigns = useMemo(() => byCampaign(rows), [rows]);
  const adNames = useMemo(() => new Set(campaigns.map((c) => campaignKey(c.campaignName))), [campaigns]);
  const crmLeads = cases.filter((c) => c.campaign && adNames.has(campaignKey(c.campaign)) && enteredIn(c, "lead", range));
  const crmFor = (name: string) => crmLeads.filter((c) => campaignKey(c.campaign!) === campaignKey(name));
  const adLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const configured = (data?.status ?? []).some((s) => s.configured);
  const chart = series(range, [
    rows.flatMap((r) => Array.from({ length: Math.min(r.leads, 500) }, () => ({ at: `${r.date}T12:00:00+03:00` }))),
    crmLeads.map((c) => ({ at: entered(c, "lead")?.at })),
  ]);

  return (
    <Panel title="Ad results" description={`Meta and Google Ads beside the leads in the CRM · ${range.label}${demo ? " · sample data in the demo" : ""}`}
      action={!demo && d.user.role !== "consultant" && configured ? <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => void syncNow()} disabled={busy}><RotateCcw size={16} aria-hidden /> {busy ? "Syncing…" : "Sync now"}</button> : undefined}>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {!data && !error && <p className="text-sm text-ink-muted">Loading ad results…</p>}
      {data && (
        <>
          <ul className="mb-4 grid gap-3 sm:grid-cols-2">{data.status.map((s) => <StatusLine key={s.platform} s={s} demo={!!data.demo} />)}</ul>
          {!configured ? (
            <p className="text-sm text-ink-muted">Nothing is connected yet, and the rest of the CRM works normally. Until the keys are added, tag the campaign name when creating a lead and it is counted in Leads by source.</p>
          ) : (
            <>
              {/* No spend totals or cost-per-lead here: accounts can be in different currencies, so adding them up would give a wrong figure. Spend is shown per campaign, in that campaign's own currency. */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Leads reported by ads" value={adLeads} hint={campaigns.length === 1 ? "1 campaign" : `${campaigns.length} campaigns`} />
                <Kpi label="Leads in the CRM from ads" value={crmLeads.length} hint="Matched by campaign name" tone="good" />
                <Kpi label="Clicks" value={clicks.toLocaleString("en-US")} hint={`${pct(clicks, impressions)} of ${impressions.toLocaleString("en-US")} views`} />
                {leader ? <Kpi label="Deals from ads" value={crmLeads.filter((c) => !!entered(c, "advance")).length} hint="CRM leads that reached a deal" /> : <Kpi label="Platforms" value={data.status.filter((s) => s.configured).length} />}
              </div>
              <div className="mt-5"><BarChart title="Leads reported by ads, and leads created in the CRM" data={chart} names={["Reported by ads", "Created in the CRM"]} /></div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[680px] text-[0.9375rem]">
                  <caption className="sr-only">Results by campaign</caption>
                  <thead className="border-b border-line bg-brand-tint"><tr>
                    <th scope="col" className={th}>Campaign</th><th scope="col" className={th}>Spend (own currency)</th><th scope="col" className={th}>Clicks</th>
                    <th scope="col" className={th}>Ad leads</th><th scope="col" className={th}>CRM leads</th>
                    {leader && <th scope="col" className={th}>Deals</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {campaigns.length === 0 ? <tr><td className={td} colSpan={leader ? 6 : 5}><span className="text-ink-muted">No ad activity in this period.</span></td></tr> : campaigns.map((c) => {
                      const mine = crmFor(c.campaignName);
                      return (
                        <tr key={`${c.platform}${c.campaignName}`}>
                          <td className={td}><p className="font-medium">{c.campaignName}</p><p className="text-sm text-ink-muted">{c.platform === "meta" ? "Meta" : "Google"}</p></td>
                          <td className={`${td} tabular-nums`}>{money(c.spend, c.currency)}</td>
                          <td className={`${td} tabular-nums`}>{c.clicks.toLocaleString("en-US")}</td>
                          <td className={`${td} tabular-nums`}>{c.leads}</td>
                          <td className={`${td} tabular-nums`}>{mine.length}</td>
                          {leader && <td className={`${td} tabular-nums`}>{mine.filter((x) => !!entered(x, "advance")).length}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-muted">CRM leads are matched when the campaign typed on the lead is exactly the ad campaign's name (capital letters do not matter).</p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
