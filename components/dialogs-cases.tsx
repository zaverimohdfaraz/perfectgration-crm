"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal, ModalActions } from "./modal";
import { Field } from "./form";
import { btn, field, area } from "@/lib/styles";
import { useDemo, nextStageFor } from "@/lib/store";
import { DESTINATIONS, LEAD_SOURCES, OWNER_LABEL, PRIORITY_LABEL, STAGE_OWNER, VISA_TYPES, responsibleFor, stageLabel, userById, type Case, type CaseStatus, type Priority, type StageId, type TeamId } from "@/lib/demo-data";
import { canLogOutcome } from "@/lib/permissions";
import { fmtDate, isoFromToday } from "@/lib/dates";
import { NATIONALITIES, digits, fromDateInput, toDateInput } from "@/lib/forms";

/* ─── Add client / new case (lead intake) ───────────────── */
export function IntakeDialog({ mode, presetClientId, onClose }: { mode: "client" | "case"; presetClientId?: string; onClose: () => void }) {
  const d = useDemo();
  const router = useRouter();
  const restricted = d.user.role === "consultant" && d.user.workTeam !== "social";
  const visaOptions = VISA_TYPES.filter((v) => !restricted || d.user.teams.includes(v.id));

  const [clientMode, setClientMode] = useState<"existing" | "new">(mode === "case" && d.clients.length > 0 ? "existing" : "new");
  const [clientId, setClientId] = useState(presetClientId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("Saudi");
  const [alsoCase, setAlsoCase] = useState(true);
  const [visa, setVisa] = useState<TeamId>(visaOptions[0]?.id ?? "study");
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [budget, setBudget] = useState("");
  const [source, setSource] = useState("Instagram");
  const [priority, setPriority] = useState<Priority>("normal");
  const [salesId, setSalesId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupId, setDupId] = useState<string | null>(null);

  const useNewClient = mode === "client" || clientMode === "new";
  const needCase = mode === "case" || alsoCase;
  const eligible = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === "sales" && u.teams.includes(visa));
  const sales = salesId || (d.user.workTeam === "sales" && eligible.some((u) => u.id === d.user.id) ? d.user.id : eligible[0]?.id ?? "");

  const create = (skipDup: boolean) => {
    const e: Record<string, string> = {};
    if (useNewClient) {
      if (!name.trim()) e.name = "Enter the client's name.";
      if (!phone.trim() && !email.trim()) e.phone = "Enter a phone number or an email address.";
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "That email address does not look right.";
    } else if (!clientId) e.client = "Choose a client.";
    if (needCase && !sales) e.sales = "No sales consultant is available for this visa type.";
    setErrors(e);
    if (Object.keys(e).length) return;

    if (useNewClient && !skipDup) {
      const dup = d.clients.find((c) => (phone && digits(c.phone) === digits(phone)) || (email && c.email.toLowerCase() === email.trim().toLowerCase()));
      if (dup) { setDupId(dup.id); return; }
    }

    const client = useNewClient ? d.addClient({ name, phone, email, nationality }) : d.clients.find((c) => c.id === clientId)!;
    if (needCase) {
      const created = d.addCase({ clientId: client.id, visa, salesId: sales, leadSource: source, priority, destination, budget: budget ? Number(budget) : undefined, agentId: agentId || undefined, note: note.trim() || undefined });
      d.toast(`${client.name} is enrolled as ${created.ref} and assigned to ${userById(sales)?.name ?? "Sales"}. (Demo: not saved.)`);
      onClose();
      router.push(`/cases/${created.id}`);
    } else {
      d.toast(`${client.name} added to your clients. (Demo: not saved.)`);
      onClose();
      router.push(`/clients/${client.id}`);
    }
  };

  const dup = dupId ? d.clients.find((c) => c.id === dupId) : null;

  return (
    <Modal title={mode === "client" ? "Add client" : "New lead / case"} description="Capture the lead, note what they are interested in, then assign them to a Sales consultant." onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); create(false); }} noValidate className="space-y-5">
        {mode === "case" && (
          <fieldset className="flex flex-wrap gap-5">
            <legend className="mb-2 text-sm font-semibold">Client</legend>
            <label className="flex min-h-11 items-center gap-2 text-[15px]"><input type="radio" name="cm" checked={clientMode === "existing"} onChange={() => setClientMode("existing")} className="h-4 w-4 accent-[#009FE3]" /> Existing client</label>
            <label className="flex min-h-11 items-center gap-2 text-[15px]"><input type="radio" name="cm" checked={clientMode === "new"} onChange={() => setClientMode("new")} className="h-4 w-4 accent-[#009FE3]" /> New client</label>
          </fieldset>
        )}

        {useNewClient ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Full name" htmlFor="ic-name" required error={errors.name}><input id="ic-name" className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field></div>
            <Field label="Phone / WhatsApp" htmlFor="ic-phone" error={errors.phone}><input id="ic-phone" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" inputMode="tel" /></Field>
            <Field label="Email" htmlFor="ic-email" error={errors.email}><input id="ic-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Nationality" htmlFor="ic-nat"><select id="ic-nat" className={field} value={nationality} onChange={(e) => setNationality(e.target.value)}>{NATIONALITIES.map((n) => <option key={n}>{n}</option>)}</select></Field>
          </div>
        ) : (
          <Field label="Choose client" htmlFor="ic-client" required error={errors.client}>
            <select id="ic-client" className={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {d.clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.nationality}</option>)}
            </select>
          </Field>
        )}

        {dup && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-950">
            <p className="font-semibold">This looks like an existing client: {dup.name}</p>
            <p className="mt-1">The phone number or email matches. Records are never merged automatically.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/clients/${dup.id}`} onClick={onClose} className={`${btn.secondary} !min-h-10 text-sm`}>Open {dup.name}</Link>
              <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => create(true)}>Create anyway</button>
            </div>
          </div>
        )}

        {mode === "client" && (
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-medium">
            <input type="checkbox" checked={alsoCase} onChange={(e) => setAlsoCase(e.target.checked)} className="h-5 w-5 accent-[#009FE3]" /> Enrol in the CRM now (starts at Enrolled and goes to Sales)
          </label>
        )}

        {needCase && (
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Qualify interest</p>
            <Field label="Visa type" htmlFor="ic-visa"><select id="ic-visa" className={field} value={visa} onChange={(e) => { setVisa(e.target.value as TeamId); setSalesId(""); }}>{visaOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></Field>
            <Field label="Destination" htmlFor="ic-dest"><select id="ic-dest" className={field} value={destination} onChange={(e) => setDestination(e.target.value)}>{DESTINATIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Budget (SAR)" htmlFor="ic-budget" hint="Optional"><input id="ic-budget" type="number" min="0" className={field} value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
            <Field label="Lead source" htmlFor="ic-src"><select id="ic-src" className={field} value={source} onChange={(e) => setSource(e.target.value)}>{LEAD_SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <p className="mt-2 text-sm font-semibold sm:col-span-2">Assign to Sales</p>
            <Field label="Sales consultant" htmlFor="ic-sales" required error={errors.sales} hint="They take over after enrolment and must make the first call within 24 hours.">
              <select id="ic-sales" className={field} value={sales} onChange={(e) => setSalesId(e.target.value)}>
                {eligible.length === 0 && <option value="">No one on this department</option>}
                {eligible.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Priority" htmlFor="ic-prio"><select id="ic-prio" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
            <Field label="Referral agent" htmlFor="ic-agent" hint="Optional"><select id="ic-agent" className={field} value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Direct enquiry</option>{d.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="First note" htmlFor="ic-note" hint="Optional. Internal only."><textarea id="ic-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
          </div>
        )}

        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>{needCase ? "Enrol and assign to Sales" : "Add client"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Move stage ────────────────────────────────────────── */
type StageField = { id: string; label: string; type: "text" | "date" | "number" | "select" | "check"; options?: string[] };
const STAGE_FIELDS: Partial<Record<StageId, StageField[]>> = {
  firstcall: [{ id: "summary", label: "Summary of the first call", type: "text" }],
  assessment: [{ id: "done", label: "Assessment completed and the result shared with the client", type: "check" }],
  appointment: [{ id: "date", label: "Appointment date", type: "date" }, { id: "place", label: "Location", type: "text" }],
  deal: [{ id: "visit", label: "The client attended the office visit", type: "check" }, { id: "fee", label: "Deal fee agreed (SAR)", type: "number" }],
  documents: [{ id: "agreement", label: "Agreement signed", type: "check" }, { id: "fees", label: "Fees collected (SAR)", type: "number" }, { id: "payment", label: "Payment confirmed", type: "check" }],
  caseprep: [{ id: "verified", label: "Documents verified: completeness check and translations done", type: "check" }],
  submitted: [{ id: "ref", label: "Submission reference", type: "text" }, { id: "to", label: "Submitted to", type: "select", options: ["Embassy", "VFS Global", "BLS International", "Other"] }, { id: "booking", label: "VFS or embassy booking date", type: "date" }],
};

export function MoveStageDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const to = nextStageFor(c);
  if (!to) return null;
  return to === "outcome" ? <OutcomeDialog c={c} onClose={onClose} /> : <StageMove c={c} to={to} onClose={onClose} />;
}

function StageMove({ c, to, onClose }: { c: Case; to: StageId; onClose: () => void }) {
  const d = useDemo();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [managerId, setManagerId] = useState(c.caseManagerId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = STAGE_FIELDS[to] ?? [];
  const ownerChanged = STAGE_OWNER[c.stage] !== STAGE_OWNER[to];
  const managers = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === "case" && u.teams.includes(c.visa));
  const ids = { leadById: c.leadById, salesId: c.salesId, caseManagerId: to === "documents" ? managerId : c.caseManagerId };
  const configured = userById(d.handlers[`${c.visa}:${to}`] ?? "");
  const next = configured ?? d.users.find((u) => u.id === responsibleFor(to, ids));
  const needsQc = to === "submitted" && !c.qcApprovedAt;
  const skipped = c.visa === "visit" && c.stage === "firstcall" ? "Assessment is skipped for Visit visas." : null;

  const submit = () => {
    const e: Record<string, string> = {};
    fields.forEach((f) => { if (!vals[f.id] || vals[f.id] === "false") e[f.id] = f.type === "check" ? "Tick this to continue." : "This is required."; });
    if (to === "documents" && !managerId) e.manager = "Choose the case manager who takes over.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const bits = fields.filter((f) => f.type !== "check").map((f) => `${f.label}: ${vals[f.id]}`);
    const text = [`Moved to ${stageLabel(to)}.`, bits.join(". "), note.trim()].filter(Boolean).join(" ");
    d.moveStage(c.id, { note: text, caseManagerId: to === "documents" ? managerId : undefined, appointmentAt: to === "appointment" && vals.date ? fromDateInput(vals.date) : undefined, fees: to === "documents" ? Number(vals.fees) : undefined });
    d.toast(`Moved to ${stageLabel(to)}.${ownerChanged ? ` Handed over to ${next?.name ?? "the next owner"}.` : ""} (Demo: not saved.)`);
    onClose();
  };

  return (
    <Modal title="Move to next stage" description="Check the details, then confirm. The change is recorded in the case history." onClose={onClose}>
      <div className="flex items-center gap-3 rounded-lg bg-brand-tint p-4 text-[15px]">
        <span className="font-semibold">{stageLabel(c.stage)}</span><span aria-hidden>→</span><span className="font-bold text-brand-deep">{stageLabel(to)}</span>
      </div>
      {skipped && <p className="mt-3 text-sm text-ink-muted">{skipped}</p>}

      {needsQc ? (
        <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">A manager must approve the QC review before this case can be submitted. Ask a manager to sign off from the case page.</p>
      ) : (
        <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="mt-5 space-y-4">
          {ownerChanged && (
            <div className="rounded-lg border border-brand/40 bg-brand-soft p-4 text-[15px]">
              <p className="font-semibold">Handoff to the {OWNER_LABEL[STAGE_OWNER[to]]}</p>
              <p className="mt-1 text-sm text-ink-muted">{next ? `${next.name} takes over this case.` : "Choose who takes over."}</p>
            </div>
          )}

          {fields.map((f) => (
            <Field key={f.id} label={f.type === "check" ? "Confirmation" : f.label} htmlFor={`mv-${f.id}`} required error={errors[f.id]}>
              {f.type === "check" ? (
                <label className="flex min-h-11 items-center gap-3 text-[15px]"><input id={`mv-${f.id}`} type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={vals[f.id] === "true"} onChange={(e) => setVals({ ...vals, [f.id]: String(e.target.checked) })} /> {f.label}</label>
              ) : f.type === "select" ? (
                <select id={`mv-${f.id}`} className={field} value={vals[f.id] ?? ""} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })}><option value="">Select</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
              ) : (
                <input id={`mv-${f.id}`} type={f.type} className={field} value={vals[f.id] ?? ""} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })} />
              )}
            </Field>
          ))}

          {to === "documents" && (
            <Field label="Case manager who takes over" htmlFor="mv-manager" required error={errors.manager}>
              <select id="mv-manager" className={field} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                <option value="">Select a case manager</option>
                {managers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Note" htmlFor="mv-note" hint="Optional. Added to the case history."><textarea id="mv-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>

          <ul className="space-y-1 rounded-lg border border-line p-4 text-sm text-ink-muted">
            <li>New deadline: <strong className="text-ink">{fmtDate(isoFromToday(d.sla[to]))}</strong> ({d.sla[to]} {d.sla[to] === 1 ? "day" : "days"} from today)</li>
            <li>Responsible: <strong className="text-ink">{next?.name ?? userById(c.consultantId)?.name}</strong> ({OWNER_LABEL[STAGE_OWNER[to]]}){configured ? " · default handler for this stage" : ""}</li>
            <li>Time in the current stage restarts.</li>
          </ul>

          <ModalActions>
            <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={btn.primary}>Confirm move</button>
          </ModalActions>
        </form>
      )}
      {needsQc && <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Close</button></ModalActions>}
    </Modal>
  );
}

/* ─── Outcome: monitor status, then log the decision ────── */
function OutcomeDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [result, setResult] = useState<"approved" | "refused">("approved");
  const [notified, setNotified] = useState(false);
  const [commission, setCommission] = useState("");
  const [followUp, setFollowUp] = useState<"appeal" | "reapply" | "none">("none");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const allowed = canLogOutcome(d.user);

  const submit = () => {
    if (result === "approved" && !notified) { setErr("Tick this once the client has been notified."); return; }
    d.logOutcome(c.id, { result, commission: d.user.role === "admin" && commission ? Number(commission) : undefined, followUp: result === "refused" ? followUp : undefined, note: note.trim() || undefined });
    d.toast(result === "approved" ? "Visa approved. The client is notified. (Demo: not saved.)" : followUp === "appeal" ? "Refused. The case goes back to Case Prep for an appeal. (Demo: not saved.)" : followUp === "reapply" ? "Refused. A new case was opened for the re-application. (Demo: not saved.)" : "Refusal logged. Review appeal options within 48 hours. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="Log the visa outcome" description="Monitor the embassy or VFS portal, then record the decision on the day it is known." onClose={onClose}>
      {!allowed ? (
        <>
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">The outcome is logged by an Admin or Manager. Ask them to record the decision.</p>
          <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Close</button></ModalActions>
        </>
      ) : (
        <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
          <Field label="Decision" htmlFor="oc-result" required>
            <select id="oc-result" className={field} value={result} onChange={(e) => { setResult(e.target.value as "approved" | "refused"); setErr(""); }}><option value="approved">Approved</option><option value="refused">Refused</option></select>
          </Field>

          {result === "approved" ? (
            <>
              <Field label="Client notified" htmlFor="oc-notified" required error={err}>
                <label className="flex min-h-11 items-center gap-3 text-[15px]"><input id="oc-notified" type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={notified} onChange={(e) => { setNotified(e.target.checked); setErr(""); }} /> The client has been told the visa is approved</label>
              </Field>
              {d.user.role === "admin" && <Field label="Agent commission (SAR)" htmlFor="oc-comm" hint="Log the commission. Visible to administrators only."><input id="oc-comm" type="number" min="0" className={field} value={commission} onChange={(e) => setCommission(e.target.value)} /></Field>}
            </>
          ) : (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold">What happens next? <span className="font-normal text-ink-muted">(review appeal options within 48 hours)</span></legend>
              {([["appeal", "Appeal", "The case loops back to Case Prep to prepare the appeal."], ["reapply", "Re-apply", "A new case opens at Enrolled for a fresh application."], ["none", "No further action yet", "The case stays closed. Review the options within 48 hours."]] as const).map(([id, label, help]) => (
                <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${followUp === id ? "border-brand bg-brand-tint" : "border-line"}`}>
                  <input type="radio" name="fu" checked={followUp === id} onChange={() => setFollowUp(id)} className="mt-1 h-4 w-4 accent-[#009FE3]" />
                  <span><span className="block font-semibold">{label}</span><span className="text-sm text-ink-muted">{help}</span></span>
                </label>
              ))}
            </fieldset>
          )}

          <Field label="Note" htmlFor="oc-note" hint="Optional. Added to the case history."><textarea id="oc-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ModalActions>
            <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={btn.primary}>Log outcome</button>
          </ModalActions>
        </form>
      )}
    </Modal>
  );
}

