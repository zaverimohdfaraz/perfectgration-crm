"use client";

import Link from "next/link";
import { PageHeader, Panel, Avatar, EmptyState } from "@/components/ui";
import { Pill } from "@/components/status";
import { BarChart, Kpi, PipelineBoard, RangePicker, TeamCases, columnsFor, useRange } from "@/components/hub";
import { useDemo } from "@/lib/store";
import { ISSUE_LABEL, STAGE_OWNER, SUBMISSION_LABEL, type StageId } from "@/lib/demo-data";
import { avg, claimIn, daysSince, entered, enteredIn, inPeriod, inRange, series } from "@/lib/analytics";
import { openIssues } from "@/lib/case-logic";
import { canSeeOutcome, claimable, heldByClient } from "@/lib/permissions";
import { deadlineState, fmtDate, fmtDateTime } from "@/lib/dates";
import { td, th } from "@/lib/styles";

const CM_STAGES: StageId[] = ["doccollect", "verify", "prep", "review", "submitted"];

export default function CaseManagerPage() {
  const d = useDemo();
  const r = useRange("month");
  const range = r.range;
  const leader = d.user.role !== "consultant";

  // A team member sees only the cases they hold or handled. Leaders see the whole team.
  const own = leader ? d.visible : d.visible.filter((c) => !c.route && (c.consultantId === d.user.id || c.caseManagerId === d.user.id));
  const forMe = leader ? [] : claimable(d.user, d.cases);
  const reached = own.filter((c) => !!entered(c, "doccollect"));
  // Everything below follows the date filter: cases with any activity, deadline or submission in the period.
  const inCm = own.filter((c) => STAGE_OWNER[c.stage] === "case" && inPeriod(c, range));
  const received = reached.filter((c) => enteredIn(c, "doccollect", range));
  const accepted = reached.filter((c) => claimIn(c, "case", range));
  const submitted = reached.filter((c) => inRange(c.submittedAt, range));
  const results = reached.filter((c) => c.stage === "outcome" && inRange(entered(c, "outcome")?.at, range));
  const approved = results.filter((c) => c.status === "approved").length;
  const denied = results.filter((c) => c.status === "refused").length;
  const toSubmit = avg(submitted.map((c) => {
    const a = entered(c, "doccollect")?.at;
    return a && c.submittedAt ? (Date.parse(c.submittedAt) - Date.parse(a)) / 86_400_000 : null;
  }));
  const awaiting = inCm.filter((c) => c.stage === "submitted" && c.status === "active").sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  const scoped = own.filter((c) => inPeriod(c, range));
  const problems = scoped.filter((c) => openIssues(c).length > 0 || c.status === "on_hold");
  const blockedBy = d.tasks.filter((t) => t.progress < 100 && scoped.some((c) => c.id === t.caseId) && (leader || t.assigneeId === d.user.id || own.some((c) => c.id === t.caseId)));
  const chart = series(range, [submitted.map((c) => ({ at: c.submittedAt })), results.map((c) => ({ at: entered(c, "outcome")?.at }))]);
  const people = d.users.filter((u) => u.workTeam === "case" && !u.inactive && (leader || u.id === d.user.id));
  const outcomes = canSeeOutcome(d.user) || d.user.workTeam === "case";

  return (
    <div>
      <PageHeader eyebrow="Case Manager Team" title="Case Manager" description="From document collection to submission and the result. Problems and holds show here so nothing is forgotten." actions={<RangePicker state={r} />} />
      {forMe.length > 0 && (
        <Link href="/cases?waiting=1" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-[0.9375rem] font-semibold hover:bg-brand-tint">
          <span>{forMe.length} {forMe.length === 1 ? "case is" : "cases are"} waiting for you to accept</span><span className="text-brand-deep">Open</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Received from Sales" value={received.length} hint={range.label} />
        <Kpi label="Accepted" value={accepted.length} hint="Taken from the pool" />
        <Kpi label="Submitted" value={submitted.length} hint={toSubmit === null ? "No submissions" : `Average ${toSubmit.toFixed(1)} days from receipt`} />
        <Kpi label="Awaiting result" value={awaiting.length} hint="Submitted, no decision yet" />
        {outcomes && <Kpi label="Approved" value={approved} tone="good" hint={range.label} />}
        {outcomes && <Kpi label="Denied" value={denied} tone={denied ? "danger" : "default"} hint={range.label} />}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2"><BarChart title={`Submissions and results · ${range.label}`} data={chart} names={["Submitted", "Results logged"]} /></Panel>
        <Panel title="Awaiting result" description="Submitted applications, oldest first." flush>
          {awaiting.length === 0 ? <EmptyState title="Nothing waiting" body="Submitted cases appear here until the result is logged." /> : (
            <ul className="divide-y divide-line">
              {awaiting.map((c) => {
                const last = c.submissionLog?.[c.submissionLog.length - 1];
                return (
                  <li key={c.id}><Link href={`/cases/${c.id}`} className="block px-5 py-3 hover:bg-brand-tint">
                    <p className="font-medium">{d.clients.find((x) => x.id === c.clientId)?.name} <span className="text-sm font-normal text-ink-muted">· {c.ref}</span></p>
                    <p className="text-sm text-ink-muted">Submitted {c.submittedAt ? fmtDateTime(c.submittedAt) : "—"} · {daysSince(c.submittedAt)} days ago</p>
                    {last && <p className="text-sm">{SUBMISSION_LABEL[last.status]}</p>}
                  </Link></li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={leader ? "Pipeline" : "My pipeline"} description={`Cases with the Case Manager team that had activity in ${range.label.toLowerCase()}, by step.`} flush>
          <div className="p-4"><PipelineBoard columns={columnsFor(inCm, CM_STAGES, "Waiting to be accepted")} /></div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Problems and holds" description={`Why a case stopped, who recorded it, and since when · ${range.label}`} flush>
          {problems.length === 0 ? <EmptyState title="No open problems" body="Problems recorded on a case appear here until they are resolved." /> : (
            <ul className="divide-y divide-line">
              {problems.map((c) => {
                const issue = openIssues(c)[0];
                return (
                  <li key={c.id}><Link href={`/cases/${c.id}?tab=problems`} className="block px-5 py-3 hover:bg-brand-tint">
                    <p className="flex flex-wrap items-center gap-2 font-medium">{d.clients.find((x) => x.id === c.clientId)?.name}{c.status === "on_hold" && <Pill tone="warning">{heldByClient(c) ? "On hold by client" : "On hold"}</Pill>}{issue && <Pill tone="neutral">{ISSUE_LABEL[issue.kind]}</Pill>}</p>
                    <p className="text-sm">{issue?.text ?? c.endReason}</p>
                    <p className="text-xs text-ink-muted">{issue ? `${issue.by} · ${fmtDate(issue.at)} · open ${daysSince(issue.at)} days` : ""} · {c.ref}</p>
                  </Link></li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Waiting on third parties" description="Open partner tasks on these cases." flush>
          {blockedBy.length === 0 ? <EmptyState title="Nothing outstanding" body="Open partner tasks appear here." /> : (
            <ul className="divide-y divide-line">
              {blockedBy.map((t) => (
                <li key={t.id} className="px-5 py-3">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-ink-muted">{t.partner} · {t.progress}% done · due {fmtDate(t.deadline)}{deadlineState(t.deadline) === "overdue" ? " · overdue" : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={leader ? "Team workload" : "My workload"} flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-[0.9375rem]">
              <caption className="sr-only">Case Manager workload</caption>
              <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Person</th><th scope="col" className={th}>Holding now</th><th scope="col" className={th}>Submitted</th><th scope="col" className={th}>Overdue</th><th scope="col" className={th}>Open problems</th></tr></thead>
              <tbody className="divide-y divide-line">
                {people.map((u) => {
                  const holding = inCm.filter((c) => c.consultantId === u.id && c.status === "active");
                  const late = holding.filter((c) => deadlineState(c.deadline) === "overdue").length;
                  const probs = holding.reduce((s, c) => s + openIssues(c).length, 0);
                  return (
                    <tr key={u.id}>
                      <td className={td}><div className="flex items-center gap-2"><Avatar name={u.name} /><span className="font-medium">{u.name}</span></div></td>
                      <td className={`${td} tabular-nums`}>{holding.length}</td>
                      <td className={`${td} tabular-nums`}>{submitted.filter((c) => c.caseManagerId === u.id).length}</td>
                      <td className={td}>{late ? <Pill tone="danger">{late} overdue</Pill> : <span className="text-ink-muted">None</span>}</td>
                      <td className={td}>{probs ? <Pill tone="warning">{probs}</Pill> : <span className="text-ink-muted">None</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-5"><TeamCases cases={[...own.filter((c) => inPeriod(c, range)), ...forMe]} owner="case" title={leader ? `Case Manager cases · ${range.label}` : `My cases · ${range.label}`} /></div>
    </div>
  );
}
