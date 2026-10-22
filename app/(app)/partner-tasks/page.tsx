"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Panel, EmptyState, Button, ProgressBar } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { DeadlineBadge, Pill } from "@/components/status";
import { TaskDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { userById } from "@/lib/demo-data";
import { tasksFor } from "@/lib/insights";
import { deadlineState } from "@/lib/dates";
import { btn, field } from "@/lib/styles";

export default function PartnerTasksPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [show, setShow] = useState("open");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasksFor(d.user, d.tasks)
      .filter((t) => {
        const st = deadlineState(t.deadline);
        if (show === "open" && t.progress >= 100) return false;
        if (show === "done" && t.progress < 100) return false;
        if (show === "overdue" && !(t.progress < 100 && st === "overdue")) return false;
        if (show === "week" && !(t.progress < 100 && ["d1", "d3", "d7"].includes(st))) return false;
        if (needle) {
          const c = d.cases.find((x) => x.id === t.caseId);
          const client = d.clients.find((x) => x.id === c?.clientId)?.name ?? "";
          if (!`${t.title} ${t.partner} ${client} ${c?.ref ?? ""}`.toLowerCase().includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [d.tasks, d.cases, d.clients, d.user, q, show]);

  const count = Math.max(1, Math.ceil(list.length / size));
  const safe = Math.min(page, count);
  const rows = list.slice((safe - 1) * size, safe * size);

  return (
    <div>
      <PageHeader eyebrow="Coordination" title="Partner tasks" description="Work you are waiting on from universities, employers and other partners."
        actions={<Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden /> New task</Button>} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div><label htmlFor="tk-q" className="mb-1 block text-sm font-semibold">Search</label><input id="tk-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Task, partner, client or case" /></div>
        <div><label htmlFor="tk-show" className="mb-1 block text-sm font-semibold">Show</label><select id="tk-show" className={field} value={show} onChange={(e) => { setShow(e.target.value); setPage(1); }}><option value="open">Open tasks</option><option value="overdue">Overdue</option><option value="week">Due this week</option><option value="done">Completed</option><option value="all">All tasks</option></select></div>
      </form>

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState title="No tasks here" body="Change the filter, or add a task to track partner work.">
            <button type="button" className={btn.secondary} onClick={() => { setQ(""); setShow("all"); }}>Show all tasks</button>
          </EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {rows.map((t) => {
                const c = d.cases.find((x) => x.id === t.caseId);
                const client = d.clients.find((x) => x.id === c?.clientId);
                const done = t.progress >= 100;
                return (
                  <li key={t.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">{t.title}{done && <Pill tone="success">Completed</Pill>}</p>
                      <p className="text-sm text-ink-muted">{t.partner} · {client?.name} · {c?.ref}</p>
                      <p className="text-sm text-ink-muted">Assigned to {userById(t.assigneeId)?.name ?? d.users.find((u) => u.id === t.assigneeId)?.name}</p>
                    </div>
                    <div>
                      <ProgressBar value={t.progress} label={`Progress for ${t.title}`} />
                      <label htmlFor={`pr-${t.id}`} className="sr-only">Update progress for {t.title}</label>
                      <input id={`pr-${t.id}`} type="range" min={0} max={100} step={5} value={t.progress} onChange={(e) => d.setTaskProgress(t.id, Number(e.target.value))} onMouseUp={() => d.toast("Progress updated. (Demo: not saved.)", "info")} onKeyUp={() => undefined} className="mt-2 h-6 w-full max-w-48 accent-[#009FE3]" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      {!done && <DeadlineBadge iso={t.deadline} />}
                      {!done && <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => { d.setTaskProgress(t.id, 100); d.toast("Task marked complete. (Demo: not saved.)"); }}>Mark complete</button>}
                      {c && <Link href={`/cases/${c.id}`} className={`${btn.ghost} !min-h-10 text-sm`}>Open case</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={safe} pageSize={size} total={list.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
          </>
        )}
      </Panel>
      {adding && <TaskDialog onClose={() => setAdding(false)} />}
    </div>
  );
}