/* ─── Manager review (QC): return for changes ───────────── */
export function ReturnQcDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal title="Return for changes" description="Tell the case manager what needs fixing before this case can be submitted." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!text.trim()) { setErr("Explain what needs to change."); return; } d.returnQc(c.id, text.trim()); d.toast("Returned to the case manager. (Demo: not saved.)"); onClose(); }} noValidate className="space-y-4">
        <Field label="What needs to change?" htmlFor="qc-note" required error={err}><textarea id="qc-note" className={`${area} min-h-32`} value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} /></Field>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Return to case manager</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Add a document (no fixed list: the team names each one) ─── */
export function AddDocumentDialog({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const d = useDemo();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [translation, setTranslation] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setErrors({ file: "Only PDF, JPG or PNG files are accepted." }); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors({ file: "That file is larger than 10 MB." }); return; }
    setErrors({}); setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <Modal title="Add document" description="Give the document a name. Attach the file now, or leave it empty to mark it as waiting for the client." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!name.trim()) { setErrors({ name: "Enter a name for this document." }); return; } d.addDoc(caseId, { name, note, needsTranslation: translation, fileName: fileName || undefined }); d.toast(fileName ? "Document added with its file. (Demo: the file itself is not stored.)" : "Document added as waiting for the client. (Demo: not saved.)"); onClose(); }} noValidate className="space-y-4">
        <Field label="Document name" htmlFor="ad-name" required error={errors.name}><input id="ad-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Passport copy" /></Field>
        <Field label="File" htmlFor="ad-file" hint="Optional. PDF, JPG or PNG, up to 10 MB." error={errors.file}>
          <input id="ad-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pick(e.target.files?.[0])} className="block w-full text-[15px] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-4 file:font-semibold file:text-ink-on hover:file:bg-brand-hover" />
          {fileName && <p className="mt-2 text-sm text-ink-muted">Selected: <strong className="text-ink">{fileName}</strong></p>}
        </Field>
        <Field label="Note" htmlFor="ad-note" hint="Optional."><textarea id="ad-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex min-h-11 items-center gap-3 text-[15px] font-medium"><input type="checkbox" checked={translation} onChange={(e) => setTranslation(e.target.checked)} className="h-5 w-5 accent-[#009FE3]" /> This document needs a translation</label>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Add document</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── End a case early ──────────────────────────────────── */
