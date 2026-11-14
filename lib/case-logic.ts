/**
 * Every change to a case as a pure function: (case, who is acting, input) in, new case or an error out.
 * The browser uses these for the instant on-screen update, and the API runs the same functions on the
 * server before saving, so the rules can never differ between the two.
 */
import { OWNER_LABEL, STAGES, STAGE_GUIDE, STAGE_OWNER, visaLabel, type Case, type VisaChoice, type CaseStatus, type Issue, type IssueKind, type Priority, type Route, type StageId, type SubmissionStatus, type TeamId, type User, type WorkTeam } from "./demo-data";
import { plusDays } from "./dates";
import { canApproveQc, canClaim, canEditCase, canLogOutcome, canReactivate, canReassign } from "./permissions";

export type Ctx = { user: User; users: User[]; sla: Record<StageId, number>; handlers: Record<string, string>; at: string };
export type Fail = { error: string };
export const isFail = (x: unknown): x is Fail => typeof x === "object" && x !== null && "error" in x;

export type PassTarget = { kind: Route["kind"]; visa?: TeamId; userId?: string };
export type OutcomeResult = "approved" | "refused" | "returned" | "withdrawn";
export type NewCaseInput = { id: string; ref: string; clientId: string; visa: VisaChoice; leadSource: string; campaign?: string; priority: Priority; destination?: string; subDestination?: string; budget?: number; agentId?: string; note?: string; pass?: PassTarget };

export function nextStageFor(c: Pick<Case, "stage" | "visa">): StageId | null {
  let i = STAGES.findIndex((s) => s.id === c.stage) + 1;
  if (i >= STAGES.length) return null;
  if (c.visa === "visit" && STAGES[i].id === "docassess") i += 1;
  return STAGES[i]?.id ?? null;
}

const note = (x: Ctx, text: string) => ({ text, author: x.user.name, at: x.at });
/** The holder's first action on an automatically shared lead makes it theirs: it will not be moved again. */
const mine = (c: Case, x: Ctx): Case => (c.autoShared && c.consultantId === x.user.id ? { ...c, autoShared: undefined } : c);

/* ─── Create a lead (Social Media) ──────────────────────── */
export function createCase(x: Ctx, i: NewCaseInput): Case | Fail {
  const u = x.user;
  if (!(u.role === "admin" || u.canAdd || u.workTeam === "social")) return { error: "Only the Social Media team or an administrator can create a lead." };
  const g = STAGE_GUIDE.lead;
  let c: Case = {
    id: i.id, ref: i.ref, clientId: i.clientId, visa: i.visa, stage: "lead", status: "active",
    consultantId: u.id, leadById: u.id, salesId: "", caseManagerId: "", priority: i.priority, destination: i.destination ?? "", subDestination: i.subDestination || undefined, budget: i.budget,
    campaign: i.campaign || undefined, stageSince: x.at, deadline: plusDays(x.at, x.sla.lead), leadSource: i.leadSource, agentId: i.agentId || undefined,
    commissionSar: null, waitingFor: g.waitingFor, nextAction: g.nextAction, issues: [],
    notes: i.note ? [note(x, i.note)] : [], history: [{ from: null, to: "lead", actor: u.name, at: x.at, kind: "stage" }], updatedAt: x.at,
  };
  // A lead made by the Social Media team always goes to the Sales Team (it is never kept in Social Media).
  // It goes to the whole Sales Team (or one visa team), never to one named person.
  const social = u.role === "consultant" && u.workTeam === "social";
  const pass = social ? (i.pass && i.pass.kind !== "person" ? i.pass : { kind: "team" as const }) : i.pass;
  if (pass) {
    const passed = passCase(c, x, pass);
    if (isFail(passed)) return passed;
    c = passed;
  }
  return c;
}

