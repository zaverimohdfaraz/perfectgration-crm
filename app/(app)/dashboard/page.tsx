"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Briefcase, CalendarClock, CheckCircle2, Clock, Plus, UserPlus } from "lucide-react";
import { PageHeader, Panel, Stat, Button, EmptyState } from "@/components/ui";
import { Timeline } from "@/components/timeline";
import { Pill } from "@/components/status";
import { IntakeDialog } from "@/components/dialogs-cases";
import { useDemo } from "@/lib/store";
import { alertsFor, metricsFor, recentActivity, stageCounts, tasksFor } from "@/lib/insights";
import { canAddCases } from "@/lib/permissions";
import { deadlineState, fmtDate } from "@/lib/dates";
import { btn } from "@/lib/styles";

export default function DashboardPage() {
  const d = useDemo();
  const [dialog, setDialog] = useState<"client" | "case" | null>(null);
  const m = metricsFor(d.user, d.cases);
  const urgent = alertsFor(d.user, d.cases, d.clients).filter((a) => (a.level === "critical" || a.level === "high") && !d.dismissed.includes(a.id));
  const stages = stageCounts(d.user, d.cases);
  const maxStage = Math.max(1, ...stages.map((s) => s.n));
  const dueTasks = tasksFor(d.user, d.tasks).filter((t) => t.progress < 100 && ["overdue", "d1", "d3"].includes(deadlineState(t.deadline)));
  const pinned = d.teamNotes.filter((n) => n.pinned);
  const firstName = d.user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow="Good morning"
        title={`Welcome back, ${firstName}`}
        description="Here is your case activity and the work that needs attention today."
        actions={canAddCases(d.user) ? (<><Button variant="secondary" onClick={() => setDialog("client")}><UserPlus size={18} aria-hidden /> Add client</Button><Button onClick={() => setDialog("case")}><Plus size={18} aria-hidden /> New case</Button></>) : undefined}
      />

      {urgent.length > 0 ? (
        <section aria-labelledby="urgent-title" className="mb-6 flex flex-col gap-4 rounded-xl border border-red-300 bg-red-50 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 shrink-0 text-red-800" size={22} />
            <div>
              <h2 id="urgent-title" className="font-semibold text-red-950">{urgent.length} {urgent.length === 1 ? "item needs" : "items need"} action now</h2>
              <p className="text-sm text-red-950/80">{m.overdue > 0 && `${m.overdue} overdue. `}{m.urgent > 0 && `${m.urgent} stuck for more than 21 days. `}{m.dueWithin3 > 0 && `${m.dueWithin3} due within three days.`}</p>
            </div>
          </div>
          <Link href="/cases?attention=urgent" className={btn.primary}>Review urgent cases</Link>
        </section>
      ) : (
        <section aria-label="Status" className="mb-6 flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-5 text-green-950">
          <CheckCircle2 aria-hidden size={22} className="shrink-0" /><p className="font-medium">No overdue or urgent cases right now.</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active cases" value={m.active} hint={`${m.total} visible to you`} icon={<Briefcase size={22} />} />
        <Stat label="Stuck over 21 days" value={m.urgent} tone={m.urgent ? "red" : "blue"} hint="Needs immediate attention" icon={<AlertTriangle size={22} />} />
        <Stat label="Due within 3 days" value={m.dueWithin3} tone={m.dueWithin3 ? "amber" : "blue"} hint="Deadlines to prepare for" icon={<CalendarClock size={22} />} />
        <Stat label="Overdue deadlines" value={m.overdue} tone={m.overdue ? "red" : "blue"} hint="Past the agreed date" icon={<Clock size={22} />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Today's priorities" description="The next actions most likely to need you." flush>
            {urgent.length === 0 && dueTasks.length === 0 ? (
              <EmptyState title="Nothing urgent for today" body="When a deadline is close or a case stalls, it will appear here with a direct link." />
            ) : (
              <ul className="divide-y divide-line">
                {urgent.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="font-semibold">{a.title}</p><p className="text-sm text-ink-muted">{a.detail}</p></div>
                    <Link href={`/cases/${a.caseId}`} className={`${btn.secondary} shrink-0`}>Open case</Link>
                  </li>
                ))}
                {dueTasks.map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="font-semibold">{t.title}</p><p className="text-sm text-ink-muted">Partner task · {t.partner} · due {fmtDate(t.deadline)}</p></div>
                    <Link href="/partner-tasks" className={`${btn.secondary} shrink-0`}>View task</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Case pipeline" description="Where your cases sit today. Select a stage to see those cases.">
            <ul className="space-y-2">
              {stages.map((s) => (
                <li key={s.id}>
                  <Link href={`/cases?stage=${s.id}`} className="group grid grid-cols-[minmax(0,10.5rem)_1fr_2.5rem] items-center gap-3 rounded-md py-1.5 hover:bg-brand-tint">
                    <span className="truncate text-sm font-medium group-hover:text-brand-deep">{s.label}</span>
                    <span aria-hidden className="h-3 overflow-hidden rounded-full bg-brand-soft"><span className="block h-full rounded-full bg-brand" style={{ width: `${(s.n / maxStage) * 100}%` }} /></span>
                    <span className="text-right text-sm font-bold tabular-nums">{s.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Recent activity" description="Stage changes and notes across your cases.">
            <Timeline items={recentActivity(d.user, d.cases, d.clients, 6).map((a) => ({ id: a.id, title: a.text, meta: `${a.actor} · ${a.ref} · ${fmtDate(a.at)}` }))} empty="No activity yet." />
          </Panel>
          <Panel title="Pinned team notes">
            {pinned.length === 0 ? <p className="text-sm text-ink-muted">No pinned notes.</p> : (
              <ul className="space-y-4">{pinned.map((n) => (<li key={n.id}><p className="flex items-center gap-2 font-medium">{n.title} <Pill tone="info">{n.category}</Pill></p><p className="mt-1 text-sm text-ink-muted">{n.content}</p></li>))}</ul>
            )}
            <Link href="/notepad" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-deep hover:underline">Open Team Notepad</Link>
          </Panel>
        </div>
      </div>

      {dialog && <IntakeDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
