"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileText } from "@/components/icons";
import { PageHeader, Panel, Stat, Button } from "@/components/ui";
import { ReportPreview } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { LEAD_SOURCES, OWNER_LABEL, STAGES, STAGE_OWNER, VISA_TYPES, agentById, stageLabel, userById, visaLabel, STATUS_LABEL, type StageOwner } from "@/lib/demo-data";
import { stagePeriods } from "@/lib/accountability";
import { canSeeCommission, canSeeOutcome } from "@/lib/permissions";
import { Pill } from "@/components/status";
import { TODAY, daysBetween, deadlineState, fmtDate, fmtSar } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";
import { field, td, th } from "@/lib/styles";

const PERIODS = [{ id: "all", label: "All time", days: 100000 }, { id: "30", label: "Last 30 days", days: 30 }, { id: "90", label: "Last 90 days", days: 90 }, { id: "365", label: "Last 12 months", days: 365 }];

export default function ReportsPage() {
  const d = useDemo();
  const [period, setPeriod] = useState("all");
  const [visa, setVisa] = useState("");
  const [preview, setPreview] = useState(false);
  const showOutcome = canSeeOutcome(d.user);
  const showComm = canSeeCommission(d.user);
  const days = PERIODS.find((p) => p.id === period)?.days ?? 100000;

  const cases = d.visible.filter((c) => (!visa || c.visa === visa) && daysBetween(c.history[0]?.at ?? c.stageSince) <= days);
  const total = Math.max(1, cases.length);
  const active = cases.filter((c) => c.status === "active");
  const overdue = active.filter((c) => deadlineState(c.deadline) === "overdue").length;
  const stuck = active.filter((c) => daysBetween(c.stageSince) > 21);
  const commissionTotal = cases.reduce((s, c) => s + (c.commissionSar ?? 0), 0);
  const approved = cases.filter((c) => c.status === "approved").length;
  const refused = cases.filter((c) => c.status === "refused").length;
  const teams: StageOwner[] = ["social", "sales", "case"];
  const byTeam = teams.map((t) => {
    const here = active.filter((c) => STAGE_OWNER[c.stage] === t);
    const periods = cases.flatMap((c) => stagePeriods(c, d.sla)).filter((p) => p.owner === t && !p.current);
    const late = periods.filter((p) => p.late).length;
    return { t, now: here.length, waiting: here.filter((c) => c.route).length, overdue: here.filter((c) => deadlineState(c.deadline) === "overdue").length, done: periods.length, late, avg: periods.length ? (periods.reduce((x, p) => x + p.days, 0) / periods.length).toFixed(1) : "0" };
  });
  const byPerson = d.users.filter((u) => u.role === "consultant" && !u.inactive).map((u) => {
    const mine = active.filter((c) => c.consultantId === u.id);
    return { u, n: mine.length, overdue: mine.filter((c) => deadlineState(c.deadline) === "overdue").length, slow: mine.filter((c) => daysBetween(c.stageSince) > 10).length };
  }).filter((r) => r.n > 0).sort((a, b) => b.overdue - a.overdue || b.slow - a.slow);
  const unclaimed = active.filter((c) => c.route);
  const stageDelay = STAGES.map((s) => { const ps = cases.flatMap((c) => stagePeriods(c, d.sla)).filter((p) => p.stage === s.id); return { s, n: ps.length, late: ps.filter((p) => p.late).length }; }).filter((x) => x.late > 0).sort((a, b) => b.late - a.late);
  const clientName = (id: string) => d.clients.find((c) => c.id === id)?.name ?? "";

  const funnel = STAGES.filter((s) => s.id !== "outcome" || showOutcome).map((s) => ({ ...s, n: cases.filter((c) => c.history.some((h) => h.to === s.id)).length }));
  const bySource = LEAD_SOURCES.map((s) => ({ s, n: cases.filter((c) => c.leadSource === s).length, deals: cases.filter((c) => c.leadSource === s && c.history.some((h) => h.to === "deal")).length })).filter((x) => x.n > 0);
  const agentRows = d.agents.map((a) => { const cs = cases.filter((c) => c.agentId === a.id); return { a, n: cs.length, comm: cs.reduce((s, c) => s + (c.commissionSar ?? 0), 0) }; });

  const exportCsv = () => {
    const head = ["Case", "Client", "Visa", "Step", "Status", "Team", "Responsible", "Deadline", "Days in step", "Lead source", "Agent", ...(showOutcome ? ["Result"] : []), ...(showComm ? ["Commission (SAR)"] : [])];
    const rows = cases.map((c) => [c.ref, clientName(c.clientId), visaLabel(c.visa), stageLabel(c.stage), OWNER_LABEL[STAGE_OWNER[c.stage]], (!showOutcome && (c.status === "approved" || c.status === "refused")) ? "Closed" : STATUS_LABEL[c.status], userById(c.consultantId)?.name ?? "", fmtDate(c.deadline), daysBetween(c.stageSince), c.leadSource, agentById(c.agentId)?.name ?? "", ...(showOutcome ? [c.status === "approved" ? "Approved" : c.status === "refused" ? "Refused" : ""] : []), ...(showComm ? [c.commissionSar ?? ""] : [])]);
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
        {canSeeCommission(d.user) ? <Stat label="Commission recorded" value={fmtSar(commissionTotal)} tone="green" hint={`${approved} approved · ${refused} denied`} /> : <Stat label="Decisions" value={`${approved} / ${refused}`} hint="Approved / denied. Commission is visible to administrators only." />}
      </div>

      <div className="mt-6 grid gap-6">
        <Panel title="Accountability by team" description="Where work is sitting now, and how often each team kept to the days allowed." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[0.9375rem]"><caption className="sr-only">Accountability by team</caption>
              <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Team</th><th scope="col" className={th}>Active now</th><th scope="col" className={th}>Not accepted</th><th scope="col" className={th}>Overdue</th><th scope="col" className={th}>Steps finished</th><th scope="col" className={th}>Finished late</th><th scope="col" className={th}>Average days per step</th></tr></thead>
              <tbody className="divide-y divide-line">{byTeam.map((r) => <tr key={r.t}><td className={`${td} font-medium`}>{OWNER_LABEL[r.t]}</td><td className={`${td} tabular-nums`}>{r.now}</td><td className={`${td} tabular-nums`}>{r.waiting ? <Pill tone="warning">{r.waiting}</Pill> : 0}</td><td className={`${td} tabular-nums`}>{r.overdue ? <Pill tone="danger">{r.overdue}</Pill> : 0}</td><td className={`${td} tabular-nums`}>{r.done}</td><td className={`${td} tabular-nums`}>{r.late}</td><td className={`${td} tabular-nums`}>{r.avg}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Where cases get stuck" description="Steps where cases ran past the days allowed." flush>
          {stageDelay.length === 0 ? <p className="p-5 text-sm text-ink-muted">No step has run late in this view.</p> : (
            <ul className="divide-y divide-line">{stageDelay.map((x) => <li key={x.s.id} className="flex items-center justify-between gap-3 px-5 py-3"><span><span className="font-medium">{x.s.label}</span> <span className="text-sm text-ink-muted">· {OWNER_LABEL[STAGE_OWNER[x.s.id]]}</span></span><Pill tone="danger">{x.late} of {x.n} late</Pill></li>)}</ul>
          )}
        </Panel>
        <Panel title="Workload by person" description="Active cases each person holds right now." flush>
          {byPerson.length === 0 ? <p className="p-5 text-sm text-ink-muted">No active cases.</p> : (
            <ul className="divide-y divide-line">{byPerson.map((r) => <li key={r.u.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="min-w-0"><span className="font-medium">{r.u.name}</span> <span className="text-sm text-ink-muted">· {r.u.workTeam ? OWNER_LABEL[r.u.workTeam] : ""}</span></span><span className="flex shrink-0 gap-2"><Pill>{r.n} active</Pill>{r.overdue > 0 && <Pill tone="danger">{r.overdue} overdue</Pill>}{r.slow > 0 && <Pill tone="warning">{r.slow} slow</Pill>}</span></li>)}</ul>
          )}
        </Panel>
        <Panel title="Waiting to be accepted" description="Passed to a team but nobody has accepted yet." className="xl:col-span-2" flush>
          {unclaimed.length === 0 ? <p className="p-5 text-sm text-ink-muted">Everything passed on has been accepted.</p> : (
            <ul className="divide-y divide-line">{unclaimed.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="min-w-0">{clientName(c.clientId)} · {c.ref} <span className="text-sm text-ink-muted">· for {c.route ? OWNER_LABEL[c.route.to] : ""}</span></span><Link href={`/cases/${c.id}`} className="shrink-0 font-semibold text-brand-deep hover:underline">{daysBetween(c.stageSince)} days</Link></li>)}</ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Cases by visa type" description="Select a visa type to open its cases.">
          <Bars rows={VISA_TYPES.map((v) => ({ label: v.label, n: cases.filter((c) => c.visa === v.id).length, href: `/cases?visa=${v.id}` }))} total={total} />
        </Panel>
        <Panel title="Pipeline conversion" description="How many cases reached each step.">
          <Bars rows={funnel.map((s) => ({ label: s.label, n: s.n }))} total={total} />
        </Panel>
        <Panel title="Leads by source" description="Which channels produced these cases, and how many reached a deal." flush>
          {bySource.length === 0 ? <p className="p-5 text-sm text-ink-muted">No lead sources for this view.</p> : (
            <table className="w-full text-[0.9375rem]"><caption className="sr-only">Leads by source</caption><thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Source</th><th scope="col" className={th}>Leads</th><th scope="col" className={th}>Reached deal</th><th scope="col" className={th}>Rate</th></tr></thead>
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
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-[0.9375rem]"><caption className="sr-only">Agent summary</caption><thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Agent</th><th scope="col" className={th}>Referred cases</th>{canSeeCommission(d.user) && <><th scope="col" className={th}>Commission recorded</th><th scope="col" className={th}>Payment</th></>}</tr></thead>
            <tbody className="divide-y divide-line">{agentRows.map(({ a, n, comm }) => <tr key={a.id}><td className={td}>{a.name}</td><td className={`${td} tabular-nums`}>{n}</td>{canSeeCommission(d.user) && <><td className={`${td} tabular-nums`}>{comm ? fmtSar(comm) : "None yet"}</td><td className={td}>{a.paid ? "Paid" : "Pending"}</td></>}</tr>)}</tbody></table></div>
        </Panel>
      </div>

      {preview && (
        <ReportPreview title="All clients report" subtitle={`${PERIODS.find((p) => p.id === period)?.label} · ${fmtDate(TODAY.toISOString())}`} onClose={() => setPreview(false)}>
          <p className="mb-3">{cases.length} cases · {active.length} active · {overdue} overdue · {stuck.length} stuck over 21 days</p>
          <table className="w-full border-collapse text-left text-[0.75rem]"><thead><tr>{["Case", "Client", "Visa", "Step", "Responsible", "Deadline"].map((h) => <th key={h} className="border-b p-1">{h}</th>)}</tr></thead>
            <tbody>{cases.map((c) => <tr key={c.id}><td className="border-b p-1">{c.ref}</td><td className="border-b p-1">{clientName(c.clientId)}</td><td className="border-b p-1">{visaLabel(c.visa)}</td><td className="border-b p-1">{stageLabel(c.stage)}</td><td className="border-b p-1">{c.route ? "Waiting to be accepted" : userById(c.consultantId)?.name}</td><td className="border-b p-1">{fmtDate(c.deadline)}</td></tr>)}</tbody></table>
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