/* ─── Pass to the next team (Social → Sales, Sales → Case Manager) ─── */
export function passCase(c: Case, x: Ctx, target: PassTarget, text?: string, extra: { fees?: number } = {}): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c)) return { error: "Only the person who holds this case can pass it on." };
  if (c.status !== "active") return { error: "Only an active case can be passed on." };
  const to = nextStageFor(c);
  if (!to) return { error: "This case cannot move further." };
  const team = STAGE_OWNER[to];
  if (team === STAGE_OWNER[c.stage] || (team !== "sales" && team !== "case")) return { error: "Use Move to next step for steps inside your own team." };
  const visa = target.kind === "visa" && target.visa ? target.visa : c.visa;
  if (target.kind === "visa" && !visa) return { error: "Choose the visa team to pass this lead to." };
  let person: User | undefined;
  if (target.kind === "person") {
    person = x.users.find((u) => u.id === target.userId);
    if (!person || person.inactive || person.workTeam !== team) return { error: `Choose an active member of the ${OWNER_LABEL[team]}.` };
  }
  const handler = !person ? x.users.find((u) => u.id === x.handlers[`${c.visa}:${to}`] && !u.inactive && u.workTeam === team) : undefined;
  const holder = person ?? handler;
  const route: Route | undefined = holder ? undefined : { to: team, kind: target.kind, visa: target.kind === "visa" ? (visa as TeamId) : undefined, by: x.user.name, at: x.at };
  const dest = holder ? holder.name : target.kind === "visa" ? `the ${visaLabel(visa)} team` : `the whole ${OWNER_LABEL[team]}`;
  const key = team === "sales" ? "salesId" : "caseManagerId";
  if (team === "case" && !(extra.fees ?? c.feesCollectedSar)) return { error: "Record the advance or fees collected before passing to the Case Manager team." };
  const g = STAGE_GUIDE[to];
  return {
    ...c, visa, stage: to,
    feesCollectedSar: team === "case" ? extra.fees ?? c.feesCollectedSar : c.feesCollectedSar, agreementSigned: team === "case" ? true : c.agreementSigned, stageSince: x.at, route, [key]: holder?.id ?? "", consultantId: holder?.id ?? "", claimedAt: holder ? x.at : undefined,
    deadline: plusDays(x.at, x.sla[to]), waitingFor: holder ? g.waitingFor : `Someone in ${dest} to accept`, nextAction: holder ? g.nextAction : "Accept the case so the first step can start",
    notes: text ? [...c.notes, note(x, text)] : c.notes,
    history: [...c.history, { from: c.stage, to, actor: x.user.name, at: x.at, note: text, kind: "stage", handoff: `Passed to ${dest} (${OWNER_LABEL[team]})${holder ? (handler ? " as the default handler" : "") : ". Waiting for someone to accept"}` }],
    updatedAt: x.at,
  };
}

/* ─── Accept a case from the pool (first come, first served) ─── */
export function claimCase(c: Case, x: Ctx): Case | Fail {
  if (!c.route) {
    const who = x.users.find((u) => u.id === c.consultantId)?.name;
    return { error: who ? `${who} already accepted this case.` : "This case is not waiting to be accepted." };
  }
  if (!canClaim(x.user, c)) return { error: "This case was not passed to you." };
  const key = c.route.to === "sales" ? "salesId" : "caseManagerId";
  return {
    ...c, [key]: x.user.id, consultantId: x.user.id, route: undefined, claimedAt: x.at, deadline: plusDays(x.at, x.sla[c.stage]),
    waitingFor: STAGE_GUIDE[c.stage].waitingFor, nextAction: STAGE_GUIDE[c.stage].nextAction,
    history: [...c.history, { from: c.stage, to: c.stage, actor: x.user.name, at: x.at, kind: "claim", handoff: `${x.user.name} accepted this case (${OWNER_LABEL[STAGE_OWNER[c.stage]]})` }],
    updatedAt: x.at,
  };
}

