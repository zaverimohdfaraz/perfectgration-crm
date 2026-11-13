"use client";

import { useState } from "react";
import { RotateCcw } from "@/components/icons";
import { PageHeader, Panel, Button, DemoNote } from "@/components/ui";
import { DeptChip, TeamChip } from "@/components/department";
import { TemplateDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { DEFAULT_SLA_DAYS, OWNER_LABEL, PROCESS_LANES, SLA_RULES, STAGES, STAGE_OWNER, VISA_TYPES, stageLabel, type StageId, type Template, type TeamId } from "@/lib/demo-data";
import { btn, field, td, th } from "@/lib/styles";

function ProcessMap() {
  return (
    <Panel title="Process map" description="Three working teams with a handoff between each. The admin and managers oversee all of it.">
      <div className="space-y-4">
        {PROCESS_LANES.map((lane) => (
          <div key={lane.owner} className="rounded-xl border border-line">
            <div className="border-b border-line bg-brand-tint px-4 py-3"><TeamChip team={lane.owner} /></div>
            <ol className="flex flex-wrap items-stretch gap-2 p-4">
              {lane.steps.map((st, i) => (
                <li key={st.label} className="flex items-center gap-2">
                  <div className="h-full rounded-lg border border-line bg-white px-3 py-2"><p className="text-sm font-semibold">{st.label}</p><p className="text-xs text-ink-muted">{st.note}</p></div>
                  {i < lane.steps.length - 1 && <span aria-hidden className="text-ink-muted">→</span>}
                </li>
              ))}
            </ol>
            {lane.handoff && <p className="border-t border-line px-4 py-2 text-sm font-semibold text-brand-deep">{lane.handoff}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function WorkflowPage() {
  const d = useDemo();
  const [sla, setSla] = useState<Record<StageId, number>>(d.sla);
  const [handlers, setHandlers] = useState<Record<string, string>>(d.handlers);
  const [visa, setVisa] = useState<TeamId>("study");
  const [tpl, setTpl] = useState<Template | null>(null);

  const dirty = JSON.stringify(sla) !== JSON.stringify(d.sla) || JSON.stringify(handlers) !== JSON.stringify(d.handlers);
  const staff = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.teams.includes(visa));

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Workflow setup" description="Set deadlines, default handlers and message templates. Changes apply to new activity. Existing stage history is never rewritten."
        actions={<><Button variant="secondary" disabled={!dirty} onClick={() => { setSla(d.sla); setHandlers(d.handlers); }}><RotateCcw size={18} aria-hidden /> Discard</Button><Button disabled={!dirty} onClick={() => { d.setSla(sla); d.setHandlers(handlers); d.toast("Workflow saved. New deadlines and handlers apply when cases move stage. (Demo: not saved.)"); }}>Save changes</Button></>} />
      {dirty && <p role="status" className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950">You have unsaved changes.</p>}

      <ProcessMap />

      <div className="mt-6" />
      <Panel flush title="Steps, deadlines and handlers" description="Days allowed in stage is how long a case may sit there. Moving a case into a stage sets its deadline from today, and the escalation trigger raises an alert when it is missed.">
        <div className="border-b border-line p-4">
          <label htmlFor="wf-visa" className="mb-1 block text-sm font-semibold">Default handlers for visa type</label>
          <div className="flex flex-wrap items-center gap-3">
            <select id="wf-visa" className={`${field} max-w-xs`} value={visa} onChange={(e) => setVisa(e.target.value as TeamId)}>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
            <DeptChip team={visa} />
            {visa === "visit" && <span className="text-sm text-ink-muted">Visit visas skip the Document Assessment step.</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-[0.9375rem]">
            <caption className="sr-only">Pipeline stages, deadlines and default handlers</caption>
            <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Stage</th><th scope="col" className={th}>Owner</th><th scope="col" className={th}>Standard deadline</th><th scope="col" className={th}>Escalation trigger</th><th scope="col" className={th}>Days allowed in stage</th><th scope="col" className={th}>Default handler</th></tr></thead>
            <tbody className="divide-y divide-line">
              {STAGES.map((s, i) => {
                const skipped = visa === "visit" && s.id === "docassess";
                const key = `${visa}:${s.id}`;
                return (
                  <tr key={s.id} className={skipped ? "bg-slate-50 text-ink-muted" : ""}>
                    <td className={`${td} font-medium`}>{i === 0 ? "Intake" : i}. {stageLabel(s.id)}{skipped && <span className="ml-2 text-xs">(skipped)</span>}</td>
                    <td className={td}>{OWNER_LABEL[STAGE_OWNER[s.id]]}</td>
                    <td className={`${td} text-ink-muted`}>{SLA_RULES.find((r) => r.stage === s.id)?.target}</td>
                    <td className={`${td} text-ink-muted`}>{SLA_RULES.find((r) => r.stage === s.id)?.escalation}</td>
                    <td className={td}>
                      <label htmlFor={`sla-${s.id}`} className="sr-only">Deadline in days for {s.label}</label>
                      <input id={`sla-${s.id}`} type="number" min={1} max={60} className={`${field} w-24`} value={sla[s.id]} disabled={s.id === "outcome"} onChange={(e) => setSla({ ...sla, [s.id]: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                    </td>
                    <td className={td}>
                      <label htmlFor={`h-${s.id}`} className="sr-only">Default handler for {s.label}</label>
                      <select id={`h-${s.id}`} className={`${field} max-w-60`} disabled={skipped} value={handlers[key] ?? ""} onChange={(e) => { const next = { ...handlers }; if (e.target.value) next[key] = e.target.value; else delete next[key]; setHandlers(next); }}>
                        <option value="">Keep current consultant</option>
                        {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4"><button type="button" className={btn.ghost} onClick={() => setSla(DEFAULT_SLA_DAYS)}>Reset deadlines to standard</button></div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Alert thresholds" description="Fixed company policy for time spent in a stage.">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line p-4"><dt className="text-sm font-medium text-ink-muted">Follow up after</dt><dd className="mt-1 text-2xl font-bold">10 days</dd></div>
            <div className="rounded-lg border border-line p-4"><dt className="text-sm font-medium text-ink-muted">Urgent after</dt><dd className="mt-1 text-2xl font-bold">21 days</dd></div>
          </dl>
          <p className="mt-4 text-sm text-ink-muted">Deadline reminders appear when a deadline is overdue, 1 day, 3 days and 7 days away. Reminder emails go through EmailJS.</p>
        </Panel>

        <Panel title="Message templates" description="Edit the wording. Placeholders such as [Client Name] fill in automatically.">
          <ul className="divide-y divide-line">
            {d.templates.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0"><p className="font-medium">{t.name}</p><p className="text-sm text-ink-muted">Sent at {stageLabel(t.stage)}</p><p className="mt-1 line-clamp-2 text-sm text-ink-muted">{t.body.replace(/\n/g, " ")}</p></div>
                <button type="button" className={`${btn.secondary} !min-h-10 shrink-0 text-sm`} onClick={() => setTpl(t)}>Edit</button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-6"><DemoNote>Change a deadline or handler above and save. The new deadline and handler apply when cases move to that stage.</DemoNote></div>
      {tpl && <TemplateDialog t={tpl} onClose={() => setTpl(null)} />}
    </div>
  );
}
