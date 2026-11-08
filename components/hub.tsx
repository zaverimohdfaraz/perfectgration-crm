"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Pill, StatusBadge, VisaBadge } from "./status";
import { Avatar, EmptyState } from "./ui";
import { useDemo } from "@/lib/store";
import { PRIORITY_LABEL, STAGE_OWNER, stageLabel, waitingLabel, type Case, type StageId, type StageOwner } from "@/lib/demo-data";
import { displayStatus } from "@/lib/permissions";
import { openIssues } from "@/lib/case-logic";
import { heldByClient } from "@/lib/permissions";
import { daysSince, makeRange, type Range, type RangeKey } from "@/lib/analytics";
import { deadlineState, fmtSar } from "@/lib/dates";
import { field, td, th } from "@/lib/styles";

/* ─── Date range: today, this week, this month, or a custom range ─── */
export function useRange(initial: RangeKey = "month") {
  const [key, setKey] = useState<RangeKey>(initial);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = useMemo(() => makeRange(key, custom), [key, custom]);
  return { range, key, setKey, custom, setCustom };
}

export function RangePicker({ state }: { state: ReturnType<typeof useRange> }) {
  const opts: { id: RangeKey; label: string }[] = [
    { id: "today", label: "Today" }, { id: "week", label: "This week" }, { id: "month", label: "This month" }, { id: "custom", label: "Custom" },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-line bg-white p-0.5">
        {opts.map((o) => (
          <button key={o.id} type="button" aria-pressed={state.key === o.id} onClick={() => state.setKey(o.id)}
            className={`min-h-10 rounded-md px-3 text-sm font-semibold ${state.key === o.id ? "bg-brand text-ink-on" : "text-ink-muted hover:bg-brand-tint hover:text-ink"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {state.key === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-ink-muted">From<input type="date" className={`${field} mt-1 h-10 w-40`} value={state.custom.from} onChange={(e) => state.setCustom({ ...state.custom, from: e.target.value })} /></label>
          <label className="text-sm font-medium text-ink-muted">To<input type="date" className={`${field} mt-1 h-10 w-40`} value={state.custom.to} onChange={(e) => state.setCustom({ ...state.custom, to: e.target.value })} /></label>
        </div>
      )}
    </div>
  );
}

/* ─── KPI tiles: a few honest numbers, each with what it counts ─── */
export function Kpi({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "warning" | "danger" | "good" }) {
  const t = { default: "text-ink", warning: "text-amber-900", danger: "text-red-800", good: "text-green-800" }[tone];
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white p-4">
      <p className="truncate text-sm font-medium text-ink-muted">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold tabular-nums ${t}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ─── Small grouped bar chart (one or two series), with a table view for screen readers ─── */
const SERIES_COLORS = ["#0284C7", "#D97706"];

export function BarChart({ title, data, names }: { title: string; data: { label: string; values: number[] }[]; names: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const total = names.map((_, i) => data.reduce((s, d) => s + d.values[i], 0));
  const every = data.length > 16 ? Math.ceil(data.length / 8) : 1;
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {names.length > 1 ? (
          <span className="flex flex-wrap gap-3 text-xs text-ink-muted">
            {names.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLORS[i] }} />{n} · <strong className="text-ink">{total[i]}</strong></span>)}
          </span>
        ) : <span className="text-xs text-ink-muted">Total <strong className="text-ink">{total[0]}</strong></span>}
      </figcaption>
      <div className="relative" aria-hidden>
        <div className="flex h-36 items-end gap-[2px] border-b border-line">
          {data.map((d, i) => (
            <div key={i} className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t hover:bg-brand-tint/60" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {d.values.map((v, j) => (
                <div key={j} className="w-full max-w-4 rounded-t-[4px]" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0, background: SERIES_COLORS[j] }} />
              ))}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-line bg-white px-2 py-1 text-xs shadow-md">
                  <p className="font-semibold">{d.label}</p>
                  {names.map((n, j) => <p key={n}>{n}: <strong>{d.values[j]}</strong></p>)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px]">
          {data.map((d, i) => <span key={i} className="min-w-0 flex-1 truncate text-center text-[0.6875rem] text-ink-muted">{i % every === 0 ? d.label : ""}</span>)}
        </div>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Period</th>{names.map((n) => <th key={n}>{n}</th>)}</tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><td>{d.label}</td>{d.values.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}

/* ─── Pipeline board (like a sales pipeline): one column per step ─── */
export type BoardColumn = { id: string; label: string; cases: Case[]; tone?: "waiting" };

export function PipelineBoard({ columns, money }: { columns: BoardColumn[]; money?: (c: Case) => number | undefined }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-3">
        {columns.map((col) => {
          const sum = money ? col.cases.reduce((s, c) => s + (money(c) ?? 0), 0) : 0;
          return (
            <section key={col.id} aria-label={col.label} className={`flex w-64 shrink-0 flex-col rounded-xl border ${col.tone === "waiting" ? "border-amber-300 bg-amber-50/60" : "border-line bg-brand-tint/50"}`}>
              <header className="border-b border-line px-3 py-2.5">
                <p className="flex items-center justify-between gap-2 text-sm font-semibold"><span className="truncate">{col.label}</span><span className="rounded-full bg-white px-2 text-xs ring-1 ring-line">{col.cases.length}</span></p>
                {money && <p className="text-xs text-ink-muted">{sum ? fmtSar(sum) : "No value yet"}</p>}
              </header>
              <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto p-2">
                {col.cases.length === 0 && <li className="px-2 py-4 text-center text-xs text-ink-muted">Nothing here</li>}
                {col.cases.map((c) => <li key={c.id}><BoardCard c={c} money={money?.(c)} /></li>)}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ c, money }: { c: Case; money?: number }) {
  const d = useDemo();
  const client = d.clients.find((x) => x.id === c.clientId)?.name ?? "Client";
  const owner = d.users.find((u) => u.id === c.consultantId)?.name;
  const days = daysSince(c.stageSince);
  const late = c.status === "active" && deadlineState(c.deadline) === "overdue";
  const issues = openIssues(c).length;
  return (
    <Link href={`/cases/${c.id}`} className={`block rounded-lg border bg-white p-3 hover:border-brand ${late ? "border-red-300" : "border-line"}`}>
      <p className="truncate text-sm font-semibold">{client}</p>
      <p className="truncate text-xs text-ink-muted">{c.ref} · {owner ?? (c.route ? waitingLabel(c, true) : "Unassigned")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <VisaBadge visa={c.visa} />
        {c.priority !== "normal" && <Pill tone={c.priority === "urgent" ? "danger" : "warning"}>{PRIORITY_LABEL[c.priority]}</Pill>}
        {c.status !== "active" && <Pill tone="warning">{c.status === "on_hold" ? (heldByClient(c) ? "On hold by client" : "On hold") : "Closed"}</Pill>}
        {c.autoShared && c.status === "active" && <Pill tone="info">Shared · not started</Pill>}
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-ink-muted">
        <span className={late ? "font-semibold text-red-800" : ""}>{days} {days === 1 ? "day" : "days"} in step{late ? " · overdue" : ""}</span>
        {money ? <span className="font-semibold text-ink">{fmtSar(money)}</span> : null}
      </p>
      {issues > 0 && <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">{issues} open {issues === 1 ? "problem" : "problems"}</p>}
    </Link>
  );
}

/* ─── Every case for a team, grouped by status ─── */
type Bucket = "active" | "waiting" | "hold" | "problems" | "closed" | "all";

export function TeamCases({ cases, owner, title = "Cases" }: { cases: Case[]; owner?: StageOwner; title?: string }) {
  const d = useDemo();
  const [bucket, setBucket] = useState<Bucket>("active");
  const mine = owner ? cases.filter((c) => STAGE_OWNER[c.stage] === owner) : cases;
  const test: Record<Bucket, (c: Case) => boolean> = {
    active: (c) => c.status === "active" && !c.route,
    waiting: (c) => c.status === "active" && !!c.route,
    hold: (c) => c.status === "on_hold",
    problems: (c) => openIssues(c).length > 0,
    closed: (c) => c.status !== "active" && c.status !== "on_hold",
    all: () => true,
  };
  const tabs: { id: Bucket; label: string }[] = [
    { id: "active", label: "In progress" }, { id: "waiting", label: "Waiting to be accepted" }, { id: "hold", label: "On hold" },
    { id: "problems", label: "With problems" }, { id: "closed", label: "Closed" }, { id: "all", label: "All" },
  ];
  const rows = mine.filter(test[bucket]).sort((a, b) => a.stageSince.localeCompare(b.stageSince));

  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div role="tablist" aria-label="Case status" className="flex flex-wrap gap-1">
          {tabs.map((t) => {
            const n = mine.filter(test[t.id]).length;
            return (
              <button key={t.id} role="tab" type="button" aria-selected={bucket === t.id} onClick={() => setBucket(t.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold ${bucket === t.id ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-brand-tint"}`}>
                {t.label}<span className="rounded-full bg-white px-1.5 text-xs ring-1 ring-line">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
      {rows.length === 0 ? <EmptyState title="No cases in this group" body="Try another tab." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-[0.9375rem]">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Client</th><th scope="col" className={th}>Step</th><th scope="col" className={th}>Responsible</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Problem or reason</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const st = displayStatus(d.user, c);
                const issue = openIssues(c)[0];
                const owner = d.users.find((u) => u.id === c.consultantId);
                return (
                  <tr key={c.id} className="hover:bg-brand-tint/50">
                    <td className={td}><Link href={`/cases/${c.id}`} className="font-semibold hover:text-brand-deep hover:underline">{d.clients.find((x) => x.id === c.clientId)?.name}</Link><p className="text-sm text-ink-muted">{c.ref}</p></td>
                    <td className={td}>{stageLabel(c.stage)}<p className="text-sm text-ink-muted">{daysSince(c.stageSince)} days</p></td>
                    <td className={td}><div className="flex items-center gap-2">{owner ? <><Avatar name={owner.name} /><span>{owner.name}</span></> : <span className="text-ink-muted">{c.route ? waitingLabel(c) : "—"}</span>}</div></td>
                    <td className={td}><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /></td>
                    <td className={`${td} max-w-xs text-sm`}>{issue ? <span>{issue.text}</span> : c.endReason ? <span className="text-ink-muted">{c.endReason}</span> : <span className="text-ink-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const columnsFor = (cases: Case[], stages: StageId[], waitingLabel?: string): BoardColumn[] => [
  ...(waitingLabel ? [{ id: "waiting", label: waitingLabel, cases: cases.filter((c) => c.status === "active" && !!c.route && stages.includes(c.stage)), tone: "waiting" as const }] : []),
  ...stages.map((s) => ({ id: s, label: stageLabel(s), cases: cases.filter((c) => c.stage === s && !c.route && (c.status === "active" || c.status === "on_hold")) })),
];

export type { Range };