/* ─── Administrator assigns or changes the person, at any time ─── */
export function assignCase(c: Case, x: Ctx, team: WorkTeam, userId: string): Case | Fail {
  if (!canReassign(x.user)) return { error: "Only an administrator can change who handles a case." };
  const p = x.users.find((u) => u.id === userId);
  if (!p || p.inactive || p.workTeam !== team) return { error: `Choose an active member of the ${OWNER_LABEL[team]}.` };
  const key = team === "social" ? "leadById" : team === "sales" ? "salesId" : "caseManagerId";
  const owns = STAGE_OWNER[c.stage] === team;
  return {
    ...c, [key]: userId, consultantId: owns ? userId : c.consultantId, route: owns ? undefined : c.route, claimedAt: owns ? x.at : c.claimedAt, autoShared: owns ? undefined : c.autoShared,
    waitingFor: owns && c.route ? STAGE_GUIDE[c.stage].waitingFor : c.waitingFor, nextAction: owns && c.route ? STAGE_GUIDE[c.stage].nextAction : c.nextAction,
    history: [...c.history, { from: c.stage, to: c.stage, actor: x.user.name, at: x.at, kind: "assign", handoff: `Assigned to ${p.name} (${OWNER_LABEL[team]}) by ${x.user.name}` }],
    updatedAt: x.at,
  };
}

/* ─── Move to the next step inside the same team ────────── */
export type MoveInput = { note?: string; appointmentAt?: string; fees?: number; dealFee?: number; submissionStatus?: SubmissionStatus; submittedAt?: string };

export function moveStage(c: Case, x: Ctx, o: MoveInput): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c)) return { error: "Only the person who holds this case can move it." };
  if (c.status !== "active") return { error: "Reactivate the case first." };
  const to = nextStageFor(c);
  if (!to || to === "outcome") return { error: "Log the result once the decision is known." };
  if (STAGE_OWNER[c.stage] !== STAGE_OWNER[to]) return { error: "Use Pass to hand this case to the next team." };
  if (to === "submitted" && !c.qcApprovedAt) return { error: "A manager must approve the review before submission." };
  const g = STAGE_GUIDE[to];
  const handler = x.users.find((u) => u.id === x.handlers[`${c.visa}:${to}`] && !u.inactive && u.workTeam === STAGE_OWNER[to]);
  const submittedAt = to === "submitted" ? (o.submittedAt && Date.parse(o.submittedAt) <= Date.parse(x.at) ? o.submittedAt : x.at) : c.submittedAt;
  return {
    ...c, stage: to, stageSince: x.at, consultantId: handler?.id ?? c.consultantId,
    caseManagerId: handler && STAGE_OWNER[to] === "case" ? handler.id : c.caseManagerId,
    deadline: plusDays(x.at, x.sla[to]), waitingFor: g.waitingFor, nextAction: g.nextAction,
    appointmentAt: to === "appointment" ? o.appointmentAt ?? c.appointmentAt : c.appointmentAt,
    dealFeeSar: c.stage === "deal" ? o.dealFee ?? c.dealFeeSar : c.dealFeeSar,
    agreementSigned: to === "advance" ? true : c.agreementSigned,
    feesCollectedSar: c.stage === "advance" ? o.fees ?? c.feesCollectedSar : c.feesCollectedSar,
    docsVerified: to === "prep" ? true : c.docsVerified,
    qcNote: to === "review" ? undefined : c.qcNote,
    qcApprovedAt: to === "review" ? undefined : c.qcApprovedAt,
    submittedAt,
    submissionLog: to === "submitted" ? [{ status: o.submissionStatus ?? "received", note: o.note, by: x.user.name, at: submittedAt ?? x.at }] : c.submissionLog,
    notes: o.note ? [...c.notes, note(x, o.note)] : c.notes,
    history: [...c.history, { from: c.stage, to, actor: x.user.name, at: x.at, note: o.note, kind: "stage" }],
    updatedAt: x.at,
  };
}

