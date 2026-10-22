"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, FileDown, Pencil, StickyNote, UploadCloud } from "lucide-react";
import { PageHeader, Panel, Tabs, EmptyState, Button } from "@/components/ui";
import { DaysBadge, DeadlineBadge, Pill, StageBadge, StatusBadge, VisaBadge } from "@/components/status";
import { StageStepper } from "@/components/stage-stepper";
import { SituationSummary } from "@/components/situation-summary";
import { Timeline } from "@/components/timeline";
import { ConfirmDialog } from "@/components/modal";
import { AssessmentDialog, EditCaseDialog, EndCaseDialog, MoveStageDialog } from "@/components/dialogs-cases";
import { ReportPreview } from "@/components/dialogs-admin";
import { useDemo, nextStageFor } from "@/lib/store";
import { STAGES, agentById, stageLabel, userById, visaLabel, type Doc, type TeamId } from "@/lib/demo-data";
import { canEditCase, canMoveStage, canReactivate, canSeeCase, canSeeCommission, canSeeOutcome, canViewReports, displayStatus } from "@/lib/permissions";
import { daysBetween, fmtDate, fmtDateTime, fmtSar } from "@/lib/dates";
import { area, btn, field, td, th } from "@/lib/styles";
import type { ReactNode } from "react";

const CATEGORIES = ["Passport", "Photographs", "Education certificate", "English certificate", "Bank statement", "Employment evidence", "Visa-specific", "Other"];
const CHECKLIST: Record<TeamId, string[]> = {
  study: ["Passport", "Photographs", "Education certificate", "English certificate", "Bank statement"],
  work: ["Passport", "Photographs", "Employment evidence", "Education certificate", "Bank statement"],
  visit: ["Passport", "Photographs", "Bank statement", "Employment evidence"],
  skilled: ["Passport", "Photographs", "Education certificate", "English certificate", "Employment evidence"],
  eb2niw: ["Passport", "Education certificate", "Employment evidence", "Visa-specific"],
};
const DOC_TONE = { verified: "success", received: "info", pending: "warning" } as const;
const DOC_LABEL = { verified: "Verified", received: "Received", pending: "Waiting for client" } as const;

