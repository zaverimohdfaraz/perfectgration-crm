"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal, ModalActions } from "./modal";
import { Field } from "./form";
import { btn, field, area } from "@/lib/styles";
import { useDemo, nextStageFor, type OutcomeResult, type PassTarget } from "@/lib/store";
import { RoutePicker } from "./route-picker";
import { ISSUE_LABEL, type IssueKind, DESTINATIONS, LEAD_SOURCES, OWNER_LABEL, PRIORITY_LABEL, STAGE_OWNER, SUBMISSION_LABEL, VISA_TYPES, stageLabel, userById, type Case, type CaseStatus, type Priority, type StageId, type SubmissionStatus, type TeamId } from "@/lib/demo-data";
import { canLogOutcome } from "@/lib/permissions";
import { fmtDate, isoFromToday } from "@/lib/dates";
import { NATIONALITIES, digits, fromDateInput, toDateInput } from "@/lib/forms";

/* ─── Add client / new case (lead intake) ───────────────── */
export function IntakeDialog({ mode, presetClientId, onClose }: { mode: "client" | "case"; presetClientId?: string; onClose: () => void }) {
  const d = useDemo();
  const router = useRouter();
  const visaOptions = VISA_TYPES;

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
  const [campaign, setCampaign] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [passNow, setPassNow] = useState(true);
  const [target, setTarget] = useState<PassTarget>({ kind: "team" });
  const [agentId, setAgentId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupId, setDupId] = useState<string | null>(null);

  const useNewClient = mode === "client" || clientMode === "new";
  const needCase = mode === "case" || alsoCase;
  const route: PassTarget = target.kind === "visa" ? { kind: "visa", visa: target.visa ?? visa } : target;

  const create = (skipDup: boolean) => {
    const e: Record<string, string> = {};
    if (useNewClient) {
      if (!name.trim()) e.name = "Enter the client's name.";
      if (!phone.trim() && !email.trim()) e.phone = "Enter a phone number or an email address.";
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "That email address does not look right.";
    } else if (!clientId) e.client = "Choose a client.";
    if (needCase && passNow && route.kind === "person" && !route.userId) e.sales = "Choose who receives this lead.";
    setErrors(e);
    if (Object.keys(e).length) return;

    if (useNewClient && !skipDup) {
      const dup = d.clients.find((c) => (phone && digits(c.phone) === digits(phone)) || (email && c.email.toLowerCase() === email.trim().toLowerCase()));
      if (dup) { setDupId(dup.id); return; }
    }

    const client = useNewClient ? d.addClient({ name, phone, email, nationality }) : d.clients.find((c) => c.id === clientId)!;
    if (needCase) {
      const created = d.addCase({ clientId: client.id, visa, leadSource: source, campaign: campaign.trim() || undefined, pass: passNow ? route : undefined, priority, destination, budget: budget ? Number(budget) : undefined, agentId: agentId || undefined, note: note.trim() || undefined });
      d.toast(passNow ? `${client.name} is saved as ${created.ref} and passed to the Sales Team. (Demo: not saved.)` : `${client.name} is saved as lead ${created.ref}. Pass it to Sales when it is ready. (Demo: not saved.)`);
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
    <Modal title={mode === "client" ? "Add client" : "New lead / case"} description="Create the lead, note the visa type, then pass it to the Sales Team: a visa team, a specific person, or the whole team if you are not sure." onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); create(false); }} noValidate className="space-y-5">
        {mode === "case" && (
          <fieldset className="flex flex-wrap gap-5">
            <legend className="mb-2 text-sm font-semibold">Client</legend>
            <label className="flex min-h-11 items-center gap-2 text-[0.9375rem]"><input type="radio" name="cm" checked={clientMode === "existing"} onChange={() => setClientMode("existing")} className="h-4 w-4 accent-[#009FE3]" /> Existing client</label>
            <label className="flex min-h-11 items-center gap-2 text-[0.9375rem]"><input type="radio" name="cm" checked={clientMode === "new"} onChange={() => setClientMode("new")} className="h-4 w-4 accent-[#009FE3]" /> New client</label>
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
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-[0.9375rem] text-amber-950">
            <p className="font-semibold">This looks like an existing client: {dup.name}</p>
            <p className="mt-1">The phone number or email matches. Records are never merged automatically.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/clients/${dup.id}`} onClick={onClose} className={`${btn.secondary} !min-h-10 text-sm`}>Open {dup.name}</Link>
              <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => create(true)}>Create anyway</button>
            </div>
          </div>
        )}

        {mode === "client" && (
          <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium">
            <input type="checkbox" checked={alsoCase} onChange={(e) => setAlsoCase(e.target.checked)} className="h-5 w-5 accent-[#009FE3]" /> Create a lead for this client now
          </label>
        )}

        {needCase && (
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Qualify interest</p>
            <Field label="Visa type" htmlFor="ic-visa"><select id="ic-visa" className={field} value={visa} onChange={(e) => { setVisa(e.target.value as TeamId); }}>{visaOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></Field>
            <Field label="Destination" htmlFor="ic-dest"><select id="ic-dest" className={field} value={destination} onChange={(e) => setDestination(e.target.value)}>{DESTINATIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Budget (SAR)" htmlFor="ic-budget" hint="Optional"><input id="ic-budget" type="number" min="0" className={field} value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
            <Field label="Lead source" htmlFor="ic-src"><select id="ic-src" className={field} value={source} onChange={(e) => setSource(e.target.value)}>{LEAD_SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Ad campaign" htmlFor="ic-camp" hint="Optional. Type it exactly as in Meta or Google Ads so the lead is matched to the ad results."><input id="ic-camp" list="ic-camp-list" className={field} value={campaign} maxLength={120} onChange={(e) => setCampaign(e.target.value)} placeholder="Use the exact ad campaign name" /><datalist id="ic-camp-list">{[...new Set(d.cases.map((c) => c.campaign).filter(Boolean))].slice(0, 50).map((x) => <option key={x} value={x} />)}</datalist></Field>
            <Field label="Priority" htmlFor="ic-prio"><select id="ic-prio" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
            <Field label="Referral agent" htmlFor="ic-agent" hint="Optional"><select id="ic-agent" className={field} value={agentId} onChange={(e) => setAgentId(e.target.value)}><option value="">Direct enquiry</option>{d.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="First note" htmlFor="ic-note" hint="Optional. Internal only."><textarea id="ic-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
            <div className="space-y-3 border-t border-line pt-4 sm:col-span-2">
              <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium"><input type="checkbox" checked={passNow} onChange={(e) => setPassNow(e.target.checked)} className="h-5 w-5 accent-[#009FE3]" /> Everything is complete: pass to the Sales Team now</label>
              {passNow && <RoutePicker to="sales" value={route} onChange={setTarget} defaultVisa={visa} error={errors.sales} />}
              {!passNow && <p className="text-sm text-ink-muted">The lead stays with you. Open it later and use Pass to Sales.</p>}
            </div>
          </div>
        )}

        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>{needCase ? (passNow ? "Save and pass to Sales" : "Save lead") : "Add client"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Move stage ────────────────────────────────────────── */
type StageField = { id: string; label: string; type: "text" | "date" | "number" | "select" | "check"; options?: string[] };
const STAGE_FIELDS: Partial<Record<StageId, StageField[]>> = {
  docassess: [{ id: "summary", label: "Summary of the first call", type: "text" }],
  appointment: [{ id: "done", label: "Documents assessed and the result shared with the client", type: "check" }, { id: "date", label: "Appointment date", type: "date" }, { id: "place", label: "Location", type: "text" }],
  deal: [{ id: "visit", label: "The client attended the office visit", type: "check" }, { id: "fee", label: "Deal fee agreed (SAR)", type: "number" }],
  advance: [{ id: "agreement", label: "Agreement signed", type: "check" }],
  verify: [{ id: "list", label: "Document list sent to the client", type: "check" }],
  prep: [{ id: "verified", label: "Documents verified: completeness check and translations done", type: "check" }],
  review: [{ id: "ready", label: "The case file is complete and ready for review", type: "check" }],
  submitted: [{ id: "ref", label: "Submission reference", type: "text" }, { id: "to", label: "Submitted to", type: "select", options: ["Embassy", "VFS Global", "BLS International", "Other"] }],
};

export function MoveStageDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const to = nextStageFor(c);
  if (!to) return null;
  if (to === "outcome") return <OutcomeDialog c={c} onClose={onClose} />;
  if (STAGE_OWNER[c.stage] !== STAGE_OWNER[to]) return <PassDialog c={c} to={to} onClose={onClose} />;
  return <StageMove c={c} to={to} onClose={onClose} />;
}

/* ─── Handoff: Social to Sales, Sales to Case Manager ───── */
export function PassDialog({ c, to, onClose }: { c: Case; to: StageId; onClose: () => void }) {
  const d = useDemo();
  const team = STAGE_OWNER[to] as "sales" | "case";
  const [target, setTarget] = useState<PassTarget>({ kind: "team" });
  const [note, setNote] = useState("");
  const [fees, setFees] = useState(c.feesCollectedSar ? String(c.feesCollectedSar) : "");
  const [paid, setPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const route: PassTarget = target.kind === "visa" ? { kind: "visa", visa: target.visa ?? c.visa } : target;
  const fromSales = team === "case";

  const submit = () => {
    const e: Record<string, string> = {};
    if (fromSales && (!fees || Number(fees) <= 0)) e.fees = "Enter the advance or fees collected.";
    if (fromSales && !paid) e.paid = "Tick this once payment is confirmed.";
    if (route.kind === "person" && !route.userId) e.route = "Choose a person.";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!d.passCase(c.id, route, note.trim() || undefined, fromSales ? Number(fees) : undefined)) return;
    d.toast(`Passed to the ${OWNER_LABEL[team]}. You will not see this case after someone accepts it. (Demo: not saved.)`);
    onClose();
  };

  return (
    <Modal title={fromSales ? "Pass to the Case Manager" : "Pass to the Sales Team"} description={fromSales ? "After this you will not see any further details of the case." : "After someone in Sales accepts it, the case is theirs."} onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
        {fromSales && (
          <>
            <Field label="Advance or fees collected (SAR)" htmlFor="ps-fees" required error={errors.fees}><input id="ps-fees" type="number" min="0" className={field} value={fees} onChange={(e) => setFees(e.target.value)} /></Field>
            <Field label="Payment" htmlFor="ps-paid" required error={errors.paid}><label className="flex min-h-11 items-center gap-3 text-[0.9375rem]"><input id="ps-paid" type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Payment is confirmed and the agreement is signed</label></Field>
          </>
        )}
        <RoutePicker to={team} value={route} onChange={setTarget} defaultVisa={c.visa} error={errors.route} />
        <Field label="Note for the next team" htmlFor="ps-note" hint="Optional. Added to the case history."><textarea id="ps-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>{fromSales ? "Pass to Case Manager" : "Pass to Sales"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function StageMove({ c, to, onClose }: { c: Case; to: StageId; onClose: () => void }) {
  const d = useDemo();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [fees, setFees] = useState("");
  const [subStatus, setSubStatus] = useState<SubmissionStatus>("received");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = STAGE_FIELDS[to] ?? [];
  const needsQc = to === "submitted" && !c.qcApprovedAt;
  const skipped = c.visa === "visit" && c.stage === "firstcall" ? "Document Assessment is skipped for Visit visas." : null;
  const askFees = c.stage === "advance";

  const submit = () => {
    const e: Record<string, string> = {};
    fields.forEach((f) => { if (!vals[f.id] || vals[f.id] === "false") e[f.id] = f.type === "check" ? "Tick this to continue." : "This is required."; });
    setErrors(e);
    if (Object.keys(e).length) return;
    const bits = fields.filter((f) => f.type !== "check").map((f) => `${f.label}: ${vals[f.id]}`);
    const text = [`Moved to ${stageLabel(to)}.`, bits.join(". "), note.trim()].filter(Boolean).join(" ");
    d.moveStage(c.id, { note: text, appointmentAt: to === "appointment" && vals.date ? fromDateInput(vals.date) : undefined, fees: askFees && fees ? Number(fees) : undefined, submissionStatus: to === "submitted" ? subStatus : undefined });
    d.toast(to === "submitted" ? "Submitted. The time is recorded. (Demo: not saved.)" : `Moved to ${stageLabel(to)}. (Demo: not saved.)`);
    onClose();
  };

  return (
    <Modal title="Move to next step" description="Check the details, then confirm. The change is recorded in the case history." onClose={onClose}>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-tint p-4 text-[0.9375rem]">
        <span className="font-semibold">{stageLabel(c.stage)}</span><span aria-hidden>→</span><span className="font-bold text-brand-deep">{stageLabel(to)}</span>
      </div>
      {skipped && <p className="mt-3 text-sm text-ink-muted">{skipped}</p>}

      {needsQc ? (
        <>
          <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">The review must be approved before this case can be submitted.</p>
          <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Close</button></ModalActions>
        </>
      ) : (
        <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="mt-5 space-y-4">
          {fields.map((f) => (
            <Field key={f.id} label={f.type === "check" ? "Confirmation" : f.label} htmlFor={`mv-${f.id}`} required error={errors[f.id]}>
              {f.type === "check" ? (
                <label className="flex min-h-11 items-center gap-3 text-[0.9375rem]"><input id={`mv-${f.id}`} type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={vals[f.id] === "true"} onChange={(e) => setVals({ ...vals, [f.id]: String(e.target.checked) })} /> {f.label}</label>
              ) : f.type === "select" ? (
                <select id={`mv-${f.id}`} className={field} value={vals[f.id] ?? ""} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })}><option value="">Select</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
              ) : (
                <input id={`mv-${f.id}`} type={f.type} className={field} value={vals[f.id] ?? ""} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })} />
              )}
            </Field>
          ))}
          {askFees && <Field label="Advance or fees collected (SAR)" htmlFor="mv-fees" hint="Optional here. Required when you pass the case on."><input id="mv-fees" type="number" min="0" className={field} value={fees} onChange={(e) => setFees(e.target.value)} /></Field>}
          {to === "submitted" && (
            <Field label="What happened with the application" htmlFor="mv-sub" hint="The submission time is recorded automatically.">
              <select id="mv-sub" className={field} value={subStatus} onChange={(e) => setSubStatus(e.target.value as SubmissionStatus)}>{(Object.keys(SUBMISSION_LABEL) as SubmissionStatus[]).map((k) => <option key={k} value={k}>{SUBMISSION_LABEL[k]}</option>)}</select>
            </Field>
          )}
          <Field label="Note" htmlFor="mv-note" hint="Optional. Added to the case history."><textarea id="mv-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ul className="space-y-1 rounded-lg border border-line p-4 text-sm text-ink-muted">
            <li>New deadline: <strong className="text-ink">{fmtDate(isoFromToday(d.sla[to]))}</strong> ({d.sla[to]} {d.sla[to] === 1 ? "day" : "days"} from today)</li>
            <li>Responsible: <strong className="text-ink">{userById(c.consultantId)?.name ?? "You"}</strong> ({OWNER_LABEL[STAGE_OWNER[to]]})</li>
          </ul>
          <ModalActions>
            <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={btn.primary}>Confirm move</button>
          </ModalActions>
        </form>
      )}
    </Modal>
  );
}

/* ─── After submission: record what actually happened ───── */
export function SubmissionUpdateDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [status, setStatus] = useState<SubmissionStatus>("under_review");
  const [note, setNote] = useState("");
  return (
    <Modal title="Record what happened" description="Add an update after submission. Each update is time-stamped." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); d.addSubmissionUpdate(c.id, status, note.trim() || undefined); d.toast("Update recorded. (Demo: not saved.)"); onClose(); }} className="space-y-4">
        <Field label="Status" htmlFor="su-status"><select id="su-status" className={field} value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)}>{(Object.keys(SUBMISSION_LABEL) as SubmissionStatus[]).map((k) => <option key={k} value={k}>{SUBMISSION_LABEL[k]}</option>)}</select></Field>
        <Field label="Note" htmlFor="su-note" hint="Optional."><textarea id="su-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary}>Save update</button></ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Result: approved, denied and the other options ────── */
function OutcomeDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [result, setResult] = useState<OutcomeResult>("approved");
  const [notified, setNotified] = useState(false);
  const [commission, setCommission] = useState("");
  const [followUp, setFollowUp] = useState<"appeal" | "reapply" | "none">("none");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const allowed = canLogOutcome(d.user, c);

  const submit = () => {
    if (result === "approved" && !notified) { setErr("Tick this once the client has been notified."); return; }
    d.logOutcome(c.id, { result, commission: d.user.role === "admin" && commission ? Number(commission) : undefined, followUp: result === "refused" ? followUp : undefined, note: note.trim() || undefined });
    d.toast(result === "approved" ? "Approved. The client is notified. (Demo: not saved.)" : result === "refused" ? "Denied. Result recorded. (Demo: not saved.)" : "Result recorded. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="Record the result" description="Check the embassy or VFS portal, then record the decision on the day it is known. The time is saved." onClose={onClose}>
      {!allowed ? (
        <>
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">The result is recorded by the case manager on this case, or an Admin.</p>
          <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Close</button></ModalActions>
        </>
      ) : (
        <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
          <Field label="Result" htmlFor="oc-result" required>
            <select id="oc-result" className={field} value={result} onChange={(e) => { setResult(e.target.value as OutcomeResult); setErr(""); }}>
              <option value="approved">Approved</option><option value="refused">Denied</option><option value="returned">Returned by the authority</option><option value="withdrawn">Withdrawn by the client</option>
            </select>
          </Field>
          {result === "approved" && (
            <>
              <Field label="Client notified" htmlFor="oc-notified" required error={err}>
                <label className="flex min-h-11 items-center gap-3 text-[0.9375rem]"><input id="oc-notified" type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={notified} onChange={(e) => { setNotified(e.target.checked); setErr(""); }} /> The client has been told the visa is approved</label>
              </Field>
              {d.user.role === "admin" && <Field label="Agent commission (SAR)" htmlFor="oc-comm" hint="Visible to administrators only."><input id="oc-comm" type="number" min="0" className={field} value={commission} onChange={(e) => setCommission(e.target.value)} /></Field>}
            </>
          )}
          {result === "refused" && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold">What happens next? <span className="font-normal text-ink-muted">(review appeal options within 48 hours)</span></legend>
              {([["appeal", "Appeal", "The case loops back to Case Prep to prepare the appeal."], ["reapply", "Re-apply", "A new lead opens for a fresh application."], ["none", "No further action yet", "The case stays closed. Review the options within 48 hours."]] as const).map(([id, label, help]) => (
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
            <button type="submit" className={btn.primary}>Record result</button>
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
    <Modal title="Return for changes" description="Tell the case manager what needs fixing. The case goes back to Case Prep." onClose={onClose}>
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
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileName = file?.name ?? "";
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setErrors({ file: "Only PDF, JPG or PNG files are accepted." }); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors({ file: "That file is larger than 10 MB." }); return; }
    setErrors({}); setFile(file);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <Modal title="Add document" description="Give the document a name. Attach the file now, or leave it empty to mark it as waiting for the client." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!name.trim()) { setErrors({ name: "Enter a name for this document." }); return; } setBusy(true); void d.addDoc(caseId, { name, note, needsTranslation: translation, file: file ?? undefined }).then((ok) => { setBusy(false); if (!ok) return; d.toast(file ? "Document added with its file. (Demo: the file itself is not stored.)" : "Document added as waiting for the client. (Demo: not saved.)"); onClose(); }); }} noValidate className="space-y-4">
        <Field label="Document name" htmlFor="ad-name" required error={errors.name}><input id="ad-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Passport copy" /></Field>
        <Field label="File" htmlFor="ad-file" hint="Optional. PDF, JPG or PNG, up to 10 MB." error={errors.file}>
          <input id="ad-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pick(e.target.files?.[0])} className="block w-full text-[0.9375rem] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-4 file:font-semibold file:text-ink-on hover:file:bg-brand-hover" />
          {fileName && <p className="mt-2 text-sm text-ink-muted">Selected: <strong className="text-ink">{fileName}</strong></p>}
        </Field>
        <Field label="Note" htmlFor="ad-note" hint="Optional."><textarea id="ad-note" className={area} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium"><input type="checkbox" checked={translation} onChange={(e) => setTranslation(e.target.checked)} className="h-5 w-5 accent-[#009FE3]" /> This document needs a translation</label>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary} disabled={busy}>{busy ? "Uploading…" : "Add document"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── End a case early ──────────────────────────────────── */
type EndChoice = { id: string; status: Exclude<CaseStatus, "active" | "approved">; kind?: IssueKind; label: string; help: string };
const END_TYPES: EndChoice[] = [
  { id: "hold_client", status: "on_hold", kind: "client", label: "On hold by client", help: "The client asked to pause (travel, money, personal reasons, not ready yet)." },
  { id: "on_hold", status: "on_hold", label: "On hold (waiting on someone else)", help: "Paused by us while waiting for a third party, the authority or something inside the team." },
  { id: "returned", status: "returned", label: "Returned", help: "Documents or the application were sent back by the authority." },
  { id: "withdrawn", status: "withdrawn", label: "Withdrawn", help: "The client decided to cancel the application." },
  { id: "refused", status: "refused", label: "Denied", help: "The visa was denied before the result step." },
];

export function EndCaseDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [type, setType] = useState("hold_client");
  const [waitingOn, setWaitingOn] = useState<IssueKind>("third_party");
  const choice = END_TYPES.find((t) => t.id === type)!;
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  return (
    <Modal title="End or pause this case" description="A reason is required. Only an administrator can reactivate it." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!reason.trim()) { setErr("Please give a reason."); return; } if (!d.endCase(c.id, choice.status, reason.trim(), choice.kind ?? (choice.id === "on_hold" ? waitingOn : undefined))) return; d.toast("Case updated. (Demo: not saved.)"); onClose(); }} noValidate className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">What happened?</legend>
          {END_TYPES.map((t) => (
            <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${type === t.id ? "border-brand bg-brand-tint" : "border-line"}`}>
              <input type="radio" name="end" checked={type === t.id} onChange={() => setType(t.id)} className="mt-1 h-4 w-4 accent-[#009FE3]" />
              <span><span className="block font-semibold">{t.label}</span><span className="text-sm text-ink-muted">{t.help}</span></span>
            </label>
          ))}
        </fieldset>
        {type === "on_hold" && (
          <Field label="Waiting on" htmlFor="end-on"><select id="end-on" className={field} value={waitingOn} onChange={(e) => setWaitingOn(e.target.value as IssueKind)}>{(["third_party", "authority", "internal", "other"] as IssueKind[]).map((k) => <option key={k} value={k}>{ISSUE_LABEL[k]}</option>)}</select></Field>
        )}
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
  const [leadId, setLeadId] = useState(c.leadById);
  const [salesId, setSalesId] = useState(c.salesId);
  const [managerId, setManagerId] = useState(c.caseManagerId);
  const [priority, setPriority] = useState<Priority>(c.priority);
  const [source, setSource] = useState(c.leadSource);
  const [agentId, setAgentId] = useState(c.agentId ?? "");
  const pool = (team: "social" | "sales" | "case") => d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === team);
  const opts = (team: "social" | "sales" | "case", cur: string) => (
    <>
      <option value="">Not assigned</option>
      {pool(team).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      {cur && !pool(team).some((u) => u.id === cur) && <option value={cur}>{userById(cur)?.name}</option>}
    </>
  );

  const save = () => {
    d.updateCase(c.id, { deadline: deadline ? fromDateInput(deadline) : null, nextAction, waitingFor, priority, leadSource: source });
    if (admin) {
      if ((agentId || null) !== (c.agentId ?? null)) d.linkAgent(c.id, agentId || null);
      if (leadId && leadId !== c.leadById) d.assignCase(c.id, "social", leadId);
      if (salesId && salesId !== c.salesId) d.assignCase(c.id, "sales", salesId);
      if (managerId && managerId !== c.caseManagerId) d.assignCase(c.id, "case", managerId);
    }
    d.toast("Case details saved. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="Edit case details" onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); save(); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deadline" htmlFor="ec-dl"><input id="ec-dl" type="date" className={field} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          <Field label="Priority" htmlFor="ec-prio"><select id="ec-prio" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
          <Field label="Lead captured by (Social Media)" htmlFor="ec-lead" hint={admin ? undefined : "Only an administrator can reassign"}><select id="ec-lead" className={field} value={leadId} disabled={!admin} onChange={(e) => setLeadId(e.target.value)}>{opts("social", leadId)}</select></Field>
          <Field label="Sales team member" htmlFor="ec-sales" hint={admin ? "The administrator can change this at any time." : "Only an administrator can reassign"}><select id="ec-sales" className={field} value={salesId} disabled={!admin} onChange={(e) => setSalesId(e.target.value)}>{opts("sales", salesId)}</select></Field>
          <Field label="Case manager" htmlFor="ec-cm" hint={admin ? "The administrator can change this at any time." : "Only an administrator can reassign"}><select id="ec-cm" className={field} value={managerId} disabled={!admin} onChange={(e) => setManagerId(e.target.value)}>{opts("case", managerId)}</select></Field>
          <Field label="Lead source" htmlFor="ec-src"><select id="ec-src" className={field} value={source} onChange={(e) => setSource(e.target.value)}>{LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Next step" htmlFor="ec-next"><input id="ec-next" className={field} value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Waiting for" htmlFor="ec-wait"><input id="ec-wait" className={field} value={waitingFor} onChange={(e) => setWaitingFor(e.target.value)} /></Field></div>
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
        <label className="flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium"><input type="checkbox" className="h-5 w-5 accent-[#009FE3]" checked={stem} onChange={(e) => setStem(e.target.checked)} /> The field of study is a STEM field</label>
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

/* ─── Admin: give a waiting case to someone ─────────────── */
export function AssignDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const team = (c.route?.to ?? STAGE_OWNER[c.stage]) as "social" | "sales" | "case";
  const people = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === team);
  const [pick, setPick] = useState(people[0]?.id ?? "");
  return (
    <Modal title={`Assign to someone in the ${OWNER_LABEL[team]}`} description="Use this when nobody has accepted the case. They get access straight away and everyone else loses sight of it." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!pick) return; d.assignCase(c.id, team, pick); d.toast(`Assigned to ${userById(pick)?.name}. (Demo: not saved.)`); onClose(); }} className="space-y-4">
        <Field label="Person" htmlFor="as-person"><select id="as-person" className={field} value={pick} onChange={(e) => setPick(e.target.value)}>{people.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.teams.map((t) => VISA_TYPES.find((v) => v.id === t)?.label).join(", ")}</option>)}</select></Field>
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary}>Assign</button></ModalActions>
      </form>
    </Modal>
  );
}