/* ─── Review (QC) and submission updates ─────────────────── */
export function approveQc(c: Case, x: Ctx): Case | Fail {
  if (!canApproveQc(x.user)) return { error: "Only a manager or administrator signs off the review." };
  if (c.stage !== "review" || c.status !== "active") return { error: "Only a case in Review can be approved." };
  return { ...c, qcApprovedAt: x.at, qcBy: x.user.name, qcNote: undefined, deadline: plusDays(x.at, 2), nextAction: "Submit to the embassy or VFS and log the time", waitingFor: "Submission", notes: [...c.notes, note(x, "Review: approved. Ready to submit.")], updatedAt: x.at };
}

export function returnQc(c: Case, x: Ctx, text: string): Case | Fail {
  if (!canApproveQc(x.user)) return { error: "Only a manager or administrator signs off the review." };
  if (c.stage !== "review") return { error: "Only a case in Review can be returned." };
  return {
    ...c, stage: "prep", stageSince: x.at, deadline: plusDays(x.at, x.sla.prep), qcApprovedAt: undefined, qcBy: undefined, qcNote: text,
    nextAction: "Fix the review feedback and send the file for review again", waitingFor: "Corrections from the case manager",
    notes: [...c.notes, note(x, `Review: returned for changes. ${text}`)],
    history: [...c.history, { from: "review", to: "prep", actor: x.user.name, at: x.at, note: text, kind: "stage" }], updatedAt: x.at,
  };
}

export function addSubmissionUpdate(c: Case, x: Ctx, status: SubmissionStatus, text?: string): Case | Fail {
  if (!(canEditCase(x.user, c) || x.user.role === "manager")) return { error: "Only the case manager or a manager can log submission updates." };
  if (c.stage !== "submitted") return { error: "Updates can be logged while the case is submitted." };
  return { ...c, submissionLog: [...(c.submissionLog ?? []), { status, note: text, by: x.user.name, at: x.at }], updatedAt: x.at };
}

/* ─── Result ────────────────────────────────────────────── */
export type OutcomeInput = { result: OutcomeResult; commission?: number; followUp?: "appeal" | "reapply" | "none"; note?: string; newId?: string; newRef?: string };

