"use client";

import { useState } from "react";
import { Handshake, Plus } from "lucide-react";
import { PageHeader, Panel, Stat, Button, EmptyState } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { Pill } from "@/components/status";
import { AgentDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { visaLabel, type Agent } from "@/lib/demo-data";
import { fmtSar } from "@/lib/dates";
import { btn, field } from "@/lib/styles";

export default function AgentsPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [dlg, setDlg] = useState<Agent | "new" | null>(null);

  const rows = d.agents
    .map((a) => { const cs = d.cases.filter((c) => c.agentId === a.id); return { a, cs, comm: cs.reduce((s, c) => s + (c.commissionSar ?? 0), 0) }; })
    .filter((r) => (!pay || (pay === "paid" ? r.a.paid : !r.a.paid)) && (!q.trim() || `${r.a.name} ${r.a.city}`.toLowerCase().includes(q.trim().toLowerCase())));
  const pending = d.agents.filter((a) => !a.paid).reduce((s, a) => s + d.cases.filter((c) => c.agentId === a.id).reduce((x, c) => x + (c.commissionSar ?? 0), 0), 0);
  const count = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(page, count);
  const pageRows = rows.slice((safe - 1) * size, safe * size);

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Agents and referrals" description="Referral partners, the clients they sent, and commission still to be settled."
        actions={<Button onClick={() => setDlg("new")}><Plus size={18} aria-hidden /> Add agent</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Referral partners" value={d.agents.length} icon={<Handshake size={22} />} />
        <Stat label="Referred cases" value={d.cases.filter((c) => c.agentId).length} />
        <Stat label="Commission pending" value={fmtSar(pending)} tone="amber" hint="Not yet paid to agents" />
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div><label htmlFor="ag-q" className="mb-1 block text-sm font-semibold">Search</label><input id="ag-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Agent name or city" /></div>
        <div><label htmlFor="ag-pay" className="mb-1 block text-sm font-semibold">Payment</label><select id="ag-pay" className={field} value={pay} onChange={(e) => { setPay(e.target.value); setPage(1); }}><option value="">All</option><option value="pending">Payment pending</option><option value="paid">Paid</option></select></div>
      </form>

      {pageRows.length === 0 ? (
        <Panel><EmptyState title="No agents found" body="Add a referral partner, or clear the filters." /></Panel>
      ) : (
        <div className="space-y-4">
          {pageRows.map(({ a, cs, comm }) => (
            <Panel key={a.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div><h2 className="text-lg font-semibold">{a.name}</h2><p className="text-sm text-ink-muted">{a.city} · {a.phone} · {a.email}</p>{a.notes && <p className="mt-1 text-sm text-ink-muted">{a.notes}</p>}</div>
                <div className="flex flex-wrap gap-2"><Pill>{a.commissionType === "percent" ? `${a.amount}% of fee` : `${fmtSar(a.amount)} flat`}</Pill><Pill tone={a.paid ? "success" : "warning"}>{a.paid ? "Paid" : "Payment pending"}</Pill></div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-ink-muted">Linked cases ({cs.length})</p>
                  {cs.length === 0 ? <p className="mt-1 text-[15px]">No referred cases yet.</p> : <ul className="mt-1 space-y-1 text-[15px]">{cs.slice(0, 4).map((c) => <li key={c.id}>{d.clients.find((x) => x.id === c.clientId)?.name} · {c.ref} · {visaLabel(c.visa)}</li>)}{cs.length > 4 && <li className="text-ink-muted">and {cs.length - 4} more</li>}</ul>}
                </div>
                <div><p className="text-sm font-medium text-ink-muted">Commission recorded</p><p className="mt-1 text-2xl font-bold tabular-nums">{comm ? fmtSar(comm) : "None yet"}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <button type="button" className={btn.secondary} onClick={() => setDlg(a)}>Edit agent</button>
                <button type="button" className={btn.secondary} onClick={() => { d.updateAgent(a.id, { paid: !a.paid }); d.toast(a.paid ? `${a.name} marked as payment pending. (Demo: not saved.)` : `${a.name} marked as paid. (Demo: not saved.)`); }}>{a.paid ? "Mark as unpaid" : "Mark commission as paid"}</button>
              </div>
            </Panel>
          ))}
          <Panel flush><Pager page={safe} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[10, 25]} /></Panel>
        </div>
      )}
      {dlg && <AgentDialog agent={dlg === "new" ? undefined : dlg} onClose={() => setDlg(null)} />}
    </div>
  );
}
