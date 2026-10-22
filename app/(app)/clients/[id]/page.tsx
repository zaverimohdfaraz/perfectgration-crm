"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Avatar, Button } from "@/components/ui";
import { DeadlineBadge, DaysBadge, StageBadge, StatusBadge, VisaBadge } from "@/components/status";
import { EditClientDialog, IntakeDialog } from "@/components/dialogs-cases";
import { useDemo } from "@/lib/store";
import { userById } from "@/lib/demo-data";
import { canAddCases, canEditCase, displayStatus } from "@/lib/permissions";
import { daysBetween, fmtDate } from "@/lib/dates";
import { btn } from "@/lib/styles";

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const d = useDemo();
  const [dlg, setDlg] = useState<null | "edit" | "case">(null);
  const client = d.clients.find((c) => c.id === params.id);
  const cases = d.visible.filter((c) => c.clientId === params.id);

  if (!client || (cases.length === 0 && d.user.role === "consultant")) {
    return <Panel><EmptyState title="Client not found" body="They may not exist, or you may not have access to their cases."><Link href="/clients" className={btn.primary}>Back to clients</Link></EmptyState></Panel>;
  }

  const showDob = d.user.role === "admin" || cases.some((c) => canEditCase(d.user, c));
  const docs = cases.flatMap((c) => d.docs.filter((x) => x.caseId === c.id).map((x) => ({ ...x, ref: c.ref })));
  const canEditClient = d.user.role === "admin" || cases.some((c) => canEditCase(d.user, c));

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-muted"><ol className="flex flex-wrap items-center gap-2"><li><Link href="/clients" className="hover:text-brand-deep hover:underline">Clients</Link></li><li aria-hidden>/</li><li className="font-medium text-ink" aria-current="page">{client.name}</li></ol></nav>
      <PageHeader title={client.name} description={`${client.nationality} · ${cases.length} ${cases.length === 1 ? "case" : "cases"} you can access`}
        actions={<>{canEditClient && <Button variant="secondary" onClick={() => setDlg("edit")}><Pencil size={18} aria-hidden /> Edit client</Button>}{canAddCases(d.user) && <Button onClick={() => setDlg("case")}><Plus size={18} aria-hidden /> New case</Button>}</>} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Profile">
          <div className="flex items-center gap-4"><Avatar name={client.name} size="lg" /><div><p className="text-lg font-bold">{client.name}</p><p className="text-sm text-ink-muted">{client.country || client.nationality}</p></div></div>
          <dl className="mt-5 space-y-4">
            <F label="Phone" value={client.phone || "—"} /><F label="Email" value={client.email || "—"} />
            <F label="Date of birth" value={showDob ? (client.dob ? fmtDate(client.dob) : "—") : "Visible to the assigned team"} />
            <F label="Last updated" value={fmtDate(client.updatedAt)} />
          </dl>
        </Panel>

        <div className="space-y-6 xl:col-span-2">
          <Panel title="Cases" flush>
            {cases.length === 0 ? <EmptyState title="No cases yet" body="Open a case to start this client's application." /> : (
              <ul className="divide-y divide-line">
                {cases.map((c) => {
                  const st = displayStatus(d.user, c);
                  return (
                    <li key={c.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2"><Link href={`/cases/${c.id}`} className="font-semibold hover:text-brand-deep hover:underline">{c.ref}</Link><VisaBadge visa={c.visa} /><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /></div>
                        <div className="flex flex-wrap gap-2"><StageBadge stage={c.stage} /><DaysBadge days={daysBetween(c.stageSince)} /></div>
                        <p className="text-sm text-ink-muted">Consultant: {userById(c.consultantId)?.name}</p>
                      </div>
                      <DeadlineBadge iso={c.deadline} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Documents" description="Details only. Files open through permission-checked links." flush>
            {docs.length === 0 ? <EmptyState title="No documents yet" body="Documents uploaded on this client's cases appear here." /> : (
              <ul className="divide-y divide-line">{docs.map((x) => (<li key={x.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{x.name}</p><p className="text-sm text-ink-muted">{x.category} · {x.ref} · {fmtDate(x.at)}</p></div><p className="text-sm text-ink-muted">{x.status === "pending" ? "Waiting from client" : x.status === "verified" ? "Verified" : "Received"}</p></li>))}</ul>
            )}
          </Panel>
        </div>
      </div>

      {dlg === "edit" && <EditClientDialog client={client} onClose={() => setDlg(null)} />}
      {dlg === "case" && <IntakeDialog mode="case" presetClientId={client.id} onClose={() => setDlg(null)} />}
    </div>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm font-medium text-ink-muted">{label}</dt><dd className="mt-0.5 break-words text-[15px]">{value}</dd></div>;
}
