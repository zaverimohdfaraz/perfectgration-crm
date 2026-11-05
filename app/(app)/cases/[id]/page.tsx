"use client";

import Link from "next/link";
import { use, useState, type ReactNode } from "react";
import { CheckCircle2, FileDown, Pencil, Plus, StickyNote } from "@/components/icons";
import { PageHeader, Panel, Tabs, EmptyState, Button } from "@/components/ui";
import { DaysBadge, DeadlineBadge, Pill, StageBadge, StatusBadge, VisaBadge } from "@/components/status";
import { StageStepper } from "@/components/stage-stepper";
import { SituationSummary } from "@/components/situation-summary";
import { Timeline } from "@/components/timeline";
import { ConfirmDialog } from "@/components/modal";
import { AddDocumentDialog, AssessmentDialog, EditCaseDialog, EndCaseDialog, MoveStageDialog, ReturnQcDialog, SubmissionUpdateDialog, AssignDialog } from "@/components/dialogs-cases";
import { ReportPreview } from "@/components/dialogs-admin";
import { useDemo, nextStageFor } from "@/lib/store";
import { OWNER_LABEL, PRIORITY_LABEL, STAGES, STAGE_OWNER, SUBMISSION_LABEL, agentById, stageLabel, visaLabel, type Doc } from "@/lib/demo-data";
import { stagePeriods } from "@/lib/accountability";
import { canApproveQc, canClaim, canEditCase, canLogOutcome, canMoveStage, canReactivate, canReassign, canSeeCase, canSeeCommission, canSeeOutcomeOf, canViewReports, displayStatus } from "@/lib/permissions";
import { daysBetween, fmtDate, fmtDateTime, fmtSar } from "@/lib/dates";
import { area, btn, td, th } from "@/lib/styles";

const DOC_TONE = { verified: "success", received: "info", pending: "warning" } as const;
const DOC_LABEL = { verified: "Verified", received: "Received", pending: "Waiting for client" } as const;
const PRIO_TONE = { normal: "neutral", high: "warning", urgent: "danger" } as const;

