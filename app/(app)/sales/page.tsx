"use client";

import Link from "next/link";
import { PageHeader, Panel, Avatar, EmptyState } from "@/components/ui";
import { Pill } from "@/components/status";
import { BarChart, Kpi, PipelineBoard, RangePicker, TeamCases, columnsFor, useRange } from "@/components/hub";
import { useDemo } from "@/lib/store";
import { STAGE_OWNER, type Case, type StageId } from "@/lib/demo-data";
import { avg, claimIn, daysSince, entered, enteredIn, fmtHours, hoursBetween, inPeriod, inRange, pct, series } from "@/lib/analytics";
import { openIssues } from "@/lib/case-logic";
import { claimable, myWork } from "@/lib/permissions";
import { deadlineState, fmtDateTime, fmtSar } from "@/lib/dates";
import { td, th } from "@/lib/styles";

const SALES_STAGES: StageId[] = ["firstcall", "docassess", "appointment", "deal", "advance"];
const value = (c: Case) => c.dealFeeSar ?? c.budget;

export default function SalesPage() {
  const d = useDemo();
  const r = useRange("month");
  const range = r.range;
  const leader = d.user.role !== "consultant";

  // A team member sees only their own work here. Leaders see the whole team.
  const reached = myWork(d.user, d.cases).filter((c) => !!entered(c, "firstcall") && (leader || c.salesId === d.user.id));
  const own = leader ? d.visible : d.visible.filter((c) => !c.route && c.consultantId === d.user.id);
  // Everything below follows the date filter: cases with any activity, appointment or deadline in the period.
  const inSales = own.filter((c) => STAGE_OWNER[c.stage] === "sales" && inPeriod(c, range));
  const forMe = leader ? [] : claimable(d.user, d.cases);

  const received = reached.filter((c) => enteredIn(c, "firstcall", range));
  const accepted = reached.filter((c) => claimIn(c, "sales", range));
  const deals = reached.filter((c) => enteredIn(c, "advance", range));
  const feesIn = reached.filter((c) => enteredIn(c, "doccollect", range));
  const feeSum = feesIn.reduce((s, c) => s + (c.feesCollectedSar ?? 0), 0);
  const pipeline = inSales.filter((c) => c.status === "active").reduce((s, c) => s + (value(c) ?? 0), 0);
  const overdue = inSales.filter((c) => c.status === "active" && deadlineState(c.deadline) === "overdue").length;
  const response = avg(reached.filter((c) => inRange(entered(c, "firstcall")?.at, range)).map((c) => {
    const claim = c.history.find((h) => h.kind === "claim" && STAGE_OWNER[h.to] === "sales");
    return hoursBetween(entered(c, "firstcall")?.at, claim?.at ?? (c.claimedAt && STAGE_OWNER[c.stage] === "sales" ? c.claimedAt : undefined));
  }));

  const chart = series(range, [received.map((c) => ({ at: entered(c, "firstcall")?.at })), deals.map((c) => ({ at: entered(c, "advance")?.at }))]);
  const appointments = inSales.filter((c) => c.status === "active" && inRange(c.appointmentAt, range)).sort((a, b) => a.appointmentAt!.localeCompare(b.appointmentAt!));
  const people = d.users.filter((u) => u.workTeam === "sales" && !u.inactive && (leader || u.id === d.user.id));

  return (
    <div>
      <PageHeader eyebrow="Sales Team" title="Sales" description="Leads from Social Media through first call, document assessment, office appointment, deal and fees." actions={<RangePicker state={r} />} />
      {forMe.length > 0 && (
        <Link href="/cases?waiting=1" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-[0.9375rem] font-semibold hover:bg-brand-tint">
          <span>{forMe.length} {forMe.length === 1 ? "lead is" : "leads are"} waiting for you to accept</span><span className="text-brand-deep">Open</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Leads received" value={received.length} hint={range.label} />
        <Kpi label="Accepted" value={accepted.length} hint={`Average wait ${fmtHours(response)}`} />
        <Kpi label="Deals finalised" value={deals.length} hint={`Conversion ${pct(deals.length, received.length)}`} tone="good" />
        <Kpi label="Fees collected" value={fmtSar(feeSum)} hint={`${feesIn.length} passed to Case Manager`} />
        <Kpi label="Open pipeline value" value={fmtSar(pipeline)} hint="Deal fee, or budget if no deal yet" />
        <Kpi label="Overdue" value={overdue} tone={overdue ? "danger" : "default"} hint={`Past the deadline · ${range.label}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2"><BarChart title={`Leads received and deals finalised · ${range.label}`} data={chart} names={["Leads received", "Deals finalised"]} /></Panel>
        <Panel title="Office appointments" description={range.label} flush>
          {appointments.length === 0 ? <EmptyState title="No appointments in this period" body="Booked visits appear here." /> : (
            <ul className="divide-y divide-line">
              {appointments.map((c) => (
                <li key={c.id}><Link href={`/cases/${c.id}`} className="block px-5 py-3 hover:bg-brand-tint">
                  <p className="font-medium">{d.clients.find((x) => x.id === c.clientId)?.name}</p>
                  <p className="text-sm text-ink-muted">{fmtDateTime(c.appointmentAt!)} · {d.users.find((u) => u.id === c.consultantId)?.name ?? "Unassigned"}</p>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={leader ? "Pipeline" : "My pipeline"} description={`Leads with Sales that had activity in ${range.label.toLowerCase()}, by step. Values show the deal fee, or the client's budget before the deal.`} flush>
          <div className="p-4"><PipelineBoard columns={columnsFor(inSales, SALES_STAGES, "Waiting to be accepted")} money={value} /></div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={leader ? "Team performance" : "My performance"} description={`Deals and fees in ${range.label.toLowerCase()}, and what each person holds now.`} flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[0.9375rem]">
              <caption className="sr-only">Sales performance</caption>
              <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Person</th><th scope="col" className={th}>Holding now</th><th scope="col" className={th}>Accepted</th><th scope="col" className={th}>Deals</th><th scope="col" className={th}>Fees collected</th><th scope="col" className={th}>Overdue</th><th scope="col" className={th}>Open problems</th></tr></thead>
              <tbody className="divide-y divide-line">
                {people.map((u) => {
                  const holding = inSales.filter((c) => c.consultantId === u.id && c.status === "active");
                  const mineAccepted = reached.filter((c) => c.history.some((h) => h.kind === "claim" && h.actor === u.name && STAGE_OWNER[h.to] === "sales" && inRange(h.at, range)));
                  const mineDeals = deals.filter((c) => c.salesId === u.id);
                  const fees = feesIn.filter((c) => c.salesId === u.id).reduce((s, c) => s + (c.feesCollectedSar ?? 0), 0);
                  const late = holding.filter((c) => deadlineState(c.deadline) === "overdue").length;
                  const problems = holding.reduce((s, c) => s + openIssues(c).length, 0);
                  return (
                    <tr key={u.id}>
                      <td className={td}><div className="flex items-center gap-2"><Avatar name={u.name} /><span className="font-medium">{u.name}</span></div></td>
                      <td className={`${td} tabular-nums`}>{holding.length}</td>
                      <td className={`${td} tabular-nums`}>{mineAccepted.length}</td>
                      <td className={`${td} tabular-nums`}>{mineDeals.length}</td>
                      <td className={`${td} tabular-nums`}>{fmtSar(fees)}</td>
                      <td className={td}>{late ? <Pill tone="danger">{late} overdue</Pill> : <span className="text-ink-muted">None</span>}</td>
                      <td className={td}>{problems ? <Pill tone="warning">{problems}</Pill> : <span className="text-ink-muted">None</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-5"><TeamCases cases={[...own, ...forMe].filter((c) => inPeriod(c, range) || (!!c.route && !leader))} owner="sales" title={leader ? `Sales cases · ${range.label}` : `My cases · ${range.label}`} /></div>
      <p className="mt-3 text-sm text-ink-muted">Oldest lead {leader ? "with Sales" : "you hold"} in this period: {inSales.length ? `${Math.max(...inSales.map((c) => daysSince(c.stageSince)))} days in its current step` : "none"}.</p>
    </div>
  );
}
