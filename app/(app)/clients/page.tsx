"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UserPlus } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Avatar, Button } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { IntakeDialog } from "@/components/dialogs-cases";
import { useDemo } from "@/lib/store";
import { userById, visaLabel } from "@/lib/demo-data";
import { canAddCases } from "@/lib/permissions";
import { deadlineText, fmtDate } from "@/lib/dates";
import { btn, field, td, th } from "@/lib/styles";

export default function ClientsPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [nat, setNat] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return d.clients
      .map((client) => ({ client, cases: d.visible.filter((c) => c.clientId === client.id) }))
      .filter((r) => r.cases.length > 0 || d.user.role !== "consultant")
      .filter((r) => !nat || r.client.nationality === nat)
      .filter((r) => !needle || `${r.client.name} ${r.client.email} ${r.client.phone}`.toLowerCase().includes(needle))
      .sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [d.clients, d.visible, d.user.role, q, nat]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pageCount);
  const pageRows = rows.slice((safe - 1) * pageSize, safe * pageSize);
  const nationalities = [...new Set(d.clients.map((c) => c.nationality))].sort();

  return (
    <div>
      <PageHeader eyebrow="Directory" title="Clients" description="Everyone with a case you can access. Open a profile for contact details and documents."
        actions={canAddCases(d.user) ? <Button onClick={() => setAdding(true)}><UserPlus size={18} aria-hidden /> Add client</Button> : undefined} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div><label htmlFor="cl-q" className="mb-1 block text-sm font-semibold">Search</label><input id="cl-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or phone" /></div>
        <div><label htmlFor="cl-nat" className="mb-1 block text-sm font-semibold">Nationality</label><select id="cl-nat" className={field} value={nat} onChange={(e) => { setNat(e.target.value); setPage(1); }}><option value="">All nationalities</option>{nationalities.map((n) => <option key={n}>{n}</option>)}</select></div>
      </form>

      <Panel flush>
        {pageRows.length === 0 ? (
          <EmptyState title="No clients found" body="Try a different name or clear the nationality filter.">
            <button type="button" className={btn.secondary} onClick={() => { setQ(""); setNat(""); }}>Clear filters</button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[840px] text-[15px]">
                <caption className="sr-only">Clients</caption>
                <thead className="border-b border-line bg-brand-tint"><tr>
                  <th scope="col" className={th}>Client</th><th scope="col" className={th}>Nationality</th><th scope="col" className={th}>Visa types</th><th scope="col" className={th}>Cases</th><th scope="col" className={th}>Consultant</th><th scope="col" className={th}>Last updated</th><th scope="col" className={th}>Next follow-up</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map(({ client, cases }) => {
                    const next = cases.filter((c) => c.status === "active" && c.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
                    const staff = [...new Set(cases.map((c) => userById(c.consultantId)?.name).filter(Boolean))];
                    const updated = cases.reduce((m, c) => (c.updatedAt > m ? c.updatedAt : m), client.updatedAt);
                    return (
                      <tr key={client.id} className="hover:bg-brand-tint/50">
                        <td className={td}><div className="flex items-center gap-3"><Avatar name={client.name} /><div><Link href={`/clients/${client.id}`} className="font-semibold hover:text-brand-deep hover:underline">{client.name}</Link><p className="text-sm text-ink-muted">{client.email || client.phone}</p></div></div></td>
                        <td className={td}>{client.nationality}</td>
                        <td className={td}>{[...new Set(cases.map((c) => visaLabel(c.visa)))].join(", ") || "—"}</td>
                        <td className={`${td} tabular-nums`}>{cases.length}</td>
                        <td className={td}>{staff.join(", ") || "—"}</td>
                        <td className={td}>{fmtDate(updated)}</td>
                        <td className={td}>{next ? <>{deadlineText(next.deadline)}<p className="text-sm text-ink-muted">{next.ref}</p></> : <span className="text-ink-muted">None</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-px bg-line sm:grid-cols-2 xl:hidden">
              {pageRows.map(({ client, cases }) => {
                const next = cases.filter((c) => c.status === "active" && c.deadline).sort((x, y) => (x.deadline! < y.deadline! ? -1 : 1))[0];
                return (
                  <li key={client.id} className="bg-white">
                    <Link href={`/clients/${client.id}`} className="flex h-full items-start gap-3 p-4 hover:bg-brand-tint/50">
                      <Avatar name={client.name} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold">{client.name}</p>
                        <p className="text-sm text-ink-muted">{client.nationality} · {cases.length} {cases.length === 1 ? "case" : "cases"}</p>
                        <p className="mt-1 text-sm text-ink-muted">{[...new Set(cases.map((c) => visaLabel(c.visa)))].join(", ") || "No cases yet"}</p>
                        <p className="mt-1 text-sm">{next ? `${deadlineText(next.deadline)} · ${next.ref}` : "No upcoming deadline"}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager page={safe} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </>
        )}
      </Panel>
      {adding && <IntakeDialog mode="client" onClose={() => setAdding(false)} />}
    </div>
  );
}
