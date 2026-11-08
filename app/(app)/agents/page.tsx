"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Handshake, Plus } from "@/components/icons";
import { PageHeader, Panel, Button, EmptyState, Avatar } from "@/components/ui";
import { Pill } from "@/components/status";
import { Kpi } from "@/components/hub";
import { ConfirmDialog } from "@/components/modal";
import { AgentDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { stageLabel, visaLabel, type Agent, type Case } from "@/lib/demo-data";
import { COMMISSION_LABEL, caseFee, commissionFor, commissionState, type CommissionState } from "@/lib/agents";
import { displayStatus } from "@/lib/permissions";
import { fmtDate, fmtSar } from "@/lib/dates";
import { btn, field, td, th } from "@/lib/styles";

const TONE: Record<CommissionState, "success" | "warning" | "neutral" | "danger"> = { paid: "success", due: "warning", not_due: "neutral", none: "neutral" };

/** Referral agents: who they are, which cases they brought, and what each case earns them. Administrator only. */
export default function AgentsPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"" | CommissionState>("");
  const [selId, setSelId] = useState<string | null>(d.agents[0]?.id ?? null);
  const [dlg, setDlg] = useState<Agent | "new" | null>(null);

  const clientName = (c: Case) => d.clients.find((x) => x.id === c.clientId)?.name ?? "Client";
  const casesOf = (a: Agent) => d.cases.filter((c) => c.agentId === a.id && !c.pastWork);
  const totals = (a: Agent) => {
    const cs = casesOf(a);
    const sum = (st: CommissionState) => cs.filter((c) => commissionState(c) === st).reduce((s, c) => s + commissionFor(a, c), 0);
    return { cases: cs.length, due: sum("due"), paid: sum("paid"), later: sum("not_due") };
  };

  const all = d.agents.map((a) => ({ a, t: totals(a) }));
  const needle = q.trim().toLowerCase();
  const list = all.filter(({ a }) => {
    if (!needle) return true;
    const refs = casesOf(a).map((c) => `${c.ref} ${clientName(c)}`).join(" ");
    return `${a.name} ${a.city} ${a.phone} ${a.email} ${refs}`.toLowerCase().includes(needle);
  }).filter(({ a }) => !show || casesOf(a).some((c) => commissionState(c) === show))
    .sort((x, y) => y.t.due - x.t.due || x.a.name.localeCompare(y.a.name));

  const sel = d.agents.find((a) => a.id === selId) ?? list[0]?.a ?? null;
  const sum = (k: "due" | "paid" | "later") => all.reduce((s, r) => s + r.t[k], 0);

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Agents and referrals"
        description="Referral partners, the cases they brought in, and the commission each case earns."
        actions={<Button onClick={() => setDlg("new")}><Plus size={18} aria-hidden /> Add agent</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Referral partners" value={d.agents.length} hint={`${d.cases.filter((c) => c.agentId).length} referred cases`} />
        <Kpi label="Commission due" value={fmtSar(sum("due"))} tone={sum("due") ? "warning" : "default"} hint="Client has paid fees, agent not paid yet" />
        <Kpi label="Commission paid" value={fmtSar(sum("paid"))} tone="good" hint="All time" />
        <Kpi label="Not due yet" value={fmtSar(sum("later"))} hint="Client has not paid fees yet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4">
            <label htmlFor="ag-q" className="mb-1 block text-sm font-semibold">Search</label>
            <input id="ag-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Agent, city, client or case number" />
            <label htmlFor="ag-show" className="mb-1 mt-3 block text-sm font-semibold">Commission</label>
            <select id="ag-show" className={field} value={show} onChange={(e) => setShow(e.target.value as "" | CommissionState)}>
              <option value="">All agents</option><option value="due">Has commission due</option><option value="not_due">Has commission not due yet</option><option value="paid">Has paid commission</option>
            </select>
          </div>
          {list.length === 0 ? <Panel><EmptyState title="No agents found" body="Add a referral partner, or clear the search." /></Panel> : (
            <ul className="space-y-2" aria-label="Agents">
              {list.map(({ a, t }) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelId(a.id)} aria-current={sel?.id === a.id}
                    className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-brand ${sel?.id === a.id ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} />
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name}</p><p className="truncate text-sm text-ink-muted">{a.city || "—"} · {t.cases} {t.cases === 1 ? "case" : "cases"}</p></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {t.due > 0 && <Pill tone="warning">Due {fmtSar(t.due)}</Pill>}
                      {t.paid > 0 && <Pill tone="success">Paid {fmtSar(t.paid)}</Pill>}
                      {t.due === 0 && t.paid === 0 && <Pill tone="neutral">{t.cases ? "Nothing due yet" : "No cases yet"}</Pill>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sel ? <AgentDetail key={sel.id} a={sel} cases={casesOf(sel)} clientName={clientName} onEdit={() => setDlg(sel)} /> : (
          <Panel><EmptyState title="No agent selected" body="Add your first referral partner to start tracking commission." /></Panel>
        )}
      </div>
      {dlg && <AgentDialog agent={dlg === "new" ? undefined : dlg} onClose={() => setDlg(null)} />}
    </div>
  );
}

function AgentDetail({ a, cases, clientName, onEdit }: { a: Agent; cases: Case[]; clientName: (c: Case) => string; onEdit: () => void }) {
  const d = useDemo();
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [unlink, setUnlink] = useState<Case | null>(null);
  const linkable = useMemo(() => d.cases.filter((c) => !c.pastWork && c.agentId !== a.id), [d.cases, a.id]);
  const total = (st: CommissionState) => cases.filter((c) => commissionState(c) === st).reduce((s, c) => s + commissionFor(a, c), 0);

  const link = () => {
    const v = ref.trim().toLowerCase();
    if (!v) { setErr("Type a case number, for example PG-26-0012."); return; }
    const c = linkable.find((x) => x.ref.toLowerCase() === v) ?? linkable.find((x) => `${x.ref} · ${clientName(x)}`.toLowerCase() === v);
    if (!c) { setErr(d.cases.some((x) => x.ref.toLowerCase() === v && x.agentId === a.id) ? "That case is already linked to this agent." : "No case with that number."); return; }
    const other = c.agentId ? d.agents.find((x) => x.id === c.agentId)?.name : undefined;
    if (d.linkAgent(c.id, a.id)) { d.toast(other ? `${c.ref} moved from ${other} to ${a.name}.` : `${c.ref} linked to ${a.name}.`); setRef(""); setErr(""); }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep"><Handshake size={24} aria-hidden /></span>
            <div>
              <h2 className="text-xl font-bold">{a.name}</h2>
              <p className="text-[0.9375rem] text-ink-muted">{[a.city, a.phone, a.email].filter(Boolean).join(" · ") || "No contact details"}</p>
              <p className="mt-2"><Pill tone="info">{a.commissionType === "percent" ? `${a.amount}% of the case fee` : `${fmtSar(a.amount)} per case`}</Pill></p>
              {a.notes && <p className="mt-2 text-sm text-ink-muted">{a.notes}</p>}
            </div>
          </div>
          <button type="button" className={btn.secondary} onClick={onEdit}>Edit agent</button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
          {[["Cases", cases.length], ["Due", fmtSar(total("due"))], ["Paid", fmtSar(total("paid"))], ["Not due yet", fmtSar(total("not_due"))]].map(([k, v]) => (
            <div key={k as string}><dt className="text-sm text-ink-muted">{k}</dt><dd className="text-lg font-bold tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </Panel>

      <Panel title="Link a case to this agent" description="Type the case number (or pick from the list). A case can belong to one agent only.">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); link(); }}>
          <label htmlFor="ag-ref" className="sr-only">Case number</label>
          <input id="ag-ref" list="ag-ref-list" className={field} value={ref} onChange={(e) => { setRef(e.target.value); setErr(""); }} placeholder="PG-26-0012" autoComplete="off" />
          <datalist id="ag-ref-list">{linkable.slice(0, 300).map((c) => <option key={c.id} value={c.ref}>{`${clientName(c)} · ${visaLabel(c.visa)}${c.agentId ? " · has another agent" : ""}`}</option>)}</datalist>
          <button type="submit" className={`${btn.primary} shrink-0`}>Link case</button>
        </form>
        {err && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{err}</p>}
      </Panel>

      <Panel title="Cases and commission" description={`Commission is due once the client has paid fees. Leave the amount empty to use the agent's terms (${a.commissionType === "percent" ? `${a.amount}% of the fee` : fmtSar(a.amount)}).`} flush>
        {cases.length === 0 ? <EmptyState title="No cases linked yet" body="Link a case above, or choose the agent when creating a lead." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[0.9375rem]">
              <caption className="sr-only">Cases referred by {a.name}</caption>
              <thead className="border-b border-line bg-brand-tint"><tr>
                <th scope="col" className={th}>Case</th><th scope="col" className={th}>Where it is</th><th scope="col" className={th}>Case fee</th>
                <th scope="col" className={th}>Commission (SAR)</th><th scope="col" className={th}>Status</th><th scope="col" className={th}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {cases.map((c) => <CaseRow key={`${c.id}:${c.commissionSar ?? ""}:${c.agentPaidAt ?? ""}`} a={a} c={c} client={clientName(c)} onUnlink={() => setUnlink(c)} />)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {unlink && <ConfirmDialog title={`Remove ${unlink.ref} from ${a.name}?`} body="The case stays as it is; it is only no longer counted for this agent. Any commission recorded on it is kept on the case." confirmLabel="Remove link" danger
        onConfirm={() => { if (d.linkAgent(unlink.id, null)) d.toast(`${unlink.ref} removed from ${a.name}.`); }} onClose={() => setUnlink(null)} />}
    </div>
  );
}

function CaseRow({ a, c, client, onUnlink }: { a: Agent; c: Case; client: string; onUnlink: () => void }) {
  const d = useDemo();
  const st = commissionState(c);
  const recorded = typeof c.commissionSar === "number";
  const [amount, setAmount] = useState(recorded ? String(c.commissionSar) : "");
  const dirty = amount !== (recorded ? String(c.commissionSar) : "");
  const save = () => {
    const v = amount.trim() === "" ? null : Number(amount);
    if (v !== null && (!Number.isFinite(v) || v < 0)) { d.toast("Enter a valid amount.", "error"); return; }
    if (d.setAgentCommission(c.id, v)) d.toast(v === null ? `${c.ref}: back to the agent's terms.` : `${c.ref}: commission set to ${fmtSar(v)}.`);
  };
  return (
    <tr className="align-top">
      <td className={td}><Link href={`/cases/${c.id}`} className="whitespace-nowrap font-semibold text-brand-deep hover:underline">{c.ref}</Link><p className="text-sm text-ink-muted">{client} · {visaLabel(c.visa)}</p></td>
      <td className={td}><p>{stageLabel(c.stage)}</p><p className="text-sm text-ink-muted">{displayStatus(d.user, c).label}</p></td>
      <td className={`${td} whitespace-nowrap tabular-nums`}>{caseFee(c) ? fmtSar(caseFee(c)) : <span className="text-ink-muted">Not set</span>}</td>
      <td className={td}>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label htmlFor={`cm-${c.id}`} className="sr-only">Commission for {c.ref} in SAR</label>
          <input id={`cm-${c.id}`} type="number" min={0} step="any" inputMode="decimal" className={`${field} !h-10 w-28`} value={amount} disabled={!!c.agentPaidAt}
            placeholder={String(commissionFor({ ...a }, { ...c, commissionSar: null }))} onChange={(e) => setAmount(e.target.value)} />
          {dirty && <button type="submit" className={`${btn.primary} !min-h-10 text-sm`}>Save</button>}
        </form>
        <p className="mt-1 text-xs text-ink-muted">{recorded ? "Recorded amount" : `From terms: ${fmtSar(commissionFor(a, c))}`}</p>
      </td>
      <td className={td}>
        <Pill tone={TONE[st]}>{COMMISSION_LABEL[st]}</Pill>
        {c.agentPaidAt && <p className="mt-1 text-xs text-ink-muted">{fmtDate(c.agentPaidAt)}{c.agentPaidBy ? ` · ${c.agentPaidBy}` : ""}</p>}
      </td>
      <td className={`${td} text-right`}><div className="flex flex-col items-end gap-1">
        {c.agentPaidAt
          ? <button type="button" className={`${btn.ghost} !min-h-10 whitespace-nowrap text-sm`} onClick={() => { if (d.setAgentPaid(c.id, false)) d.toast(`${c.ref}: payment undone.`); }}>Undo payment</button>
          : <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} disabled={dirty} title={dirty ? "Save the amount first" : undefined} onClick={() => { if (d.setAgentPaid(c.id, true)) d.toast(`${c.ref}: ${fmtSar(commissionFor(a, c))} marked as paid to ${a.name}.`); }}>Mark paid</button>}
        <button type="button" className={`${btn.ghost} !min-h-10 text-sm`} onClick={onUnlink} disabled={!!c.agentPaidAt} title={c.agentPaidAt ? "Undo the payment first" : undefined}>Remove</button>
      </div></td>
    </tr>
  );
}
