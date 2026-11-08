"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { Pill } from "@/components/status";
import { BarChart, Kpi, RangePicker, useRange } from "@/components/hub";
import { SignInsPanel } from "@/components/sign-ins";
import { useDemo } from "@/lib/store";
import { ISSUE_LABEL, STAGE_OWNER, WORK_TEAM_LABEL, stageLabel, waitingLabel, type Case } from "@/lib/demo-data";
import { claimIn, daysSince, entered, enteredIn, inPeriod, inRange, pct, series } from "@/lib/analytics";
import { openIssues } from "@/lib/case-logic";
import { canSeeOutcome, claimable, heldByClient, myWork } from "@/lib/permissions";
import { deadlineState, fmtDateTime, fmtSar } from "@/lib/dates";

const overdue = (c: Case) => c.status === "active" && deadlineState(c.deadline) === "overdue";

/**
 * The central dashboard. Administrators and managers see all three teams. A team member sees only
 * their own work: the leads and cases they created, hold or handled, and what is waiting for them.
 * Every number and list follows the date filter.
 */
export default function DashboardPage() {
  const d = useDemo();
  const r = useRange("month");
  const range = r.range;
  const leader = d.user.role !== "consultant";
  const team = d.user.workTeam;
  const name = (c: Case) => d.clients.find((x) => x.id === c.clientId)?.name ?? "Client";

  // Whose data: everything for leaders; only this person's own work for a team member.
  const work = leader ? d.cases : myWork(d.user, d.cases);
  const open = (leader ? d.visible : d.visible.filter((c) => !c.route && c.consultantId === d.user.id)).filter((c) => inPeriod(c, range));
  const forMe = leader ? [] : claimable(d.user, d.cases);
  const outcomes = canSeeOutcome(d.user) || team === "case";

  const newLeads = work.filter((c) => enteredIn(c, "lead", range) && (leader || c.leadById === d.user.id));
  const toSales = work.filter((c) => enteredIn(c, "firstcall", range) && (leader || c.leadById === d.user.id || c.salesId === d.user.id));
  const salesAccepted = work.filter((c) => claimIn(c, "sales", range) && (leader || c.salesId === d.user.id));
  const deals = work.filter((c) => enteredIn(c, "advance", range) && (leader || c.salesId === d.user.id || (team === "social" && c.leadById === d.user.id)));
  const toCm = work.filter((c) => enteredIn(c, "doccollect", range) && (leader || c.salesId === d.user.id || c.caseManagerId === d.user.id));
  const fees = toCm.filter((c) => leader || c.salesId === d.user.id).reduce((s, c) => s + (c.feesCollectedSar ?? 0), 0);
  const submitted = work.filter((c) => inRange(c.submittedAt, range) && (leader || c.caseManagerId === d.user.id));
  const results = work.filter((c) => c.stage === "outcome" && inRange(entered(c, "outcome")?.at, range) && (leader || c.caseManagerId === d.user.id));
  const approved = results.filter((c) => c.status === "approved").length;
  const denied = results.filter((c) => c.status === "refused").length;

  const waiting = leader ? d.visible.filter((c) => c.route && c.status === "active" && inPeriod(c, range)) : forMe;
  const waitSales = waiting.filter((c) => c.route?.to === "sales");
  const waitCm = waiting.filter((c) => c.route?.to === "case");
  const late = open.filter(overdue);
  const problems = open.filter((c) => openIssues(c).length > 0);
  const onHold = open.filter((c) => c.status === "on_hold");
  const holdClient = onHold.filter(heldByClient).length;

  // The chart shows what matters for this person's team; leaders see new leads against deals.
  const cmReceived = toCm.filter((c) => leader || c.caseManagerId === d.user.id);
  const [chartNames, chartData] = leader ? [["New leads", "Deals finalised"], [newLeads.map((c) => ({ at: entered(c, "lead")?.at })), deals.map((c) => ({ at: entered(c, "advance")?.at }))]]
    : team === "social" ? [["Leads I created", "Passed to Sales"], [newLeads.map((c) => ({ at: entered(c, "lead")?.at })), toSales.map((c) => ({ at: entered(c, "firstcall")?.at }))]]
    : team === "case" ? [["Received", "Submitted"], [cmReceived.map((c) => ({ at: entered(c, "doccollect")?.at })), submitted.map((c) => ({ at: c.submittedAt }))]]
    : [["Leads received", "Deals finalised"], [toSales.map((c) => ({ at: entered(c, "firstcall")?.at })), deals.map((c) => ({ at: entered(c, "advance")?.at }))]];
  const chart = series(range, chartData as { at?: string }[][]);
  const attention = [...new Map([...late, ...problems, ...onHold, ...waiting].map((c) => [c.id, c])).values()]
    .sort((a, b) => Number(overdue(b)) - Number(overdue(a)) || a.stageSince.localeCompare(b.stageSince)).slice(0, 12);
  const activity = open.flatMap((c) => c.history.filter((h) => inRange(h.at, range)).map((h) => ({ c, h })))
    .sort((a, b) => b.h.at.localeCompare(a.h.at)).slice(0, 12);

  const allSteps = [
    { label: "New leads", n: newLeads.length, teams: ["social"] },
    { label: "Passed to Sales", n: toSales.length, teams: ["social", "sales"] },
    { label: "Deals finalised", n: deals.length, teams: ["social", "sales"] },
    { label: "Passed to Case Manager", n: toCm.length, teams: ["sales", "case"] },
    { label: "Submitted", n: submitted.length, teams: ["case"] },
    ...(outcomes ? [{ label: "Approved", n: approved, teams: ["case"] }] : []),
  ];
  const funnel = allSteps.filter((s) => leader || (team && s.teams.includes(team)));
  const max = Math.max(1, ...funnel.map((f) => f.n));

  const showSocial = leader || team === "social";
  const showSales = leader || team === "sales";
  const showCase = leader || team === "case";

  return (
    <div>
      <PageHeader
        eyebrow={leader ? "All teams" : `${WORK_TEAM_LABEL[team ?? "sales"]} · your work only`}
        title="Dashboard"
        description={leader ? "Social Media, Sales and Case Manager in one place. Every number follows the date filter." : "Your leads and cases only. Every number follows the date filter."}
        actions={<RangePicker state={r} />}
      />

      {forMe.length > 0 && (
        <Link href="/cases?waiting=1" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-[0.9375rem] font-semibold hover:bg-brand-tint">
          <span>{forMe.length} {forMe.length === 1 ? "case is" : "cases are"} waiting for you to accept in the {WORK_TEAM_LABEL[team ?? "sales"]}</span><span className="text-brand-deep">Open</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {showSocial && <Kpi label={leader ? "New leads" : "Leads I created"} value={newLeads.length} hint={range.label} />}
        {showSocial && <Kpi label="Passed to Sales" value={toSales.length} hint={`${pct(toSales.length, newLeads.length)} of new leads`} />}
        {showSales && <Kpi label={leader ? "Accepted by Sales" : "Leads I accepted"} value={salesAccepted.length} hint={range.label} />}
        {(showSales || leader) && <Kpi label="Deals finalised" value={deals.length} tone="good" hint={leader ? `Conversion ${pct(deals.length, toSales.length)}` : range.label} />}
        {showSales && <Kpi label="Fees collected" value={fmtSar(fees)} hint={`${toCm.filter((c) => leader || c.salesId === d.user.id).length} passed to Case Manager`} />}
        {showCase && <Kpi label={leader ? "Received by Case Manager" : "Cases I received"} value={toCm.filter((c) => leader || c.caseManagerId === d.user.id).length} hint={range.label} />}
        {showCase && <Kpi label="Submitted" value={submitted.length} hint={range.label} />}
        {showCase && outcomes && <Kpi label="Approved / denied" value={`${approved} / ${denied}`} tone={denied > approved ? "danger" : "good"} hint={results.length ? `${pct(approved, results.length)} approved` : "No results yet"} />}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Needs attention</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={leader ? "Waiting to be accepted" : "Waiting for you"} value={waiting.length} tone={waiting.length ? "warning" : "default"}
          hint={leader ? `Sales Team ${waitSales.length} · Case Manager ${waitCm.length}` : "You can accept these"} />
        <Kpi label="Overdue" value={late.length} tone={late.length ? "danger" : "default"} hint="Past the step's deadline" />
        <Kpi label="Open problems" value={problems.length} tone={problems.length ? "warning" : "default"} hint="Recorded on the case" />
        <Kpi label="On hold" value={onHold.length} tone={onHold.length ? "warning" : "default"} hint={`By client ${holdClient} · by us ${onHold.length - holdClient}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2"><BarChart title={`${chartNames[0]} and ${chartNames[1].toLowerCase()} · ${range.label}`} data={chart} names={chartNames as string[]} /></Panel>
        <Panel title={leader ? "From lead to result" : "My steps"} description={range.label}>
          <ul className="space-y-3">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="flex justify-between text-sm"><span>{f.label}</span><span className="font-semibold tabular-nums">{f.n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-brand-tint" aria-hidden><div className="h-2 rounded-full bg-[#0284C7]" style={{ width: `${(f.n / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {d.user.role === "admin" && <div className="mt-5"><SignInsPanel range={range} /></div>}

      {leader && (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <TeamCard href="/social" title="Social Media" rows={[["New leads", newLeads.length], ["Passed to Sales", toSales.length], ["Not passed yet", open.filter((c) => STAGE_OWNER[c.stage] === "social" && c.status === "active").length]]} />
          <TeamCard href="/sales" title="Sales" rows={[["Waiting to be accepted", waitSales.length], ["Holding now", open.filter((c) => STAGE_OWNER[c.stage] === "sales" && !c.route && c.status === "active").length], ["Deals finalised", deals.length], ["Fees collected", fmtSar(fees)], ["Overdue", late.filter((c) => STAGE_OWNER[c.stage] === "sales").length]]} />
          <TeamCard href="/case-manager" title="Case Manager" rows={[["Waiting to be accepted", waitCm.length], ["In progress", open.filter((c) => STAGE_OWNER[c.stage] === "case" && !c.route && c.status === "active").length], ["Submitted", submitted.length], ["Awaiting result", open.filter((c) => c.stage === "submitted" && c.status === "active").length], ["Problems or on hold", open.filter((c) => STAGE_OWNER[c.stage] === "case" && (openIssues(c).length || c.status === "on_hold")).length]]} />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Needs attention" description="Overdue first, then problems, holds and cases waiting to be accepted." flush>
          {attention.length === 0 ? <EmptyState title="Nothing needs attention" body="Overdue, stuck or waiting cases appear here." /> : (
            <ul className="divide-y divide-line">
              {attention.map((c) => {
                const issue = openIssues(c)[0];
                return (
                  <li key={c.id}><Link href={`/cases/${c.id}${issue || c.status === "on_hold" ? "?tab=problems" : ""}`} className="block px-5 py-3 hover:bg-brand-tint">
                    <p className="flex flex-wrap items-center gap-2 font-medium">{name(c)} <span className="text-sm font-normal text-ink-muted">· {c.ref}</span>
                      {overdue(c) && <Pill tone="danger">Overdue</Pill>}
                      {c.status === "on_hold" && <Pill tone="warning">{heldByClient(c) ? "On hold by client" : "On hold"}</Pill>}
                      {issue && <Pill tone="neutral">{ISSUE_LABEL[issue.kind]}</Pill>}
                      {c.route && <Pill tone="warning">{waitingLabel(c)}</Pill>}
                    </p>
                    <p className="text-sm text-ink-muted">{stageLabel(c.stage)} · {daysSince(c.stageSince)} days in step{issue ? ` · ${issue.text}` : c.status === "on_hold" && c.endReason ? ` · ${c.endReason}` : ""}</p>
                  </Link></li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Latest activity" description={range.label} flush>
          {activity.length === 0 ? <EmptyState title="No activity in this period" body="Steps, handoffs and acceptances appear here." /> : (
            <ul className="divide-y divide-line">
              {activity.map(({ c, h }, i) => (
                <li key={`${c.id}${i}`}><Link href={`/cases/${c.id}?tab=history`} className="block px-5 py-3 hover:bg-brand-tint">
                  <p className="text-[0.9375rem]"><span className="font-medium">{h.actor}</span> · {h.kind === "claim" ? "accepted" : h.kind === "assign" ? "assigned" : h.from && h.from !== h.to ? `${stageLabel(h.from)} → ${stageLabel(h.to)}` : `created at ${stageLabel(h.to)}`} · {name(c)}</p>
                  <p className="text-sm text-ink-muted">{fmtDateTime(h.at)} · {c.ref}</p>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TeamCard({ href, title, rows }: { href: string; title: string; rows: [string, ReactNode][] }) {
  return (
    <Panel title={title} action={<Link href={href} className="text-sm font-semibold text-brand-deep hover:underline">Open {title}</Link>}>
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2 text-[0.9375rem]"><dt className="text-ink-muted">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
      </dl>
    </Panel>
  );
}
