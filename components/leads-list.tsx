"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "./ui";
import { Pill, VisaBadge } from "./status";
import { Pager } from "./pagination";
import { useDemo } from "@/lib/store";
import { LEAD_SOURCES, STAGE_OWNER, visaLabel, type Case, type User } from "@/lib/demo-data";
import { entered, enteredIn, type Range } from "@/lib/analytics";
import { canSeeCase } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/dates";
import { field, td, th } from "@/lib/styles";

/** Leads that came in from lead forms are created by these system names, not by a person. */
const SYSTEM_SOURCES: Record<string, string> = { sys_meta_leads: "Facebook lead form", sys_google_leads: "Google Ads lead form" };

/** When the lead came in: the moment it was created. */
const cameIn = (c: Case) => entered(c, "lead")?.at ?? c.history[0]?.at ?? c.updatedAt;

type GoneTo = { kind: "person"; user?: User; auto: boolean } | { kind: "waiting"; label: string } | { kind: "passed" } | { kind: "social" } | { kind: "closed" };

function goneTo(c: Case, users: User[]): GoneTo {
  // A team member's own copy of a lead they passed on does not say who took it (by design).
  if (c.pastWork) return { kind: "passed" };
  if (c.route?.to === "sales") return { kind: "waiting", label: c.route.kind === "visa" ? `Waiting in the ${visaLabel(c.route.visa ?? c.visa)} team` : "Waiting in the Sales Team" };
  const open = c.status === "active" || c.status === "on_hold";
  // Where the lead really is comes first: a lead still at Lead Intake has not gone to anyone yet.
  if (open && STAGE_OWNER[c.stage] === "social") return { kind: "social" };
  if (c.salesId) return { kind: "person", user: users.find((u) => u.id === c.salesId), auto: !!c.autoShared };
  return open ? { kind: "passed" } : { kind: "closed" };
}

const nowLabel = (c: Case) =>
  c.pastWork ? "With the next team"
    : c.status !== "active" && c.status !== "on_hold" ? "Closed"
      : STAGE_OWNER[c.stage] === "social" ? "With Social Media" : STAGE_OWNER[c.stage] === "sales" ? "With Sales" : "With Case Manager";

function GoneToCell({ g }: { g: GoneTo }) {
  if (g.kind === "person") return <><p className="font-medium text-ink">{g.user?.name ?? "Sales member"}</p><p className="text-sm text-ink-muted">{g.auto ? "Given automatically" : "Accepted"}</p></>;
  if (g.kind === "waiting") return <><Pill tone="warning">{g.label}</Pill><p className="mt-1 text-sm text-ink-muted">Not accepted yet</p></>;
  if (g.kind === "passed") return <p className="text-ink">Passed to Sales</p>;
  if (g.kind === "closed") return <p className="text-ink-muted">Closed before Sales</p>;
  return <Pill tone="neutral">Not passed yet</Pill>;
}

/**
 * Every lead that came in during the chosen period, newest first, with the date it came in,
 * where it came from, and the Sales person it went to. Paged, because there can be many.
 */
