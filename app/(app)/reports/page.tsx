"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileText } from "@/components/icons";
import { PageHeader, Panel, Stat, Button } from "@/components/ui";
import { ReportPreview } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { LEAD_SOURCES, STAGES, VISA_TYPES, agentById, stageLabel, userById, visaLabel } from "@/lib/demo-data";
import { canSeeCommission, canSeeOutcome } from "@/lib/permissions";
import { TODAY, daysBetween, deadlineState, fmtDate, fmtSar } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";
import { field, td, th } from "@/lib/styles";

const PERIODS = [{ id: "all", label: "All time", days: 100000 }, { id: "30", label: "Last 30 days", days: 30 }, { id: "90", label: "Last 90 days", days: 90 }, { id: "365", label: "Last 12 months", days: 365 }];

export default function ReportsPage() {
  const d = useDemo();
  const [period, setPeriod] = useState("all");
  const [visa, setVisa] = useState("");
  const [preview, setPreview] = useState(false);
  const admin = canSeeOutcome(d.user);
  const days = PERIODS.find((p) => p.id === period)?.days ?? 100000;

  const cases = d.visible.filter((c) => (!visa || c.visa === visa) && daysBetween(c.history[0]?.at ?? c.stageSince) <= days);
  const total = Math.max(1, cases.length);
  const active = cases.filter((c) => c.status === "active");
  const overdue = active.filter((c) => deadlineState(c.deadline) === "overdue").length;
  const stuck = active.filter((c) => daysBetween(c.stageSince) > 21);
  const commissionTotal = cases.reduce((s, c) => s + (c.commissionSar ?? 0), 0);
  const approved = cases.filter((c) => c.status === "approved").length;
  const refused = cases.filter((c) => c.status === "refused").length;
  const clientName = (id: string) => d.clients.find((c) => c.id === id)?.name ?? "";

  const funnel = STAGES.filter((s) => s.id !== "outcome" || admin).map((s) => ({ ...s, n: cases.filter((c) => c.history.some((h) => h.to === s.id)).length }));
  const bySource = LEAD_SOURCES.map((s) => ({ s, n: cases.filter((c) => c.leadSource === s).length, deals: cases.filter((c) => c.leadSource === s && c.history.some((h) => h.to === "deal")).length })).filter((x) => x.n > 0);
  const agentRows = d.agents.map((a) => { const cs = cases.filter((c) => c.agentId === a.id); return { a, n: cs.length, comm: cs.reduce((s, c) => s + (c.commissionSar ?? 0), 0) }; });

  const exportCsv = () => {
    const head = ["Case", "Client", "Visa", "Stage", "Status", "Consultant", "Deadline", "Days in stage", "Lead source", "Agent", ...(admin ? ["Outcome", "Commission (SAR)"] : [])];
    const rows = cases.map((c) => [c.ref, clientName(c.clientId), visaLabel(c.visa), stageLabel(c.stage), (!admin && (c.status === "approved" || c.status === "refused")) ? "Closed" : c.status, userById(c.consultantId)?.name ?? "", fmtDate(c.deadline), daysBetween(c.stageSince), c.leadSource, agentById(c.agentId)?.name ?? "", ...(admin ? [c.status === "approved" ? "Approved" : c.status === "refused" ? "Refused" : "", c.commissionSar ?? ""] : [])]);
    downloadCsv("perfectgration-cases.csv", [head, ...rows]);
    d.toast("Downloaded perfectgration-cases.csv. Opens in Excel. (Demo data.)");
  };
  const exportCommission = () => {
    const rows = d.agents.filter((a) => !a.paid).map((a) => [a.name, a.city, a.commissionType === "percent" ? `${a.amount}%` : fmtSar(a.amount), cases.filter((c) => c.agentId === a.id).length, cases.filter((c) => c.agentId === a.id).reduce((s, c) => s + (c.commissionSar ?? 0), 0)]);
    downloadCsv("commission-pending.csv", [["Agent", "City", "Rule", "Referred cases", "Commission recorded (SAR)"], ...rows]);
    d.toast("Downloaded commission-pending.csv. (Demo data.)");
  };

  return (
    <div>
      <PageHeader eyebrow="Business" title="Reports" description="Operational summaries for directors. Figures reflect the cases you are allowed to see." />

      <form onSubmit={(e) => e.preventDefault()} className="mb-5 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="rp-period" className="mb-1 block text-sm font-semibold">Period</label><select id="rp-period" className={field} value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        <div><label htmlFor="rp-visa" className="mb-1 block text-sm font-semibold">Visa type</label><select id="rp-visa" className={field} value={visa} onChange={(e) => setVisa(e.target.value)}><option value="">All visa types</option>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:justify-end"><Button variant="secondary" onClick={exportCsv}><Download size={18} aria-hidden /> Excel (.csv)</Button><Button variant="secondary" onClick={() => setPreview(true)}><FileText size={18} aria-hidden /> PDF</Button></div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Cases in this view" value={cases.length} hint={`${active.length} active`} />
        <Stat label="Overdue deadlines" value={overdue} tone={overdue ? "red" : "blue"} />
        <Stat label="Stuck over 21 days" value={stuck.length} tone={stuck.length ? "amber" : "blue"} />
        {canSeeCommission(d.user) ? <Stat label="Commission recorded" value={fmtSar(commissionTotal)} tone="green" hint={`${approved} approved · ${refused} refused`} /> : <Stat label="Outcomes" value="Restricted" hint="Visible to administrators only" />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Cases by visa type" description="Select a visa type to open its cases.">
          <Bars rows={VISA_TYPES.map((v) => ({ label: v.label, n: cases.filter((c) => c.visa === v.id).length, href: `/cases?visa=${v.id}` }))} total={total} />
        </Panel>
        <Panel title="Pipeline conversion" description="How many cases reached each stage.">
          <Bars rows={funnel.map((s) => ({ label: s.label, n: s.n }))} total={total} />
        </Panel>
        <Panel title="Leads by source" description="Which channels produced these cases, and how many reached a deal." flush>
          {bySource.length === 0 ? <p className="p-5 text-sm text-ink-muted">No lead sources for this view.</p> : (
            <table className="w-full text-[15px]"><caption className="sr-only">Leads by source</caption><thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Source</th><th scope="col" className={th}>Leads</th><th scope="col" className={th}>Reached deal</th><th scope="col" className={th}>Rate</th></tr></thead>
              <tbody className="divide-y divide-line">{bySource.map((r) => <tr key={r.s}><td className={td}>{r.s}</td><td className={`${td} tabular-nums`}>{r.n}</td><td className={`${td} tabular-nums`}>{r.deals}</td><td className={`${td} tabular-nums`}>{Math.round((r.deals / r.n) * 100)}%</td></tr>)}</tbody></table>
          )}
        </Panel>
        <Panel title="Stuck over 21 days" description="Active cases that need an immediate review." flush>
          {stuck.length === 0 ? <p className="p-5 text-sm text-ink-muted">No cases are stuck. Good progress.</p> : (
            <ul className="divide-y divide-line">{stuck.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3"><span>{clientName(c.clientId)} · {c.ref}</span><Link href={`/cases/${c.id}`} className="font-semibold text-brand-deep hover:underline">{daysBetween(c.stageSince)} days</Link></li>)}</ul>
          )}
        </Panel>
        <Panel title="Agent summary" description="Clients referred by each agent." className="xl:col-span-2" flush
          action={canSeeCommission(d.user) ? <Button variant="secondary" onClick={exportCommission}><Download size={18} aria-hidden /> Commission pending (.csv)</Button> : undefined}>
          <div className="overflow-x-auto"><table className="w-full text-[15px]"><caption className="sr-only">Agent summary</caption><thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Agent</th><th scope="col" className={th}>Referred cases</th>{canSeeCommission(d.user) && <><th scope="col" className={th}>Commission recorded</th><th scope="col" className={th}>Payment</th></>}</tr></thead>
            <tbody className="divide-y divide-line">{agentRows.map(({ a, n, comm }) => <tr key={a.id}><td className={td}>{a.name}</td><td className={`${td} tabular-nums`}>{n}</td>{canSeeCommission(d.user) && <><td className={`${td} tabular-nums`}>{comm ? fmtSar(comm) : "None yet"}</td><td className={td}>{a.paid ? "Paid" : "Pending"}</td></>}</tr>)}</tbody></table></div>
        </Panel>
      </div>

      {preview && (
        <ReportPreview title="All clients report" subtitle={`${PERIODS.find((p) => p.id === period)?.label} · ${fmtDate(TODAY.toISOString())}`} onClose={() => setPreview(false)}>
          <p className="mb-3">{cases.length} cases · {active.length} active · {overdue} overdue · {stuck.length} stuck over 21 days</p>
          <table className="w-full border-collapse text-left text-[12px]"><thead><tr>{["Case", "Client", "Visa", "Stage", "Consultant", "Deadline"].map((h) => <th key={h} className="border-b p-1">{h}</th>)}</tr></thead>
            <tbody>{cases.map((c) => <tr key={c.id}><td className="border-b p-1">{c.ref}</td><td className="border-b p-1">{clientName(c.clientId)}</td><td className="border-b p-1">{visaLabel(c.visa)}</td><td className="border-b p-1">{stageLabel(c.stage)}</td><td className="border-b p-1">{userById(c.consultantId)?.name}</td><td className="border-b p-1">{fmtDate(c.deadline)}</td></tr>)}</tbody></table>
          {canSeeCommission(d.user) && <><h3 className="mb-1 mt-4 font-bold">Commission pending</h3><ul className="list-disc pl-5">{d.agents.filter((a) => !a.paid).map((a) => <li key={a.id}>{a.name}: {a.commissionType === "percent" ? `${a.amount}%` : fmtSar(a.amount)}</li>)}</ul></>}
        </ReportPreview>
      )}
    </div>
  );
}

function Bars({ rows, total }: { rows: { label: string; n: number; href?: string }[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const inner = (
          <span className="grid grid-cols-[minmax(0,10.5rem)_1fr_2.5rem] items-center gap-3">
            <span className="truncate text-sm font-medium">{r.label}</span>
            <span aria-hidden className="h-3 overflow-hidden rounded-full bg-brand-soft"><span className="block h-full rounded-full bg-brand" style={{ width: `${(r.n / total) * 100}%` }} /></span>
            <span className="text-right text-sm font-bold tabular-nums">{r.n}</span>
          </span>
        );
        return <li key={r.label}>{r.href ? <Link href={r.href} className="block rounded-md py-1 hover:bg-brand-tint">{inner}</Link> : <div className="py-1">{inner}</div>}</li>;
      })}
    </ul>
  );
}
