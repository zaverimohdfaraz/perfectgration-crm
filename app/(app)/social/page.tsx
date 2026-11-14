"use client";

import { useState } from "react";
import { Plus } from "@/components/icons";
import { PageHeader, Panel, Avatar, Button } from "@/components/ui";
import { BarChart, Kpi, RangePicker, TeamCases, useRange } from "@/components/hub";
import { IntakeDialog } from "@/components/dialogs-cases";
import { AdsPanel } from "@/components/ads-panel";
import { LeadsList } from "@/components/leads-list";
import { SheetStatus } from "@/components/sheet-status";
import { useDemo } from "@/lib/store";
import { LEAD_SOURCES, STAGE_OWNER, type Case } from "@/lib/demo-data";
import { avg, entered, enteredIn, fmtHours, hoursBetween, inPeriod, pct, series } from "@/lib/analytics";
import { canAddCases, myWork } from "@/lib/permissions";
import { td, th } from "@/lib/styles";

const status = (c: Case) => (c.status !== "active" && c.status !== "on_hold" ? "Closed" : STAGE_OWNER[c.stage] === "social" ? "With Social Media" : STAGE_OWNER[c.stage] === "sales" ? "With Sales" : "With Case Manager");

export default function SocialPage() {
  const d = useDemo();
  const r = useRange("month");
  const range = r.range;
  const [adding, setAdding] = useState(false);
  const leader = d.user.role !== "consultant";

  // Social Media sees its own leads while it holds them; leaders see every lead's journey.
  const all = leader ? d.cases : myWork(d.user, d.cases).filter((c) => c.leadById === d.user.id);
  const created = all.filter((c) => enteredIn(c, "lead", range));
  const passed = all.filter((c) => enteredIn(c, "firstcall", range));
  const waiting = all.filter((c) => c.stage === "lead" && c.status === "active" && inPeriod(c, range));
  const toDeal = created.filter((c) => !!entered(c, "advance"));
  const passTime = avg(passed.map((c) => hoursBetween(entered(c, "lead")?.at, entered(c, "firstcall")?.at)));
  const chart = series(range, [created.map((c) => ({ at: entered(c, "lead")?.at })), passed.map((c) => ({ at: entered(c, "firstcall")?.at }))]);
  const sources = LEAD_SOURCES.map((s) => {
    const list = created.filter((c) => c.leadSource === s);
    return { s, n: list.length, passed: list.filter((c) => !!entered(c, "firstcall")).length, deals: list.filter((c) => !!entered(c, "advance")).length };
  }).filter((x) => x.n > 0);
  const campaigns = [...new Set(created.map((c) => c.campaign).filter(Boolean))] as string[];
  const people = d.users.filter((u) => u.workTeam === "social" && !u.inactive && (leader || u.id === d.user.id));

  return (
    <div>
      <PageHeader eyebrow="Social Media Team" title="Social Media" description="Leads captured from ads and social channels, and how quickly they reach Sales."
        actions={<div className="flex flex-wrap items-end gap-2"><RangePicker state={r} />{canAddCases(d.user) && <Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden /> New lead</Button>}</div>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Leads created" value={created.length} hint={range.label} />
        <Kpi label="Passed to Sales" value={passed.length} hint={`Average time to pass ${fmtHours(passTime)}`} />
        <Kpi label="Not passed yet" value={waiting.length} tone={waiting.length ? "warning" : "default"} hint="Still with Social Media" />
        {leader && <Kpi label="Reached a deal" value={toDeal.length} hint={`${pct(toDeal.length, created.length)} of leads created`} tone="good" />}
        <Kpi label="Sources used" value={sources.length} hint={`${campaigns.length} tagged campaigns`} />
      </div>

      <div className="mt-5"><Panel><BarChart title={`Leads created and passed to Sales · ${range.label}`} data={chart} names={["Leads created", "Passed to Sales"]} /></Panel></div>

      {leader && <div className="mt-5"><SheetStatus /></div>}
      <div className="mt-5"><LeadsList cases={all} range={range} leader={leader} /></div>

      <div className="mt-5"><AdsPanel range={range} cases={leader ? d.cases : all} leader={leader} /></div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Leads by source" description={range.label} flush>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.9375rem]">
              <caption className="sr-only">Leads by source</caption>
              <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Source</th><th scope="col" className={th}>Leads</th><th scope="col" className={th}>Passed</th>{leader && <><th scope="col" className={th}>Deals</th><th scope="col" className={th}>Conversion</th></>}</tr></thead>
              <tbody className="divide-y divide-line">
                {sources.length === 0 ? <tr><td className={td} colSpan={leader ? 5 : 3}><span className="text-ink-muted">No leads in this period.</span></td></tr> : sources.map((x) => (
                  <tr key={x.s}><td className={td}>{x.s}</td><td className={`${td} tabular-nums`}>{x.n}</td><td className={`${td} tabular-nums`}>{x.passed}</td>{leader && <><td className={`${td} tabular-nums`}>{x.deals}</td><td className={`${td} tabular-nums`}>{pct(x.deals, x.n)}</td></>}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={leader ? "Team" : "My leads"} description={range.label} flush>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.9375rem]">
              <caption className="sr-only">Social Media team</caption>
              <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Person</th><th scope="col" className={th}>Created</th><th scope="col" className={th}>Passed</th><th scope="col" className={th}>Not passed</th><th scope="col" className={th}>Avg time to pass</th></tr></thead>
              <tbody className="divide-y divide-line">
                {people.map((u) => {
                  const mine = created.filter((c) => c.leadById === u.id);
                  const mp = passed.filter((c) => c.leadById === u.id);
                  return (
                    <tr key={u.id}>
                      <td className={td}><div className="flex items-center gap-2"><Avatar name={u.name} /><span className="font-medium">{u.name}</span></div></td>
                      <td className={`${td} tabular-nums`}>{mine.length}</td>
                      <td className={`${td} tabular-nums`}>{mp.length}</td>
                      <td className={`${td} tabular-nums`}>{waiting.filter((c) => c.leadById === u.id).length}</td>
                      <td className={td}>{fmtHours(avg(mp.map((c) => hoursBetween(entered(c, "lead")?.at, entered(c, "firstcall")?.at))))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {leader && (
        <div className="mt-5">
          <Panel title="Where the leads are now" description={`Leads created in ${range.label.toLowerCase()}, by who holds them today.`}>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["With Social Media", "With Sales", "With Case Manager", "Closed"].map((label) => (
                <div key={label} className="rounded-lg border border-line p-3"><dt className="text-sm text-ink-muted">{label}</dt><dd className="text-2xl font-bold tabular-nums">{created.filter((c) => status(c) === label).length}</dd></div>
              ))}
            </dl>
          </Panel>
        </div>
      )}

      <div className="mt-5"><TeamCases cases={(leader ? d.cases : d.visible).filter((c) => inPeriod(c, range))} owner="social" title={`${leader ? "Leads with Social Media" : "My leads"} · ${range.label}`} /></div>
      {adding && <IntakeDialog mode="case" onClose={() => setAdding(false)} />}
    </div>
  );
}