/** Returns the updated case, plus a new lead when a denied client re-applies. */
export function logOutcome(c: Case, x: Ctx, o: OutcomeInput): { updated: Case; created?: Case } | Fail {
  if (!canLogOutcome(x.user, c)) return { error: "Only the case manager on this case, a manager or an administrator can log the result." };
  if (c.stage !== "submitted" || c.status !== "active") return { error: "The result is logged once the case is submitted." };
  const by = x.user.name;
  const hist = (n?: string) => [...c.history, { from: c.stage, to: "outcome" as StageId, actor: by, at: x.at, note: n, kind: "stage" as const }];
  const commission = x.user.role === "admin" ? o.commission : undefined;
  if (o.result === "approved") {
    return { updated: { ...c, stage: "outcome", stageSince: x.at, status: "approved", deadline: null, commissionSar: commission ?? c.commissionSar ?? null, resultNote: o.note, waitingFor: STAGE_GUIDE.outcome.waitingFor, nextAction: STAGE_GUIDE.outcome.nextAction, notes: [...c.notes, note(x, `Result: approved. Client notified.${o.note ? ` ${o.note}` : ""}`)], history: hist(o.note), updatedAt: x.at } };
  }
  if (o.result === "returned" || o.result === "withdrawn") {
    const label = o.result === "returned" ? "returned by the authority" : "withdrawn by the client";
    return { updated: { ...c, stage: "outcome", stageSince: x.at, status: o.result, deadline: null, endReason: o.note || `Application ${label}.`, resultNote: o.note, notes: [...c.notes, note(x, `Result: ${label}. ${o.note ?? ""}`.trim())], history: hist(o.note), updatedAt: x.at } };
  }
  const follow = o.followUp ?? "none";
  if (follow === "appeal") {
    return { updated: { ...c, stage: "prep", stageSince: x.at, status: "active", endReason: undefined, deadline: plusDays(x.at, x.sla.prep), qcApprovedAt: undefined, qcBy: undefined, waitingFor: "Appeal documents", nextAction: "Review the denial reasons and prepare the appeal", notes: [...c.notes, note(x, `Result: denied. Loop back: appeal. ${o.note ?? ""}`.trim())], history: [...c.history, { from: c.stage, to: "prep", actor: by, at: x.at, note: "Denied. Loop back: appeal", kind: "stage", handoff: "Back to Case Prep" }], updatedAt: x.at } };
  }
  const updated: Case = { ...c, stage: "outcome", stageSince: x.at, status: "refused", deadline: plusDays(x.at, 2), endReason: follow === "reapply" ? "Denied. The client will re-apply under a new case." : o.note || "Denied by the authority.", resultNote: o.note, waitingFor: "Appeal options", nextAction: "Review appeal options within 48 hours", notes: [...c.notes, note(x, `Result: denied. ${o.note ?? ""}`.trim())], history: hist(o.note), updatedAt: x.at };
  if (follow !== "reapply") return { updated };
  if (!o.newId || !o.newRef) return { error: "A new case number is needed for the re-application." };
  const created: Case = {
    ...c, id: o.newId, ref: o.newRef, stage: "lead", status: "active", stageSince: x.at, deadline: plusDays(x.at, x.sla.lead), consultantId: c.leadById,
    salesId: "", caseManagerId: "", route: undefined, claimedAt: undefined, submittedAt: undefined, submissionLog: undefined, resultNote: undefined, issues: [],
    commissionSar: null, endReason: undefined, qcApprovedAt: undefined, qcBy: undefined, qcNote: undefined, docsVerified: undefined, agreementSigned: undefined, feesCollectedSar: undefined, dealFeeSar: undefined, appointmentAt: undefined,
    waitingFor: STAGE_GUIDE.lead.waitingFor, nextAction: STAGE_GUIDE.lead.nextAction,
    notes: [note(x, `Re-application after the denial of ${c.ref}.`)], history: [{ from: null, to: "lead", actor: by, at: x.at, note: `Re-apply from ${c.ref}`, kind: "stage" }], updatedAt: x.at,
  };
  return { updated, created };
}

/* ─── Pause, close early, reactivate ─────────────────────── */
const ISSUE_FOR: Record<string, IssueKind> = { on_hold: "client", returned: "authority", withdrawn: "client", refused: "authority" };

export function endCase(c: Case, x: Ctx, type: Exclude<CaseStatus, "active" | "approved">, reason: string, kind?: IssueKind): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c)) return { error: "Only the person who holds this case can pause or close it." };
  if (!reason.trim()) return { error: "Give a reason." };
  const issueKind = kind ?? ISSUE_FOR[type] ?? "other";
  const issue: Issue = { id: `is-${c.id}-${Date.parse(x.at)}`, kind: issueKind, text: reason.trim(), by: x.user.name, at: x.at };
  const holdBy = type === "on_hold" ? (issueKind === "client" ? "client" : "team") : undefined;
  const label = type === "on_hold" ? (holdBy === "client" ? "on hold by client" : "on hold") : type.replace("_", " ");
  return { ...c, status: type, holdBy, endReason: reason.trim(), issues: [...c.issues, issue], notes: [...c.notes, note(x, `Case marked ${label}: ${reason.trim()}`)], updatedAt: x.at };
}

export function reactivate(c: Case, x: Ctx): Case | Fail {
  if (!canReactivate(x.user)) return { error: "Only an administrator can reactivate a case." };
  return {
    ...c, status: "active", endReason: undefined, holdBy: undefined, stageSince: x.at, deadline: plusDays(x.at, x.sla[c.stage]),
    issues: c.issues.map((i) => (i.resolvedAt ? i : { ...i, resolvedAt: x.at, resolvedBy: x.user.name, resolution: "Case reactivated." })),
    notes: [...c.notes, note(x, "Case reactivated by an administrator.")], updatedAt: x.at,
  };
}