export function LeadsList({ cases, range, leader }: { cases: Case[]; range: Range; leader: boolean }) {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const clientName = (id: string) => d.clients.find((c) => c.id === id)?.name ?? "Client";
  const capturedBy = (c: Case) => SYSTEM_SOURCES[c.leadById] ?? d.users.find((u) => u.id === c.leadById)?.name ?? "—";
  const salesPeople = d.users.filter((u) => u.role === "consultant" && u.workTeam === "sales");

  const inRange = useMemo(() => cases.filter((c) => enteredIn(c, "lead", range)).sort((a, b) => cameIn(b).localeCompare(cameIn(a))), [cases, range]);
  const sources = [...new Set([...LEAD_SOURCES, ...inRange.map((c) => c.leadSource).filter(Boolean)])];

  const text = q.trim().toLowerCase();
  const rows = inRange.filter((c) => {
    if (source && c.leadSource !== source) return false;
    if (to) {
      const g = goneTo(c, d.users);
      if (to === "waiting" ? g.kind !== "waiting" : !(g.kind === "person" && c.salesId === to)) return false;
    }
    if (!text) return true;
    return [clientName(c.clientId), c.ref, c.campaign ?? "", c.leadSource, capturedBy(c)].join(" ").toLowerCase().includes(text);
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const shown = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const waitingCount = inRange.filter((c) => goneTo(c, d.users).kind === "waiting").length;
  const reset = (fn: () => void) => { fn(); setPage(1); };
  const canOpen = (c: Case) => !c.pastWork && (leader || canSeeCase(d.user, c));
  const Name = ({ c }: { c: Case }) => canOpen(c)
    ? <Link href={`/cases/${c.id}`} className="font-semibold text-ink hover:text-brand-deep hover:underline">{clientName(c.clientId)}</Link>
    : <span className="font-semibold text-ink">{clientName(c.clientId)}</span>;

  return (
    <Panel title="Leads list" flush
      description={`${inRange.length} lead${inRange.length === 1 ? "" : "s"} came in · ${range.label}${waitingCount ? ` · ${waitingCount} waiting to be accepted` : ""}`}>
      <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-ink">Search
          <input className={`${field} mt-1`} value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Client, case number or campaign" />
        </label>
        <label className="block text-sm font-semibold text-ink">Source
          <select className={`${field} mt-1`} value={source} onChange={(e) => reset(() => setSource(e.target.value))}>
            <option value="">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {leader && (
          <label className="block text-sm font-semibold text-ink">Went to
            <select className={`${field} mt-1`} value={to} onChange={(e) => reset(() => setTo(e.target.value))}>
              <option value="">Everyone</option>
              <option value="waiting">Waiting to be accepted</option>
              {salesPeople.map((u) => <option key={u.id} value={u.id}>{u.name}{u.inactive ? " (switched off)" : ""}</option>)}
            </select>
          </label>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{inRange.length ? "No leads match these filters." : "No leads came in during this period."}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-[0.9375rem]">
              <caption className="sr-only">Leads that came in, newest first</caption>
              <thead className="border-b border-line bg-brand-tint">
                <tr>
                  <th scope="col" className={th}>Came in</th>
                  <th scope="col" className={th}>Lead</th>
                  <th scope="col" className={th}>Source</th>
                  <th scope="col" className={th}>Visa</th>
                  <th scope="col" className={th}>Went to (Sales)</th>
                  <th scope="col" className={th}>Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => {
                  const reached = entered(c, "firstcall")?.at;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-brand-tint/60">
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{fmtDateTime(cameIn(c))}</td>
                      <td className={td}><Name c={c} /><p className="mt-0.5 text-sm text-ink-muted">{c.ref}</p></td>
                      <td className={td}><p className="text-ink">{c.leadSource || "—"}</p><p className="mt-0.5 text-sm text-ink-muted">{c.campaign ? `${c.campaign} · ` : ""}by {capturedBy(c)}</p></td>
                      <td className={td}><VisaBadge visa={c.visa} /></td>
                      <td className={td}><GoneToCell g={goneTo(c, d.users)} />{reached && !c.pastWork && <p className="text-xs text-ink-muted">Sent {fmtDateTime(reached)}</p>}</td>
                      <td className={`${td} whitespace-nowrap`}>{nowLabel(c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {shown.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div><Name c={c} /><p className="text-sm text-ink-muted">{c.ref} · {fmtDateTime(cameIn(c))}</p></div>
                  <VisaBadge visa={c.visa} />
                </div>
                <p className="mt-2 text-sm text-ink-muted">{c.leadSource || "—"}{c.campaign ? ` · ${c.campaign}` : ""} · by {capturedBy(c)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span className="text-ink-muted">Went to:</span><GoneToCell g={goneTo(c, d.users)} /></div>
                <p className="mt-1 text-sm text-ink-muted">Now: {nowLabel(c)}</p>
              </li>
            ))}
          </ul>

          <div className="border-t border-line px-5 py-3">
            <Pager page={safePage} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} sizes={[25, 50, 100]} />
          </div>
        </>
      )}
      {!leader && <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Once a lead is passed on, only the administrator and managers can see which Sales person took it.</p>}
    </Panel>
  );
}
