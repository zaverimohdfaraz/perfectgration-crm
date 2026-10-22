"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { DaysBadge, DeadlineBadge, StageBadge, StatusBadge, VisaBadge } from "@/components/status";
import { IntakeDialog } from "@/components/dialogs-cases";
import { useDemo } from "@/lib/store";
import { STAGES, STATUS_LABEL, VISA_TYPES, LEAD_SOURCES, stageNumber, userById, visaLabel, type CaseStatus } from "@/lib/demo-data";
import { canAddCases, displayStatus } from "@/lib/permissions";
import { daysBetween, deadlineState } from "@/lib/dates";
import { btn, field, td, th } from "@/lib/styles";

type SortKey = "client" | "stage" | "days" | "deadline";
type SP = { q?: string; stage?: string; visa?: string; status?: string; consultant?: string; attention?: string; source?: string };

export default function CasesPage({ searchParams }: { searchParams: SP }) {
  const d = useDemo();
  const [q, setQ] = useState(searchParams.q ?? "");
  const [stage, setStage] = useState(searchParams.stage ?? "");
  const [visa, setVisa] = useState(searchParams.visa ?? "");
  const [status, setStatus] = useState(searchParams.status ?? "");
  const [consultant, setConsultant] = useState(searchParams.consultant ?? "");
  const [source, setSource] = useState(searchParams.source ?? "");
  const [attention, setAttention] = useState(searchParams.attention === "urgent");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "deadline", dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [creating, setCreating] = useState(false);

  const clientName = (id: string) => d.clients.find((c) => c.id === id)?.name ?? "";
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return d.visible.filter((c) => {
      if (needle && ![clientName(c.clientId), c.ref, visaLabel(c.visa), userById(c.consultantId)?.name ?? ""].join(" ").toLowerCase().includes(needle)) return false;
      if (stage && c.stage !== stage) return false;
      if (visa && c.visa !== visa) return false;
      if (status && c.status !== status) return false;
      if (consultant && c.consultantId !== consultant) return false;
      if (source && c.leadSource !== source) return false;
      if (attention && !(c.status === "active" && (daysBetween(c.stageSince) > 21 || deadlineState(c.deadline) === "overdue"))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.visible, d.clients, q, stage, visa, status, consultant, source, attention]);

  const sorted = useMemo(() => {
    const val = (c: (typeof filtered)[number]): string | number => {
      if (sort.key === "client") return clientName(c.clientId).toLowerCase();
      if (sort.key === "stage") return stageNumber(c.stage);
      if (sort.key === "days") return daysBetween(c.stageSince);
      return c.deadline ?? "9999";
    };
    return [...filtered].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, d.clients]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const active = [q && `“${q}”`, stage && STAGES.find((s) => s.id === stage)?.label, visa && visaLabel(visa as never), status && STATUS_LABEL[status as CaseStatus], consultant && userById(consultant)?.name, source, attention && "Urgent only"].filter(Boolean) as string[];

  const clear = () => { setQ(""); setStage(""); setVisa(""); setStatus(""); setConsultant(""); setSource(""); setAttention(false); setPage(1); };
  const on = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const SortBtn = ({ k, children }: { k: SortKey; children: string }) => (
    <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-semibold hover:text-ink" aria-label={`Sort by ${children}`}>
      {children}{sort.key === k && (sort.dir === 1 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />)}
    </button>
  );
  const ariaSort = (k: SortKey) => (sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none");
  const staff = d.users.filter((u) => u.role === "consultant");

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Cases" description={`${sorted.length} ${sorted.length === 1 ? "case" : "cases"} match your view.`}
        actions={canAddCases(d.user) ? <Button onClick={() => setCreating(true)}><Plus size={18} aria-hidden /> New case</Button> : undefined} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="md:col-span-3 xl:col-span-2">
          <label htmlFor="f-q" className="mb-1 block text-sm font-semibold">Search</label>
          <input id="f-q" className={field} value={q} onChange={(e) => on(setQ)(e.target.value)} placeholder="Client, case number, visa or consultant" />
        </div>
        <div><label htmlFor="f-stage" className="mb-1 block text-sm font-semibold">Stage</label><select id="f-stage" className={field} value={stage} onChange={(e) => on(setStage)(e.target.value)}><option value="">All stages</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div><label htmlFor="f-visa" className="mb-1 block text-sm font-semibold">Visa type</label><select id="f-visa" className={field} value={visa} onChange={(e) => on(setVisa)(e.target.value)}><option value="">All visa types</option>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></div>
        <div><label htmlFor="f-status" className="mb-1 block text-sm font-semibold">Status</label><select id="f-status" className={field} value={status} onChange={(e) => on(setStatus)(e.target.value)}><option value="">All statuses</option>{(Object.keys(STATUS_LABEL) as CaseStatus[]).filter((s) => d.user.role === "admin" || (s !== "approved" && s !== "refused")).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
        {d.user.role !== "consultant" ? (
          <div><label htmlFor="f-cons" className="mb-1 block text-sm font-semibold">Consultant</label><select id="f-cons" className={field} value={consultant} onChange={(e) => on(setConsultant)(e.target.value)}><option value="">All consultants</option>{staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        ) : (
          <div><label htmlFor="f-src" className="mb-1 block text-sm font-semibold">Lead source</label><select id="f-src" className={field} value={source} onChange={(e) => on(setSource)(e.target.value)}><option value="">All sources</option>{LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
        )}
      </form>

      {active.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {active.map((a) => <span key={a} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium">{a}</span>)}
          <button type="button" onClick={clear} className="min-h-9 px-2 text-sm font-semibold text-brand-deep hover:underline">Clear all</button>
        </div>
      )}

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState title="No cases match these filters" body="Try a different stage or visa type, or clear the filters to see everything you can access.">
            <button type="button" onClick={clear} className={btn.secondary}>Clear filters</button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[880px] text-[15px]">
                <caption className="sr-only">Cases</caption>
                <thead className="border-b border-line bg-brand-tint">
                  <tr>
                    <th scope="col" className={th} aria-sort={ariaSort("client")}><SortBtn k="client">Client</SortBtn></th>
                    <th scope="col" className={th}>Visa</th>
                    <th scope="col" className={th} aria-sort={ariaSort("stage")}><SortBtn k="stage">Stage</SortBtn></th>
                    <th scope="col" className={th}>Consultant</th>
                    <th scope="col" className={th}>Status</th>
                    <th scope="col" className={th} aria-sort={ariaSort("days")}><SortBtn k="days">Time in stage</SortBtn></th>
                    <th scope="col" className={th} aria-sort={ariaSort("deadline")}><SortBtn k="deadline">Deadline</SortBtn></th>
                    <th scope="col" className={th}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => {
                    const st = displayStatus(d.user, c);
                    return (
                      <tr key={c.id} className="hover:bg-brand-tint/50">
                        <td className={td}><Link href={`/cases/${c.id}`} className="font-semibold hover:text-brand-deep hover:underline">{clientName(c.clientId)}</Link><p className="text-sm text-ink-muted">{c.ref}</p></td>
                        <td className={td}><VisaBadge visa={c.visa} /></td>
                        <td className={td}><StageBadge stage={c.stage} /></td>
                        <td className={td}>{userById(c.consultantId)?.name}</td>
                        <td className={td}><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /></td>
                        <td className={td}><DaysBadge days={daysBetween(c.stageSince)} /></td>
                        <td className={td}><DeadlineBadge iso={c.deadline} /></td>
                        <td className={`${td} text-right`}><Link href={`/cases/${c.id}`} className={`${btn.ghost} !min-h-9`}>View</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-px bg-line sm:grid-cols-2 xl:hidden">
              {rows.map((c) => {
                const st = displayStatus(d.user, c);
                return (
                  <li key={c.id} className="bg-white">
                    <Link href={`/cases/${c.id}`} className="block h-full space-y-2.5 p-4 hover:bg-brand-tint/50">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{clientName(c.clientId)}</p><p className="text-sm text-ink-muted">{c.ref}</p></div><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /></div>
                      <div className="flex flex-wrap gap-2"><VisaBadge visa={c.visa} /><StageBadge stage={c.stage} /></div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><DaysBadge days={daysBetween(c.stageSince)} /><DeadlineBadge iso={c.deadline} /></div>
                      <p className="text-sm text-ink-muted">Consultant: {userById(c.consultantId)?.name}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager page={safePage} pageSize={pageSize} total={sorted.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </>
        )}
      </Panel>

      {creating && <IntakeDialog mode="case" onClose={() => setCreating(false)} />}
    </div>
  );
}