const END_TYPES: { id: Exclude<CaseStatus, "active" | "approved">; label: string; help: string }[] = [
  { id: "on_hold", label: "On hold", help: "Paused while waiting for the client or the authority." },
  { id: "returned", label: "Returned", help: "Documents or the application were sent back by the authority." },
  { id: "withdrawn", label: "Withdrawn", help: "The client decided to cancel the application." },
  { id: "refused", label: "Refused", help: "The visa was refused before the outcome stage." },
];

export function EndCaseDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [type, setType] = useState<(typeof END_TYPES)[number]["id"]>("on_hold");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  return (
    <Modal title="End or pause this case" description="A reason is required. Only an administrator can reactivate it." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!reason.trim()) { setErr("Please give a reason."); return; } d.endCase(c.id, type, reason.trim()); d.toast("Case updated. (Demo: not saved.)"); onClose(); }} noValidate className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">What happened?</legend>
          {END_TYPES.map((t) => (
            <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${type === t.id ? "border-brand bg-brand-tint" : "border-line"}`}>
              <input type="radio" name="end" checked={type === t.id} onChange={() => setType(t.id)} className="mt-1 h-4 w-4 accent-[#009FE3]" />
              <span><span className="block font-semibold">{t.label}</span><span className="text-sm text-ink-muted">{t.help}</span></span>
            </label>
          ))}
        </fieldset>
        <Field label="Reason" htmlFor="end-reason" required error={err}><textarea id="end-reason" className={area} value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} /></Field>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.danger}>Update case</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Edit case details ─────────────────────────────────── */
export function EditCaseDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const admin = d.user.role === "admin";
  const [deadline, setDeadline] = useState(toDateInput(c.deadline));
  const [nextAction, setNextAction] = useState(c.nextAction);
  const [waitingFor, setWaitingFor] = useState(c.waitingFor);
  const [salesId, setSalesId] = useState(c.salesId);
  const [managerId, setManagerId] = useState(c.caseManagerId);
  const [priority, setPriority] = useState<Priority>(c.priority);
  const [source, setSource] = useState(c.leadSource);
  const [agentId, setAgentId] = useState(c.agentId ?? "");
  const salesPool = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === "sales" && u.teams.includes(c.visa));
  const managerPool = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === "case" && u.teams.includes(c.visa));

  const save = () => {
    const ids = { leadById: c.leadById, salesId, caseManagerId: managerId };
    d.updateCase(c.id, { deadline: deadline ? fromDateInput(deadline) : null, nextAction, waitingFor, salesId, caseManagerId: managerId, consultantId: responsibleFor(c.stage, ids) || c.consultantId, priority, leadSource: source, agentId: agentId || undefined });
    d.toast("Case details saved. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="Edit case details" onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); save(); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deadline" htmlFor="ec-dl"><input id="ec-dl" type="date" className={field} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          <Field label="Priority" htmlFor="ec-prio"><select id="ec-prio" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
          <Field label="Sales consultant" htmlFor="ec-sales" hint={admin ? undefined : "Only an administrator can reassign"}>
            <select id="ec-sales" className={field} value={salesId} disabled={!admin} onChange={(e) => setSalesId(e.target.value)}>{salesPool.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}{!salesPool.some((u) => u.id === salesId) && <option value={salesId}>{userById(salesId)?.name ?? "Not assigned"}</option>}</select>
          </Field>
          <Field label="Case manager" htmlFor="ec-cm" hint={admin ? undefined : "Only an administrator can reassign"}>
            <select id="ec-cm" className={field} value={managerId} disabled={!admin} onChange={(e) => setManagerId(e.target.value)}><option value="">Not assigned yet</option>{managerPool.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}{managerId && !managerPool.some((u) => u.id === managerId) && <option value={managerId}>{userById(managerId)?.name}</option>}</select>
          </Field>
          <div className="sm:col-span-2"><Field label="Next step" htmlFor="ec-next"><input id="ec-next" className={field} value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Waiting for" htmlFor="ec-wait"><input id="ec-wait" className={field} value={waitingFor} onChange={(e) => setWaitingFor(e.target.value)} /></Field></div>
          <Field label="Lead source" htmlFor="ec-src"><select id="ec-src" className={field} value={source} onChange={(e) => setSource(e.target.value)}>{LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Referral agent" htmlFor="ec-agent" hint={admin ? undefined : "Only an administrator can change this"}><select id="ec-agent" className={field} disabled={!admin} value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Direct enquiry</option>{d.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        </div>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Save changes</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Eligibility assessment (illustrative rules) ───────── */
const EDU = ["High school", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate"];
const EXP = ["None", "Under 2 years", "2 to 5 years", "Over 5 years"];
const ENG = ["Not tested", "Basic", "IELTS 5.5 to 6.0", "IELTS 6.5 to 7.0", "IELTS 7.5 or higher"];
const GER = ["None", "A1/A2", "B1/B2", "C1 or higher"];

export function AssessmentDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [edu, setEdu] = useState(EDU[2]);
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [exp, setExp] = useState(EXP[1]);
  const [eng, setEng] = useState(ENG[0]);
  const [ger, setGer] = useState(GER[0]);
  const [pubs, setPubs] = useState("0");
  const [stem, setStem] = useState(false);

  const save = () => {
    const missing: string[] = [];
    if (eng === "Not tested") missing.push("English test result");
    if (!fieldOfStudy.trim()) missing.push("Field of study");
    if (exp === "None") missing.push("Work experience evidence");
    const points = EDU.indexOf(edu) + EXP.indexOf(exp) + ENG.indexOf(eng) + (stem ? 1 : 0) + (Number(pubs) > 0 ? 1 : 0);
    const indicative = missing.length ? "Needs more information" : points >= 9 ? "Strong" : points >= 6 ? "Moderate" : "Needs more information";
    d.saveAssessment(c.id, {
      inputs: [
        { label: "Education", value: edu }, { label: "Field of study", value: fieldOfStudy || "Not given" }, { label: "Work experience", value: exp },
        { label: "English level", value: eng }, { label: "German level", value: ger }, { label: "Publications", value: pubs }, { label: "STEM field", value: stem ? "Yes" : "No" },
      ],
      missing, ruleVersion: "demo-v0 (illustrative)", assessedBy: d.user.name, assessedAt: isoFromToday(0), indicative,
    });
    d.toast("Assessment saved. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="Eligibility assessment" description="Illustrative demo rules only. This is not an official eligibility decision." onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); save(); }} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Highest education" htmlFor="as-edu"><select id="as-edu" className={field} value={edu} onChange={(e) => setEdu(e.target.value)}>{EDU.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Field of study" htmlFor="as-field"><input id="as-field" className={field} value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="For example, Engineering" /></Field>
          <Field label="Work experience" htmlFor="as-exp"><select id="as-exp" className={field} value={exp} onChange={(e) => setExp(e.target.value)}>{EXP.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="English level or certificate" htmlFor="as-eng"><select id="as-eng" className={field} value={eng} onChange={(e) => setEng(e.target.value)}>{ENG.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="German level" htmlFor="as-ger" hint="Mainly for Germany Skilled cases"><select id="as-ger" className={field} value={ger} onChange={(e) => setGer(e.target.value)}>{GER.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Publications" htmlFor="as-pubs"><input id="as-pubs" type="number" min="0" className={field} value={pubs} onChange={(e) => setPubs(e.target.value)} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-[15px] font-medium"><input type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={stem} onChange={(e) => setStem(e.target.checked)} /> The field of study is a STEM field</label>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Save assessment</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Edit client contact details ───────────────────────── */
import type { Client } from "@/lib/demo-data";

export function EditClientDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const d = useDemo();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const [nationality, setNationality] = useState(client.nationality);
  const [dob, setDob] = useState(client.dob);
  const [err, setErr] = useState("");

  return (
    <Modal title="Edit client" onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); if (!name.trim()) { setErr("Enter the client's name."); return; } d.updateClient(client.id, { name: name.trim(), phone, email, nationality, dob }); d.toast("Client details saved. (Demo: not saved.)"); onClose(); }} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Full name" htmlFor="cl-name" required error={err}><input id="cl-name" className={field} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
          <Field label="Phone / WhatsApp" htmlFor="cl-phone"><input id="cl-phone" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
          <Field label="Email" htmlFor="cl-email"><input id="cl-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Nationality" htmlFor="cl-nat"><select id="cl-nat" className={field} value={nationality} onChange={(e) => setNationality(e.target.value)}>{[...new Set([...NATIONALITIES, nationality])].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Date of birth" htmlFor="cl-dob"><input id="cl-dob" type="date" className={field} value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
        </div>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Save changes</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