type Dlg = null | "move" | "end" | "edit" | "assess" | "reactivate" | "pdf";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const d = useDemo();
  const c = d.cases.find((x) => x.id === params.id);
  const [tab, setTab] = useState("overview");
  const [dlg, setDlg] = useState<Dlg>(null);

  if (!c || !canSeeCase(d.user, c)) {
    return (
      <Panel><EmptyState title="Case not found" body="It may have been removed, or you may not have access to it."><Link href="/cases" className={btn.primary}>Back to cases</Link></EmptyState></Panel>
    );
  }

  const client = d.clients.find((x) => x.id === c.clientId);
  const consultant = userById(c.consultantId) ?? d.users.find((u) => u.id === c.consultantId);
  const agent = agentById(c.agentId) ?? d.agents.find((a) => a.id === c.agentId);
  const st = displayStatus(d.user, c);
  const days = daysBetween(c.stageSince);
  const editable = canEditCase(d.user, c);
  const next = nextStageFor(c);
  const ended = c.status === "on_hold" || c.status === "returned" || c.status === "withdrawn" || c.status === "refused";
  const completed = STAGES.slice(0, STAGES.findIndex((s) => s.id === c.stage)).filter((s) => !(c.visa === "visit" && s.id === "assessment")).map((s) => s.label);
  const docs = d.docs.filter((x) => x.caseId === c.id);
  const assessment = d.assessments[c.id];
  const have = CHECKLIST[c.visa].filter((cat) => docs.some((x) => x.category === cat && x.status !== "pending"));
  const showReason = !(c.status === "refused" && !canSeeOutcome(d.user));

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "Stage history", count: c.history.length },
    { id: "eligibility", label: "Eligibility" },
    { id: "documents", label: "Documents", count: docs.length },
    { id: "notes", label: "Notes", count: c.notes.length },
  ];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2"><li><Link href="/cases" className="hover:text-brand-deep hover:underline">Cases</Link></li><li aria-hidden>/</li><li className="font-medium text-ink" aria-current="page">{c.ref}</li></ol>
      </nav>

      <PageHeader
        title={client?.name ?? "Case"}
        description={`${c.ref} · ${visaLabel(c.visa)} visa · Consultant ${consultant?.name ?? "not assigned"}`}
        actions={
          <>
            {canMoveStage(d.user, c) && c.status === "active" && next && (
              next === "outcome" && d.user.role !== "admin"
                ? <span className="inline-flex min-h-11 items-center rounded-lg bg-brand-tint px-4 text-sm font-medium text-ink-muted">Outcome is recorded by an administrator</span>
                : <Button onClick={() => setDlg("move")}>Move to {stageLabel(next)}</Button>
            )}
            {editable && c.status === "active" && <Button variant="secondary" onClick={() => setTab("notes")}><StickyNote size={18} aria-hidden /> Add note</Button>}
            {editable && <Button variant="secondary" onClick={() => setDlg("edit")}><Pencil size={18} aria-hidden /> Edit details</Button>}
            {editable && c.status === "active" && <Button variant="secondary" onClick={() => setDlg("end")}>End or pause</Button>}
            {canReactivate(d.user) && ended && <Button onClick={() => setDlg("reactivate")}>Reactivate case</Button>}
            {canViewReports(d.user) && <Button variant="secondary" onClick={() => setDlg("pdf")}><FileDown size={18} aria-hidden /> PDF</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <VisaBadge visa={c.visa} /><StageBadge stage={c.stage} /><DaysBadge days={days} /><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /><DeadlineBadge iso={c.deadline} />
      </div>

      {ended && (
        <div role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">{st.label}</p>
          <p className="mt-1 text-sm">{showReason ? c.endReason ?? "No reason recorded." : "Details are available to administrators."}</p>
        </div>
      )}

      <div className="mb-5 rounded-xl border border-line bg-white p-5"><StageStepper current={c.stage} visa={c.visa} /></div>

      <div className="mb-6">
        <SituationSummary items={[
          { label: "What is happening", value: `${stageLabel(c.stage)} · ${days} days in this stage` },
          { label: "Completed so far", value: completed.length ? completed.join(", ") : "Nothing yet" },
          { label: "Waiting for", value: c.waitingFor },
          { label: "Next step", value: c.nextAction },
          { label: "Responsible", value: consultant?.name ?? "Not assigned" },
          { label: "Next deadline", value: <DeadlineBadge iso={c.deadline} /> },
          { label: "Last updated", value: fmtDateTime(c.updatedAt) },
        ]} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Client and application">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Item label="Client" value={<Link href={`/clients/${c.clientId}`} className="font-medium text-brand-deep hover:underline">{client?.name}</Link>} />
                <Item label="Visa type" value={visaLabel(c.visa)} />
                <Item label="Phone" value={client?.phone || "—"} />
                <Item label="Email" value={client?.email || "—"} />
                <Item label="Lead source" value={c.leadSource} />
                <Item label="Referral agent" value={agent?.name ?? "Direct enquiry"} />
                <Item label="Nationality" value={client?.nationality ?? "—"} />
                {canSeeOutcome(d.user) && <Item label="Outcome" value={c.status === "approved" ? "Approved" : c.status === "refused" ? "Refused" : "Not yet decided"} />}
              </dl>
            </Panel>
            <div className="space-y-6">
              <Panel title="Deadlines and assignment">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Item label="Assigned consultant" value={consultant?.name ?? "Not assigned"} />
                  <Item label="Visa team" value={visaLabel(c.visa)} />
                  <Item label="Stage started" value={fmtDate(c.stageSince)} />
                  <Item label="Deadline" value={fmtDate(c.deadline)} />
                </dl>
              </Panel>
              {canSeeCommission(d.user) && (
                <Panel title="Commission" description="Visible to administrators only.">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Item label="Commission" value={c.commissionSar ? fmtSar(c.commissionSar) : "Not recorded"} />
                    <Item label="Agent payment" value={agent ? (agent.paid ? "Paid" : "Pending") : "No agent"} />
                  </dl>
                </Panel>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <Panel title="Stage history" description="Every stage change, with who made it and when.">
            <Timeline items={[...c.history].reverse().map((h, i) => ({
              id: `h${i}`, title: h.from ? `${stageLabel(h.from)} → ${stageLabel(h.to)}` : `Enrolled at ${stageLabel(h.to)}`, meta: `${h.actor} · ${fmtDateTime(h.at)}`, body: h.note,
            }))} />
          </Panel>
        )}

        {tab === "eligibility" && (
          <Panel title="Eligibility assessment" action={editable && c.visa !== "visit" ? <Button variant="secondary" onClick={() => setDlg("assess")}>{assessment ? "Update assessment" : "Start assessment"}</Button> : undefined}>
            {c.visa === "visit" && <p className="mb-4 text-sm text-ink-muted">Assessment is skipped for Visit visas in the configured workflow.</p>}
            {assessment ? (
              <div className="space-y-5">
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Illustrative demo rules only. Real eligibility rules have not been supplied, so this is not an official decision.</p>
                {assessment.indicative && <p className="text-[15px]">Indicative result: <Pill tone={assessment.indicative === "Strong" ? "success" : assessment.indicative === "Moderate" ? "info" : "warning"}>{assessment.indicative}</Pill></p>}
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{assessment.inputs.map((i) => <Item key={i.label} label={i.label} value={i.value} />)}</dl>
                <div><h3 className="font-semibold">Missing information</h3>{assessment.missing.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{assessment.missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Nothing missing.</p>}</div>
                <p className="text-sm text-ink-muted">Rule version {assessment.ruleVersion} · Assessed by {assessment.assessedBy} on {fmtDate(assessment.assessedAt)}</p>
              </div>
            ) : c.visa !== "visit" ? <EmptyState title="No assessment yet" body="Record education, experience and language details to build the eligibility summary." /> : null}
          </Panel>
        )}

        {tab === "documents" && (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Panel title="Documents" description="Files are stored privately and open only through permission-checked links." flush>
                {docs.length === 0 ? <EmptyState title="No documents yet" body="Uploaded documents appear here with their review status." /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[15px]">
                      <caption className="sr-only">Documents</caption>
                      <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Document</th><th scope="col" className={th}>Category</th><th scope="col" className={th}>Uploaded</th><th scope="col" className={th}>Status</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {docs.map((x) => <DocRow key={x.id} doc={x} editable={editable} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              {editable ? <UploadBox caseId={c.id} /> : <Panel><p className="text-sm text-ink-muted">Only the assigned consultant or an administrator can upload documents.</p></Panel>}
            </div>
            <Panel title="Required documents" description={`${have.length} of ${CHECKLIST[c.visa].length} received for ${visaLabel(c.visa)}`}>
              <ul className="space-y-3">
                {CHECKLIST[c.visa].map((cat) => {
                  const ok = have.includes(cat);
                  return <li key={cat} className="flex items-center gap-3 text-[15px]">{ok ? <CheckCircle2 size={20} className="text-green-700" aria-label="Received" /> : <Circle size={20} className="text-slate-400" aria-label="Missing" />}<span className={ok ? "" : "text-ink-muted"}>{cat}</span></li>;
                })}
              </ul>
              <p className="mt-4 text-sm text-ink-muted">The checklist is configurable by visa type in a later phase.</p>
            </Panel>
          </div>
        )}

        {tab === "notes" && <NotesTab caseId={c.id} canAdd={editable && c.status === "active"} />}
      </div>

      {dlg === "move" && <MoveStageDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "end" && <EndCaseDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "edit" && <EditCaseDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "assess" && <AssessmentDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "reactivate" && <ConfirmDialog title="Reactivate this case?" body="The case returns to the pipeline at the stage where it stopped. The history is kept, and the stage timer restarts." confirmLabel="Reactivate" onConfirm={() => { d.reactivate(c.id); d.toast("Case reactivated. (Demo: not saved.)"); }} onClose={() => setDlg(null)} />}
      {dlg === "pdf" && (
        <ReportPreview title={`Client report: ${client?.name}`} subtitle={`${c.ref} · ${visaLabel(c.visa)} · ${fmtDate(new Date("2026-10-21T09:00:00+03:00").toISOString())}`} onClose={() => setDlg(null)}>
          <h3 className="mb-1 font-bold">Profile</h3>
          <p>{client?.name} · {client?.nationality} · {client?.phone} · {client?.email}</p>
          <h3 className="mb-1 mt-4 font-bold">Case</h3>
          <p>Stage: {stageLabel(c.stage)} · Consultant: {consultant?.name} · Deadline: {fmtDate(c.deadline)}</p>
          {assessment && (<><h3 className="mb-1 mt-4 font-bold">Eligibility assessment (illustrative)</h3><p>{assessment.inputs.map((i) => `${i.label}: ${i.value}`).join(" · ")}</p></>)}
          <h3 className="mb-1 mt-4 font-bold">Audit trail</h3>
          <table className="w-full border-collapse text-left"><thead><tr><th className="border-b p-1">Stage</th><th className="border-b p-1">Handler</th><th className="border-b p-1">Date</th></tr></thead><tbody>{c.history.map((h, i) => <tr key={i}><td className="border-b p-1">{stageLabel(h.to)}</td><td className="border-b p-1">{h.actor}</td><td className="border-b p-1">{fmtDate(h.at)}</td></tr>)}</tbody></table>
          <h3 className="mb-1 mt-4 font-bold">Notes</h3>
          {c.notes.length === 0 ? <p>No notes.</p> : <ul className="list-disc pl-5">{c.notes.map((n, i) => <li key={i}>{n.text} ({n.author}, {fmtDate(n.at)})</li>)}</ul>}
        </ReportPreview>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-sm font-medium text-ink-muted">{label}</dt><dd className="mt-1 text-[15px] text-ink">{value}</dd></div>;
}

function DocRow({ doc, editable }: { doc: Doc; editable: boolean }) {
  const d = useDemo();
  return (
    <tr>
      <td className={`${td} font-medium`}>{doc.name}</td>
      <td className={td}>{doc.category}</td>
      <td className={`${td} text-sm text-ink-muted`}>{doc.uploadedBy === "—" ? "Not uploaded yet" : `${doc.uploadedBy} · ${fmtDate(doc.at)}`}</td>
      <td className={td}>
        {editable ? (
          <>
            <label htmlFor={`ds-${doc.id}`} className="sr-only">Status of {doc.name}</label>
            <select id={`ds-${doc.id}`} className="h-10 rounded-lg border border-line bg-white px-2 text-sm" value={doc.status} onChange={(e) => { d.setDocStatus(doc.id, e.target.value as Doc["status"]); d.toast("Document status updated. (Demo: not saved.)"); }}>
              <option value="pending">Waiting for client</option><option value="received">Received</option><option value="verified">Verified</option>
            </select>
          </>
        ) : <Pill tone={DOC_TONE[doc.status]}>{DOC_LABEL[doc.status]}</Pill>}
      </td>
    </tr>
  );
}

function UploadBox({ caseId }: { caseId: string }) {
  const d = useDemo();
  const [category, setCategory] = useState("Passport");
  const [busy, setBusy] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const start = (file: File) => {
    setError("");
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setError("Only PDF, JPG or PNG files are accepted."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("That file is larger than 10 MB."); return; }
    let pct = 0;
    setBusy({ name: file.name, pct });
    const timer = setInterval(() => {
      pct += 20;
      if (pct >= 100) { clearInterval(timer); setBusy(null); d.addDoc(caseId, file.name, category); d.toast(`${file.name} uploaded. (Demo: the file itself is not stored.)`); }
      else setBusy({ name: file.name, pct });
    }, 250);
  };

  return (
    <Panel title="Upload a document">
      <div className="mb-4 max-w-xs">
        <label htmlFor="up-cat" className="mb-1.5 block text-sm font-semibold">Category</label>
        <select id="up-cat" className={field} value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <label
        htmlFor="up-file"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) start(f); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-brand bg-brand-soft" : "border-line hover:border-brand hover:bg-brand-tint"}`}
      >
        <UploadCloud aria-hidden size={28} className="text-brand-deep" />
        <span className="font-semibold">Drop a file here or choose a file</span>
        <span className="text-sm text-ink-muted">PDF, JPG or PNG. Maximum 10 MB.</span>
        <input id="up-file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) start(f); e.target.value = ""; }} />
      </label>
      {busy && (
        <div className="mt-4" role="status">
          <p className="mb-1 text-sm font-medium">Uploading {busy.name}… {busy.pct}%</p>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${busy.pct}%` }} /></div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{error}</p>}
    </Panel>
  );
}

function NotesTab({ caseId, canAdd }: { caseId: string; canAdd: boolean }) {
  const d = useDemo();
  const c = d.cases.find((x) => x.id === caseId)!;
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <Panel title="Case notes" description="Internal notes. Never shown to the client.">
          {c.notes.length === 0 ? <p className="text-sm text-ink-muted">No notes yet.</p> : (
            <ul className="space-y-4">{[...c.notes].reverse().map((n, i) => (<li key={i} className="rounded-lg border-l-4 border-brand bg-brand-tint p-4"><p className="text-[15px]">{n.text}</p><p className="mt-1 text-sm text-ink-muted">{n.author} · {fmtDateTime(n.at)}</p></li>))}</ul>
          )}
        </Panel>
      </div>
      {canAdd ? (
        <Panel title="Add a note">
          <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) { setErr("Write a note first."); return; } d.addCaseNote(caseId, text.trim()); d.toast("Note added. (Demo: not saved.)"); setText(""); setErr(""); }} noValidate>
            <label htmlFor="case-note" className="sr-only">Note</label>
            <textarea id="case-note" className={`${area} min-h-32`} value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="Write a clear, dated update for your team" />
            {err && <p role="alert" className="mt-1 text-sm font-medium text-red-800">{err}</p>}
            <div className="mt-3"><button type="submit" className={btn.primary}>Save note</button></div>
          </form>
        </Panel>
      ) : <Panel><p className="text-sm text-ink-muted">Notes can be added by the assigned consultant or an administrator on active cases.</p></Panel>}
    </div>
  );
}