/* ─── Notes and problems ────────────────────────────────── */
export function addNote(c: Case, x: Ctx, text: string): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c) && x.user.role !== "manager") return { error: "You cannot add notes to this case." };
  if (!text.trim()) return { error: "Write a note first." };
  return { ...c, notes: [...c.notes, note(x, text.trim())], updatedAt: x.at };
}

export function addIssue(c: Case, x: Ctx, kind: IssueKind, text: string, id: string): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c) && x.user.role !== "manager") return { error: "Only the person holding this case can record a problem." };
  if (!text.trim()) return { error: "Describe the problem." };
  return { ...c, issues: [...c.issues, { id, kind, text: text.trim(), by: x.user.name, at: x.at }], updatedAt: x.at };
}

export function resolveIssue(c: Case, x: Ctx, issueId: string, resolution?: string): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c) && x.user.role !== "manager") return { error: "Only the person holding this case can resolve a problem." };
  if (!c.issues.some((i) => i.id === issueId && !i.resolvedAt)) return { error: "That problem is already resolved." };
  return { ...c, issues: c.issues.map((i) => (i.id === issueId ? { ...i, resolvedAt: x.at, resolvedBy: x.user.name, resolution: resolution?.trim() || undefined } : i)), updatedAt: x.at };
}

/* ─── Simple field edits ────────────────────────────────── */
export type CaseEdit = Partial<Pick<Case, "deadline" | "nextAction" | "waitingFor" | "priority" | "leadSource" | "agentId" | "campaign" | "budget" | "destination" | "subDestination" | "visa">>;
export function editCase(c: Case, x: Ctx, patch: CaseEdit): Case | Fail {
  c = mine(c, x);
  if (!canEditCase(x.user, c)) return { error: "Only the person who holds this case can edit it." };
  const clean: CaseEdit = { ...patch };
  delete clean.agentId; // agents are linked with linkAgent (administrator only)
  const notes = clean.visa !== undefined && clean.visa !== c.visa ? [...c.notes, note(x, `Visa type changed from ${visaLabel(c.visa)} to ${visaLabel(clean.visa)}`)] : c.notes;
  return { ...c, ...clean, notes, updatedAt: x.at };
}

/* ─── Referral agents (administrator only) ─── */
/** Links a case to a referral agent, or removes the link (null). */
export function linkAgent(c: Case, x: Ctx, agentId: string | null, agentName?: string): Case | Fail {
  if (x.user.role !== "admin") return { error: "Only an administrator can link cases to agents." };
  if ((c.agentId ?? null) === agentId) return { error: agentId ? "This case is already linked to that agent." : "This case has no agent." };
  const text = agentId ? `Linked to referral agent ${agentName ?? ""}`.trim() : "Referral agent removed";
  return { ...c, agentId: agentId ?? undefined, agentPaidAt: agentId ? c.agentPaidAt : undefined, agentPaidBy: agentId ? c.agentPaidBy : undefined, notes: [...c.notes, note(x, text)], updatedAt: x.at };
}

/** Records that the agent's commission for this case was paid (or undoes it). */
export function setAgentPaid(c: Case, x: Ctx, paid: boolean): Case | Fail {
  if (x.user.role !== "admin") return { error: "Only an administrator can record agent payments." };
  if (!c.agentId) return { error: "This case has no referral agent." };
  return { ...c, agentPaidAt: paid ? x.at : undefined, agentPaidBy: paid ? x.user.name : undefined, updatedAt: x.at };
}