type Dlg = null | "move" | "end" | "edit" | "assess" | "reactivate" | "pdf" | "doc" | "qc" | "submission" | "assign";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const d = useDemo();
  const c = d.cases.find((x) => x.id === id);
  const [tab, setTab] = useState("overview");
  const [dlg, setDlg] = useState<Dlg>(null);

  if (!c || !canSeeCase(d.user, c)) {
    return (
      <Panel><EmptyState title="Case not found" body="It may have been removed, or you may not have access to it."><Link href="/cases" className={btn.primary}>Back to cases</Link></EmptyState></Panel>
    );
  }

  const client = d.clients.find((x) => x.id === c.clientId);
  const person = (pid: string) => d.users.find((u) => u.id === pid);
  const consultant = c.route ? undefined : person(c.consultantId);
  const agent = agentById(c.agentId) ?? d.agents.find((a) => a.id === c.agentId);
  const st = displayStatus(d.user, c);
  const days = daysBetween(c.stageSince);
  const editable = canEditCase(d.user, c);
  const next = nextStageFor(c);
  const ended = c.status === "on_hold" || c.status === "returned" || c.status === "withdrawn" || c.status === "refused";
  const completed = STAGES.slice(0, STAGES.findIndex((s) => s.id === c.stage)).filter((s) => !(c.visa === "visit" && s.id === "docassess")).map((s) => s.label);
  const docs = d.docs.filter((x) => x.caseId === c.id);
  const assessment = d.assessments[c.id];
  const showReason = !((c.status === "refused" || c.status === "approved") && !canSeeOutcomeOf(d.user, c));
  const ownerLabel = OWNER_LABEL[STAGE_OWNER[c.stage]];
  const qcBlocked = next === "submitted" && !c.qcApprovedAt;
  const handoff = next && next !== "outcome" && STAGE_OWNER[next] !== STAGE_OWNER[c.stage];
  const claimable = canClaim(d.user, c);
  const periods = stagePeriods(c, d.sla);
  const counts = { total: docs.length, waiting: docs.filter((x) => x.status === "pending").length, received: docs.filter((x) => x.status === "received").length, verified: docs.filter((x) => x.status === "verified").length };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "Stage history", count: c.history.length },
    { id: "eligibility", label: "Document assessment" },
    { id: "accountability", label: "Accountability" },
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
        description={`${c.ref} · ${visaLabel(c.visa)} visa · ${c.destination} · Responsible: ${c.route ? `waiting for someone in the ${OWNER_LABEL[c.route.to]} to accept` : `${consultant?.name ?? "not assigned"} (${ownerLabel})`}`}
        actions={
          <>
            {claimable && c.status === "active" && <Button onClick={() => { d.claimCase(c.id); d.toast("You accepted this case. It is now yours. (Demo: not saved.)"); }}>Accept this {c.route?.to === "sales" ? "lead" : "case"}</Button>}
            {c.status === "active" && next && !c.route && (
              next === "outcome"
                ? (canLogOutcome(d.user, c)
                    ? <Button onClick={() => setDlg("move")}>Record result</Button>
                    : <span className="inline-flex min-h-11 items-center rounded-lg bg-brand-tint px-4 text-sm font-medium text-ink-muted">Awaiting result: the case manager records it</span>)
                : canMoveStage(d.user, c) && <Button disabled={qcBlocked} onClick={() => setDlg("move")}>{handoff ? `Pass to ${OWNER_LABEL[STAGE_OWNER[next]]}` : `Move to ${stageLabel(next)}`}</Button>
            )}
            {editable && c.status === "active" && <Button variant="secondary" onClick={() => setTab("notes")}><StickyNote size={18} aria-hidden /> Add note</Button>}
            {(editable || canReassign(d.user)) && <Button variant="secondary" onClick={() => setDlg("edit")}><Pencil size={18} aria-hidden /> {canReassign(d.user) ? "Edit or reassign" : "Edit details"}</Button>}
            {editable && c.status === "active" && <Button variant="secondary" onClick={() => setDlg("end")}>End or pause</Button>}
            {canReactivate(d.user) && ended && <Button onClick={() => setDlg("reactivate")}>Reactivate case</Button>}
            {canViewReports(d.user) && <Button variant="secondary" onClick={() => setDlg("pdf")}><FileDown size={18} aria-hidden /> PDF</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <VisaBadge visa={c.visa} /><StageBadge stage={c.stage} /><DaysBadge days={days} /><StatusBadge status={c.status} label={st.label} restricted={st.restricted} /><DeadlineBadge iso={c.deadline} />
        {c.priority !== "normal" && <Pill tone={PRIO_TONE[c.priority]}>{PRIORITY_LABEL[c.priority]} priority</Pill>}
      </div>

      {ended && (
        <div role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">{st.label}</p>
          <p className="mt-1 text-sm">{showReason ? c.endReason ?? "No reason recorded." : "Details are available to Admin and Manager."}</p>
        </div>
      )}

      {qcBlocked && c.status === "active" && (
        <p role="status" className="mb-5 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950">Waiting for the review sign-off before this case can be submitted.</p>
      )}

      {c.route && c.status === "active" && (
        <div role="status" className="mb-5 rounded-xl border border-brand/40 bg-brand-soft p-5">
          <p className="font-semibold">Waiting to be accepted by the {OWNER_LABEL[c.route.to]}</p>
          <p className="mt-1 text-sm">{c.route.kind === "visa" ? `Only the ${visaLabel(c.route.visa ?? c.visa)} team can see this.` : "Everyone on the team can see this."} Passed by {c.route.by} on {fmtDateTime(c.route.at)}. The first person to accept it gets access.</p>
          {canReassign(d.user) && <div className="mt-3"><Button variant="secondary" onClick={() => setDlg("assign")}>Assign to someone</Button></div>}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-line bg-white p-5"><StageStepper current={c.stage} visa={c.visa} /></div>

      {c.stage === "review" && c.status === "active" && (
        <div className="mb-5">
          <Panel title="Review" description="A reviewer signs off the file before it is submitted. Submit on the same day as approval.">
            {c.qcApprovedAt ? (
              <p className="flex items-start gap-2 text-[0.9375rem]"><CheckCircle2 size={20} aria-hidden className="mt-0.5 shrink-0 text-green-700" /> <span><strong>Review approved</strong> by {c.qcBy ?? "a manager"} on {fmtDateTime(c.qcApprovedAt)}. Submit within 2 days.</span></p>
            ) : (
              <>
                <p className="text-[0.9375rem]"><Pill tone="warning">Awaiting QC sign-off</Pill></p>
                {c.qcNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><strong>Returned for changes:</strong> {c.qcNote}</p>}
                {canApproveQc(d.user) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => { d.approveQc(c.id); d.toast("Review approved. The case manager can now submit. (Demo: not saved.)"); }}>Approve review</Button>
                    <Button variant="secondary" onClick={() => setDlg("qc")}>Return for changes</Button>
                  </div>
                ) : <p className="mt-3 text-sm text-ink-muted">A manager or administrator reviews and signs off the file.</p>}
              </>
            )}
          </Panel>
        </div>
      )}

      {(c.stage === "submitted" || c.stage === "outcome") && c.submittedAt && (
        <div className="mb-5">
          <Panel title="Submission" description={`Submitted on ${fmtDateTime(c.submittedAt)}. Record what happens next, then the result.`}
            action={editable && c.stage === "submitted" && c.status === "active" ? <Button variant="secondary" onClick={() => setDlg("submission")}><Plus size={18} aria-hidden /> Record what happened</Button> : undefined}>
            <ul className="space-y-3">
              {[...(c.submissionLog ?? [])].reverse().map((e, i) => (
                <li key={i} className="rounded-lg border-l-4 border-brand bg-brand-tint p-3 text-[0.9375rem]"><p className="font-semibold">{SUBMISSION_LABEL[e.status]}</p>{e.note && <p className="text-ink-muted">{e.note}</p>}<p className="text-sm text-ink-muted">{e.by} · {fmtDateTime(e.at)}</p></li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mb-6">
        <SituationSummary items={[
          { label: "What is happening", value: `${stageLabel(c.stage)} · ${days} days in this stage` },
          { label: "Completed so far", value: completed.length ? completed.join(", ") : "Nothing yet" },
          { label: "Waiting for", value: c.waitingFor },
          { label: "Next step", value: c.nextAction },
          { label: "Responsible", value: `${consultant?.name ?? "Not assigned"} (${ownerLabel})` },
          { label: "Next deadline", value: <DeadlineBadge iso={c.deadline} /> },
          { label: "Last updated", value: fmtDateTime(c.updatedAt) },
        ]} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <Panel title="Client and application">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Item label="Client" value={<Link href={`/clients/${c.clientId}`} className="font-medium text-brand-deep hover:underline">{client?.name}</Link>} />
                  <Item label="Visa type" value={visaLabel(c.visa)} />
                  <Item label="Destination" value={c.destination} />
                  <Item label="Budget" value={c.budget ? fmtSar(c.budget) : "Not given"} />
                  <Item label="Phone" value={client?.phone || "—"} />
                  <Item label="Email" value={client?.email || "—"} />
                  <Item label="Lead source" value={c.leadSource} />
                  <Item label="Referral agent" value={agent?.name ?? "Direct enquiry"} />
                  <Item label="Nationality" value={client?.nationality ?? "—"} />
                  {canSeeOutcomeOf(d.user, c) && <Item label="Result" value={c.status === "approved" ? "Approved" : c.status === "refused" ? "Denied" : "Not yet decided"} />}
                </dl>
              </Panel>
              {(c.appointmentAt || c.agreementSigned || c.docsVerified) && (
                <Panel title="Process checkpoints">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {c.appointmentAt && <Item label="Office appointment" value={fmtDate(c.appointmentAt)} />}
                    {c.agreementSigned && <Item label="Agreement" value="Signed" />}
                    {c.feesCollectedSar ? <Item label="Fees collected" value={fmtSar(c.feesCollectedSar)} /> : null}
                    {c.docsVerified && <Item label="Documents verified" value="Yes (completeness and translations)" />}
                    {c.submittedAt && <Item label="Submitted" value={fmtDateTime(c.submittedAt)} />}
                    {c.qcApprovedAt && <Item label="Review approved" value={`${c.qcBy ?? "Manager"} · ${fmtDate(c.qcApprovedAt)}`} />}
                  </dl>
                </Panel>
              )}
            </div>
            <div className="space-y-6">
              <Panel title="People on this case" description="Responsibility moves between teams at each handoff.">
                <ul className="divide-y divide-line">
                  {([["social", "Lead captured by", c.leadById], ["sales", "Sales team member", c.salesId], ["case", "Case manager", c.caseManagerId]] as const).map(([owner, label, pid]) => {
                    const p = person(pid);
                    const current = STAGE_OWNER[c.stage] === owner;
                    const waiting = !p && current && !!c.route;
                    return (
                      <li key={owner} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div><p className="text-sm text-ink-muted">{label}</p><p className="font-semibold">{p?.name ?? (waiting ? "Waiting to be accepted" : "Not assigned yet")}</p></div>
                        <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-ink-muted">{OWNER_LABEL[owner]}</span>{current && <Pill tone={waiting ? "warning" : "info"}>{waiting ? "Unclaimed" : "Responsible now"}</Pill>}</div>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
              <Panel title="Deadlines">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
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
          <Panel title="Step history" description="Every step change, handoff, acceptance and reassignment, with who did it and when.">
            <Timeline items={[...c.history].reverse().map((h, i) => ({
              id: `h${i}`, title: h.kind === "claim" ? "Accepted" : h.kind === "assign" ? "Assigned by admin" : h.from && h.from !== h.to ? `${stageLabel(h.from)} → ${stageLabel(h.to)}` : `Lead created at ${stageLabel(h.to)}`, meta: `${h.actor} · ${fmtDateTime(h.at)}`, body: [h.handoff, h.note].filter(Boolean).join(" · ") || undefined,
            }))} />
          </Panel>
        )}

        {tab === "eligibility" && (
          <Panel title="Document assessment" action={editable && c.visa !== "visit" ? <Button variant="secondary" onClick={() => setDlg("assess")}>{assessment ? "Update assessment" : "Start assessment"}</Button> : undefined}>
            {c.visa === "visit" && <p className="mb-4 text-sm text-ink-muted">Document assessment is skipped for Visit visas in the configured workflow.</p>}
            {assessment ? (
              <div className="space-y-5">
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Illustrative demo rules only. Real eligibility rules have not been supplied, so this is not an official decision.</p>
                {assessment.indicative && <p className="text-[0.9375rem]">Indicative result: <Pill tone={assessment.indicative === "Strong" ? "success" : assessment.indicative === "Moderate" ? "info" : "warning"}>{assessment.indicative}</Pill></p>}
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{assessment.inputs.map((i) => <Item key={i.label} label={i.label} value={i.value} />)}</dl>
                <div><h3 className="font-semibold">Missing information</h3>{assessment.missing.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">{assessment.missing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Nothing missing.</p>}</div>
                <p className="text-sm text-ink-muted">Rule version {assessment.ruleVersion} · Assessed by {assessment.assessedBy} on {fmtDate(assessment.assessedAt)}</p>
              </div>
            ) : c.visa !== "visit" ? <EmptyState title="No assessment yet" body="Record education, experience and language details to build the eligibility summary." /> : null}
          </Panel>
        )}

        {tab === "accountability" && (
          <Panel title="Accountability" description="Who held each step, how long it took, and whether it ran past the days allowed. This shows where the case got stuck." flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[0.9375rem]">
                <caption className="sr-only">Time spent at each step</caption>
                <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Step</th><th scope="col" className={th}>Team</th><th scope="col" className={th}>Held by</th><th scope="col" className={th}>Started</th><th scope="col" className={th}>Time taken</th><th scope="col" className={th}>Result</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {periods.map((p, i) => (
                    <tr key={i} className={p.late ? "bg-red-50/60" : ""}>
                      <td className={`${td} font-medium`}>{stageLabel(p.stage)}</td>
                      <td className={td}>{OWNER_LABEL[p.owner]}</td>
                      <td className={td}>{p.ownerId ? person(p.ownerId)?.name : <span className="text-ink-muted">Unclaimed</span>}{p.waitedDays !== undefined && <p className="text-xs text-ink-muted">Waited {p.waitedDays} {p.waitedDays === 1 ? "day" : "days"} to be accepted</p>}</td>
                      <td className={td}>{fmtDate(p.enteredAt)}</td>
                      <td className={`${td} tabular-nums`}>{p.days} {p.days === 1 ? "day" : "days"} <span className="text-ink-muted">of {p.allowed}</span></td>
                      <td className={td}>{p.current ? <Pill tone={p.late ? "danger" : "info"}>{p.late ? "Stuck here now" : "In progress"}</Pill> : <Pill tone={p.late ? "danger" : "success"}>{p.late ? `Late by ${p.days - p.allowed}` : "On time"}</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "documents" && (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Panel title="Documents" description="Add each document this case needs and give it a name. Files are stored privately and open only through permission-checked links." flush
                action={(editable || d.user.role === "admin") ? <Button onClick={() => setDlg("doc")}><Plus size={18} aria-hidden /> Add document</Button> : undefined}>
                {docs.length === 0 ? (
                  <EmptyState title="No documents added yet" body="There is no fixed list yet. Use Add document to name each document the client needs to provide, and attach the file when it arrives." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-[0.9375rem]">
                      <caption className="sr-only">Documents</caption>
                      <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Document</th><th scope="col" className={th}>Added</th><th scope="col" className={th}>Status</th><th scope="col" className={th}><span className="sr-only">Actions</span></th></tr></thead>
                      <tbody className="divide-y divide-line">{docs.map((x) => <DocRow key={x.id} doc={x} editable={editable} />)}</tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
            <Panel title="Document summary">
              <dl className="grid grid-cols-2 gap-4">
                <Item label="Added" value={counts.total} /><Item label="Waiting for client" value={counts.waiting} />
                <Item label="Received" value={counts.received} /><Item label="Verified" value={counts.verified} />
              </dl>
              <p className="mt-4 text-sm text-ink-muted">Check completeness and translations, then confirm documents are verified when moving to Case Prep.{c.docsVerified ? " This case's documents are marked as verified." : ""}</p>
            </Panel>
          </div>
        )}

        {tab === "notes" && <NotesTab caseId={c.id} canAdd={editable && c.status === "active"} />}
      </div>

      {dlg === "move" && <MoveStageDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "end" && <EndCaseDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "edit" && <EditCaseDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "assess" && <AssessmentDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "doc" && <AddDocumentDialog caseId={c.id} onClose={() => setDlg(null)} />}
      {dlg === "assign" && <AssignDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "submission" && <SubmissionUpdateDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "qc" && <ReturnQcDialog c={c} onClose={() => setDlg(null)} />}
      {dlg === "reactivate" && <ConfirmDialog title="Reactivate this case?" body="The case returns to the pipeline at the stage where it stopped. The history is kept, and the stage timer restarts." confirmLabel="Reactivate" onConfirm={() => { d.reactivate(c.id); d.toast("Case reactivated. (Demo: not saved.)"); }} onClose={() => setDlg(null)} />}
      {dlg === "pdf" && (
        <ReportPreview title={`Client report: ${client?.name}`} subtitle={`${c.ref} · ${visaLabel(c.visa)} · ${fmtDate(new Date("2026-10-21T09:00:00+03:00").toISOString())}`} onClose={() => setDlg(null)}>
          <h3 className="mb-1 font-bold">Profile</h3>
          <p>{client?.name} · {client?.nationality} · {client?.phone} · {client?.email}</p>
          <h3 className="mb-1 mt-4 font-bold">Case</h3>
          <p>Stage: {stageLabel(c.stage)} ({ownerLabel}) · Responsible: {consultant?.name} · Destination: {c.destination} · Deadline: {fmtDate(c.deadline)}</p>
          {assessment && (<><h3 className="mb-1 mt-4 font-bold">Eligibility assessment (illustrative)</h3><p>{assessment.inputs.map((i) => `${i.label}: ${i.value}`).join(" · ")}</p></>)}
          <h3 className="mb-1 mt-4 font-bold">Audit trail</h3>
          <table className="w-full border-collapse text-left"><thead><tr><th className="border-b p-1">Stage</th><th className="border-b p-1">Handler</th><th className="border-b p-1">Date</th><th className="border-b p-1">Handoff</th></tr></thead><tbody>{c.history.map((h, i) => <tr key={i}><td className="border-b p-1">{stageLabel(h.to)}</td><td className="border-b p-1">{h.actor}</td><td className="border-b p-1">{fmtDate(h.at)}</td><td className="border-b p-1">{h.handoff ?? ""}</td></tr>)}</tbody></table>
          <h3 className="mb-1 mt-4 font-bold">Notes</h3>
          {c.notes.length === 0 ? <p>No notes.</p> : <ul className="list-disc pl-5">{c.notes.map((n, i) => <li key={i}>{n.text} ({n.author}, {fmtDate(n.at)})</li>)}</ul>}
        </ReportPreview>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-sm font-medium text-ink-muted">{label}</dt><dd className="mt-1 text-[0.9375rem] text-ink">{value}</dd></div>;
}

function DocRow({ doc, editable }: { doc: Doc; editable: boolean }) {
  const d = useDemo();
  const attach = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { d.toast("Only PDF, JPG or PNG files are accepted.", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { d.toast("That file is larger than 10 MB.", "error"); return; }
    d.attachDoc(doc.id, file.name);
    d.toast(`${file.name} attached. (Demo: the file itself is not stored.)`);
  };
  return (
    <tr>
      <td className={td}>
        <p className="font-medium">{doc.name}</p>
        <p className="text-sm text-ink-muted">{[doc.fileName, doc.note].filter(Boolean).join(" · ") || (doc.category || "No file yet")}</p>
        {doc.needsTranslation && <span className="mt-1 inline-block"><Pill tone="info">Needs translation</Pill></span>}
      </td>
      <td className={`${td} text-sm text-ink-muted`}>{doc.uploadedBy === "—" ? "Waiting for the client" : `${doc.uploadedBy} · ${fmtDate(doc.at)}`}</td>
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
      <td className={`${td} text-right`}>
        {editable && doc.status === "pending" && (
          <label className={`${btn.secondary} !min-h-10 cursor-pointer text-sm`}>
            Attach file
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
      </td>
    </tr>
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
            <ul className="space-y-4">{[...c.notes].reverse().map((n, i) => (<li key={i} className="rounded-lg border-l-4 border-brand bg-brand-tint p-4"><p className="text-[0.9375rem]">{n.text}</p><p className="mt-1 text-sm text-ink-muted">{n.author} · {fmtDateTime(n.at)}</p></li>))}</ul>
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
      ) : <Panel><p className="text-sm text-ink-muted">Notes can be added by the person responsible for this stage, or an administrator, on active cases.</p></Panel>}
    </div>
  );
}