/** Records the agent's commission for this case (SAR), or clears it (null) so the agent's terms apply. */
export function setAgentCommission(c: Case, x: Ctx, amount: number | null): Case | Fail {
  if (x.user.role !== "admin") return { error: "Only an administrator can record commission." };
  if (!c.agentId) return { error: "Link the case to an agent first." };
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return { error: "Enter a valid amount." };
  if (c.agentPaidAt) return { error: "This commission is already marked as paid. Undo the payment first to change it." };
  return { ...c, commissionSar: amount, updatedAt: x.at };
}

/* ─── Automatic lead sharing (Sales) ─── */
/** Gives a waiting or automatically shared lead to an online Sales member. Done by the system, not by a person. */
export function shareCase(c: Case, to: User, at: string, fromName?: string): Case {
  const scope = c.route ? { kind: (c.route.kind === "visa" ? "visa" : "team") as "team" | "visa", visa: c.route.kind === "visa" ? c.route.visa ?? c.visa : undefined } : { kind: c.autoShared?.kind ?? "team", visa: c.autoShared?.visa };
  const first = !!c.route;
  return {
    ...c, route: undefined, salesId: to.id, consultantId: to.id, claimedAt: at,
    autoShared: { kind: scope.kind, ...(scope.visa ? { visa: scope.visa } : {}), at },
    waitingFor: STAGE_GUIDE[c.stage].waitingFor, nextAction: STAGE_GUIDE[c.stage].nextAction,
    history: [...c.history, first
      ? { from: c.stage, to: c.stage, actor: to.name, at, kind: "claim" as const, handoff: `Shared automatically with ${to.name} (Sales Team, online)` }
      : { from: c.stage, to: c.stage, actor: "Automatic sharing", at, kind: "assign" as const, handoff: `Moved from ${fromName ?? "another member"} to ${to.name} to keep leads even` }],
    updatedAt: at,
  };
}

/** "Keep this lead": the holder takes an automatically shared lead for good. */
export function keepLead(c: Case, x: Ctx): Case | Fail {
  if (!c.autoShared || c.consultantId !== x.user.id) return { error: "This lead is already yours." };
  return { ...c, autoShared: undefined, history: [...c.history, { from: c.stage, to: c.stage, actor: x.user.name, at: x.at, kind: "assign", handoff: `${x.user.name} kept this lead` }], updatedAt: x.at };
}

/* ─── What a team member keeps after handing a case on ─── */
/**
 * A team member who handed a case on keeps a reduced copy, so their own figures stay right
 * (leads passed, deals closed). It has nothing from after the handoff and can never be opened.
 */
export function pastWorkCopy(c: Case, u: User): Case | null {
  const team = u.workTeam;
  if (u.role !== "consultant" || !team || team === "case") return null;
  if (!(c.leadById === u.id || c.salesId === u.id)) return null;
  const cut = c.history.findIndex((h) => h.from && STAGE_OWNER[h.from] === team && STAGE_OWNER[h.to] !== team);
  if (cut < 0) return null;
  const handoff = c.history[cut];
  const mineSales = team === "sales" && c.salesId === u.id;
  return {
    id: c.id, ref: c.ref, clientId: c.clientId, visa: c.visa, stage: handoff.to, status: "active",
    consultantId: "", leadById: c.leadById, salesId: mineSales ? c.salesId : "", caseManagerId: "",
    priority: c.priority, destination: c.destination, budget: c.budget, campaign: c.campaign, leadSource: c.leadSource,
    dealFeeSar: mineSales ? c.dealFeeSar : undefined, feesCollectedSar: mineSales ? c.feesCollectedSar : undefined,
    stageSince: handoff.at, deadline: null, commissionSar: null, waitingFor: "With the next team", nextAction: "",
    issues: [], notes: [], history: c.history.slice(0, cut + 1), updatedAt: handoff.at, pastWork: true,
  };
}

export function openIssues(c: Case): Issue[] {
  return c.issues.filter((i) => !i.resolvedAt);
}
