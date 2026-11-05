"use client";

/**
 * DEMO STATE. Everything lives in memory, so it resets on a full page reload.
 * Each action below is the exact place a real API call goes in Phase 2.
 */
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import {
  AGENTS, ASSESSMENTS, CASES, CLIENTS, DEFAULT_SLA_DAYS, DOCS, OWNER_LABEL, STAGES, STAGE_GUIDE, STAGE_OWNER, TASKS, TEAM_NOTES, TEMPLATES, TODOS, USERS, responsibleFor,
  type Agent, type Assessment, type Case, type Route, type SubmissionStatus, type Todo, type CaseStatus, type Client, type Doc, type Priority, type Role, type StageId, type Task, type TeamId, type TeamNote, type Template, type User, type WorkTeam,
} from "./demo-data";
import { TODAY, isoFromToday } from "./dates";
import { visaLabel as visaLabelOf } from "./demo-data";
import { visibleCases } from "./permissions";

export type Settings = {
  tradingName: string; legalName: string; email: string; phone: string; city: string; country: string;
  language: string; currency: string; dateFormat: string; timezone: string; workweek: string; emailConnected: boolean;
};

export type ToastItem = { id: number; message: string; tone: "success" | "info" | "error" };

export function nextStageFor(c: Pick<Case, "stage" | "visa">): StageId | null {
  let i = STAGES.findIndex((s) => s.id === c.stage) + 1;
  if (i >= STAGES.length) return null;
  if (c.visa === "visit" && STAGES[i].id === "docassess") i += 1;
  return STAGES[i]?.id ?? null;
}

type NewClient = { name: string; phone: string; email: string; nationality: string; country?: string; dob?: string };
export type PassTarget = { kind: Route["kind"]; visa?: TeamId; userId?: string };
type NewCase = { clientId: string; visa: TeamId; leadSource: string; priority: Priority; destination: string; budget?: number; agentId?: string; note?: string; pass?: PassTarget };
export type OutcomeResult = "approved" | "refused" | "returned" | "withdrawn";
type NewTodo = { title: string; notes?: string; due: string | null; priority: Priority; ownerId: string; caseId?: string };
type NewDoc = { name: string; note?: string; needsTranslation?: boolean; fileName?: string };

type Demo = {
  user: User;
  users: User[]; clients: Client[]; cases: Case[]; visible: Case[]; docs: Doc[]; tasks: Task[];
  todos: Todo[]; teamNotes: TeamNote[]; agents: Agent[]; assessments: Record<string, Assessment>;
  sla: Record<StageId, number>; handlers: Record<string, string>; templates: Template[]; settings: Settings;
  dismissed: string[]; toasts: ToastItem[];

  toast: (message: string, tone?: ToastItem["tone"]) => void;
  closeToast: (id: number) => void;
  dismissAlert: (id: string) => void;
  restoreAlerts: () => void;

  addClient: (c: NewClient) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addCase: (c: NewCase) => Case;
  updateCase: (id: string, patch: Partial<Case>) => void;
  moveStage: (id: string, opts: { note?: string; appointmentAt?: string; fees?: number; submissionStatus?: SubmissionStatus }) => void;
  passCase: (id: string, target: PassTarget, note?: string) => void;
  claimCase: (id: string) => void;
  assignCase: (id: string, team: WorkTeam, userId: string) => void;
  addSubmissionUpdate: (id: string, status: SubmissionStatus, note?: string) => void;
  approveQc: (id: string) => void;
  returnQc: (id: string, note: string) => void;
  logOutcome: (id: string, opts: { result: OutcomeResult; commission?: number; followUp?: "appeal" | "reapply" | "none"; note?: string }) => void;
  endCase: (id: string, type: Exclude<CaseStatus, "active" | "approved">, reason: string) => void;
  reactivate: (id: string) => void;
  addCaseNote: (id: string, text: string) => void;
  saveAssessment: (id: string, a: Assessment) => void;
  addDoc: (caseId: string, doc: NewDoc) => void;
  attachDoc: (id: string, fileName: string) => void;
  setDocStatus: (id: string, status: Doc["status"]) => void;
  addTodo: (t: NewTodo) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "progress">) => void;
  setTaskProgress: (id: string, progress: number) => void;
  addTeamNote: (n: Pick<TeamNote, "title" | "content" | "category" | "pinned" | "departments" | "people">) => void;
  updateTeamNote: (id: string, patch: Partial<TeamNote>) => void;
  deleteTeamNote: (id: string) => void;
  addUser: (u: { name: string; email: string; role: Role; workTeam?: WorkTeam; teams: TeamId[]; title: string; canAdd: boolean }) => { user: User; tempPassword: string };
  updateUser: (id: string, patch: Partial<User>) => void;
  resetPassword: (id: string) => string;
  addAgent: (a: Omit<Agent, "id" | "paid">) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  setSla: (v: Record<StageId, number>) => void;
  setHandlers: (v: Record<string, string>) => void;
  setTemplates: (v: Template[]) => void;
  saveSettings: (patch: Partial<Settings>) => void;
};

const Ctx = createContext<Demo | null>(null);

export function useDemo(): Demo {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoProvider");
  return v;
}

const tempPassword = () => `Pg-${Math.random().toString(36).slice(2, 8)}`;

export function DemoProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(USERS);
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [cases, setCases] = useState<Case[]>(CASES);
  const [docs, setDocs] = useState<Doc[]>(DOCS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [todos, setTodos] = useState<Todo[]>(TODOS);
  const [teamNotes, setTeamNotes] = useState<TeamNote[]>(TEAM_NOTES);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [assessments, setAssessments] = useState<Record<string, Assessment>>(ASSESSMENTS);
  const [sla, setSlaState] = useState<Record<StageId, number>>(DEFAULT_SLA_DAYS);
  const [handlers, setHandlersState] = useState<Record<string, string>>({});
  const [templates, setTemplatesState] = useState<Template[]>(TEMPLATES);
  const [settings, setSettings] = useState<Settings>({
    tradingName: "Perfectgration", legalName: "", email: "info@futurebridgeofficial.com", phone: "", city: "", country: "Saudi Arabia",
    language: "English", currency: "SAR", dateFormat: "DD MMM YYYY", timezone: "Asia/Riyadh (UTC+3)", workweek: "Sunday to Thursday", emailConnected: false,
  });
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const tick = useRef(0);
  const seq = useRef(1000);
  const now = () => new Date(TODAY.getTime() + ++tick.current * 60_000).toISOString();
  const uid = (p: string) => `${p}${++seq.current}`;

  const user = users.find((u) => u.id === userId) ?? users[0];

  const toast: Demo["toast"] = (message, tone = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };

  const patchCase = (id: string, fn: (c: Case) => Case) => setCases((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  const doPass = (c: Case, target: PassTarget, note: string | undefined, at: string) => {
    const to = nextStageFor(c);
    if (!to) return;
    const team = STAGE_OWNER[to] as "sales" | "case";
    const guide = STAGE_GUIDE[to];
    const visa = target.kind === "visa" && target.visa ? target.visa : c.visa;
    const person = target.kind === "person" ? users.find((u) => u.id === target.userId) : undefined;
    const route: Route | undefined = person ? undefined : { to: team, kind: target.kind, visa: target.kind === "visa" ? visa : undefined, by: user.name, at };
    const dest = person ? person.name : target.kind === "visa" ? `the ${visaLabelOf(visa)} team` : `the whole ${OWNER_LABEL[team]}`;
    const key = team === "sales" ? "salesId" : "caseManagerId";
    patchCase(c.id, (x) => ({
      ...x, visa, stage: to, stageSince: at, route, [key]: person?.id ?? "", consultantId: person?.id ?? "", claimedAt: person ? at : undefined,
      deadline: isoFromToday(sla[to]), waitingFor: person ? guide.waitingFor : `Someone in ${dest} to accept`, nextAction: person ? guide.nextAction : "Accept the case so the first step can start",
      notes: note ? [...x.notes, { text: note, author: user.name, at }] : x.notes,
      history: [...x.history, { from: x.stage, to, actor: user.name, at, note, kind: "stage", handoff: `Passed to ${dest} (${OWNER_LABEL[team]})${person ? "" : ". Waiting for someone to accept"}` }], updatedAt: at,
    }));
  };

  const value: Demo = {
    user, users, clients, cases, visible: visibleCases(user, cases), docs, tasks, todos, teamNotes, agents, assessments, sla, handlers, templates, settings, dismissed, toasts,

    toast,
    closeToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    dismissAlert: (id) => setDismissed((d) => [...d, id]),
    restoreAlerts: () => setDismissed([]),

    addClient: (input) => {
      const client: Client = { id: uid("c"), name: input.name.trim(), phone: input.phone.trim(), email: input.email.trim(), nationality: input.nationality, country: input.country ?? "", dob: input.dob ?? "", updatedAt: now() };
      setClients((l) => [client, ...l]);
      return client;
    },
    updateClient: (id, patch) => setClients((l) => l.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c))),

    addCase: (input) => {
      const at = now();
      const next = Math.max(0, ...cases.map((c) => Number(c.ref.slice(-4)) || 0)) + 1;
      const guide = STAGE_GUIDE.lead;
      const created: Case = {
        id: uid("cs"), ref: `PG-26-${String(next).padStart(4, "0")}`, clientId: input.clientId, visa: input.visa, stage: "lead", status: "active",
        consultantId: user.id, leadById: user.id, salesId: "", caseManagerId: "", priority: input.priority, destination: input.destination, budget: input.budget,
        stageSince: at, deadline: isoFromToday(sla.lead), leadSource: input.leadSource, agentId: input.agentId || undefined,
        commissionSar: null, waitingFor: guide.waitingFor, nextAction: guide.nextAction,
        notes: input.note ? [{ text: input.note, author: user.name, at }] : [],
        history: [{ from: null, to: "lead", actor: user.name, at, kind: "stage" }], updatedAt: at,
      };
      setCases((l) => [created, ...l]);
      if (input.pass) doPass(created, input.pass, undefined, at);
      return created;
    },
    updateCase: (id, patch) => patchCase(id, (c) => ({ ...c, ...patch, updatedAt: now() })),

    passCase: (id, target, note) => {
      const c = cases.find((x) => x.id === id);
      if (c) doPass(c, target, note, now());
    },
    claimCase: (id) => {
      const c = cases.find((x) => x.id === id);
      if (!c?.route) return;
      const at = now();
      const key = c.route.to === "sales" ? "salesId" : "caseManagerId";
      patchCase(id, (x) => ({
        ...x, [key]: user.id, consultantId: user.id, route: undefined, claimedAt: at, deadline: isoFromToday(sla[x.stage]),
        history: [...x.history, { from: x.stage, to: x.stage, actor: user.name, at, kind: "claim", handoff: `${user.name} accepted this case (${OWNER_LABEL[STAGE_OWNER[x.stage]]})` }], updatedAt: at,
      }));
    },
    assignCase: (id, team, userId) => {
      const at = now();
      const who = users.find((u) => u.id === userId)?.name ?? "someone";
      const key = team === "social" ? "leadById" : team === "sales" ? "salesId" : "caseManagerId";
      patchCase(id, (x) => {
        const owns = STAGE_OWNER[x.stage] === team;
        return {
          ...x, [key]: userId, consultantId: owns ? userId : x.consultantId, route: owns ? undefined : x.route, claimedAt: owns ? at : x.claimedAt,
          history: [...x.history, { from: x.stage, to: x.stage, actor: user.name, at, kind: "assign", handoff: `Assigned to ${who} (${OWNER_LABEL[team]}) by ${user.name}` }], updatedAt: at,
        };
      });
    },

    moveStage: (id, opts) => {
      const c = cases.find((x) => x.id === id);
      if (!c) return;
      const to = nextStageFor(c);
      if (!to || to === "outcome") return;
      if (STAGE_OWNER[c.stage] !== STAGE_OWNER[to]) return; // handoffs go through passCase
      if (to === "submitted" && !c.qcApprovedAt) return; // review sign-off is required before submission
      const at = now();
      const guide = STAGE_GUIDE[to];
      const handler = handlers[`${c.visa}:${to}`];
      const responsible = handler || c.consultantId;
      patchCase(id, (x) => ({
        ...x, stage: to, stageSince: at, consultantId: responsible,
        deadline: isoFromToday(sla[to]), waitingFor: guide.waitingFor, nextAction: guide.nextAction,
        appointmentAt: to === "appointment" ? opts.appointmentAt ?? x.appointmentAt : x.appointmentAt,
        agreementSigned: to === "advance" ? true : x.agreementSigned,
        feesCollectedSar: x.stage === "advance" ? opts.fees ?? x.feesCollectedSar : x.feesCollectedSar,
        docsVerified: to === "prep" ? true : x.docsVerified,
        qcNote: to === "review" ? undefined : x.qcNote,
        qcApprovedAt: to === "review" ? undefined : x.qcApprovedAt,
        submittedAt: to === "submitted" ? at : x.submittedAt,
        submissionLog: to === "submitted" ? [{ status: opts.submissionStatus ?? "received", note: opts.note, by: user.name, at }] : x.submissionLog,
        notes: opts.note ? [...x.notes, { text: opts.note, author: user.name, at }] : x.notes,
        history: [...x.history, { from: x.stage, to, actor: user.name, at, note: opts.note, kind: "stage" }],
        updatedAt: at,
      }));
    },
    addSubmissionUpdate: (id, status, note) => {
      const at = now();
      patchCase(id, (x) => ({ ...x, submissionLog: [...(x.submissionLog ?? []), { status, note, by: user.name, at }], updatedAt: at }));
    },
    approveQc: (id) => {
      const at = now();
      patchCase(id, (x) => ({ ...x, qcApprovedAt: at, qcBy: user.name, qcNote: undefined, deadline: isoFromToday(2), nextAction: "Submit to the embassy or VFS and log the time", waitingFor: "Submission", notes: [...x.notes, { text: "Review: approved. Ready to submit.", author: user.name, at }], updatedAt: at }));
    },
    returnQc: (id, note) => {
      const at = now();
      patchCase(id, (x) => ({
        ...x, stage: "prep", stageSince: at, deadline: isoFromToday(sla.prep), qcApprovedAt: undefined, qcBy: undefined, qcNote: note,
        nextAction: "Fix the review feedback and send the file for review again", waitingFor: "Corrections from the case manager",
        notes: [...x.notes, { text: `Review: returned for changes. ${note}`, author: user.name, at }],
        history: [...x.history, { from: "review", to: "prep", actor: user.name, at, note, kind: "stage" }], updatedAt: at,
      }));
    },
    logOutcome: (id, opts) => {
      const c = cases.find((x) => x.id === id);
      if (!c) return;
      const at = now();
      const by = user.name;
      const outcomeHistory = (x: Case, note?: string) => [...x.history, { from: x.stage, to: "outcome" as StageId, actor: by, at, note, kind: "stage" as const }];
      if (opts.result === "approved") {
        patchCase(id, (x) => ({
          ...x, stage: "outcome", stageSince: at, status: "approved", deadline: null,
          commissionSar: opts.commission ?? x.commissionSar ?? null, waitingFor: STAGE_GUIDE.outcome.waitingFor, nextAction: STAGE_GUIDE.outcome.nextAction,
          notes: [...x.notes, { text: `Result: approved. Client notified.${opts.note ? ` ${opts.note}` : ""}`, author: by, at }],
          history: outcomeHistory(x, opts.note), updatedAt: at,
        }));
        return;
      }
      if (opts.result === "returned" || opts.result === "withdrawn") {
        const label = opts.result === "returned" ? "returned by the authority" : "withdrawn by the client";
        patchCase(id, (x) => ({
          ...x, stage: "outcome", stageSince: at, status: opts.result as "returned" | "withdrawn", deadline: null, endReason: opts.note || `Application ${label}.`,
          notes: [...x.notes, { text: `Result: ${label}. ${opts.note ?? ""}`.trim(), author: by, at }], history: outcomeHistory(x, opts.note), updatedAt: at,
        }));
        return;
      }
      const followUp = opts.followUp ?? "none";
      if (followUp === "appeal") {
        patchCase(id, (x) => ({
          ...x, stage: "prep", stageSince: at, status: "active", endReason: undefined, deadline: isoFromToday(sla.prep),
          qcApprovedAt: undefined, qcBy: undefined, waitingFor: "Appeal documents", nextAction: "Review the denial reasons and prepare the appeal",
          notes: [...x.notes, { text: `Result: denied. Loop back: appeal. ${opts.note ?? ""}`.trim(), author: by, at }],
          history: [...x.history, { from: x.stage, to: "prep", actor: by, at, note: "Denied. Loop back: appeal", kind: "stage", handoff: "Back to Case Prep" }], updatedAt: at,
        }));
        return;
      }
      const closed = (x: Case): Case => ({
        ...x, stage: "outcome", stageSince: at, status: "refused", deadline: isoFromToday(2),
        endReason: followUp === "reapply" ? "Denied. The client will re-apply under a new case." : opts.note || "Denied by the authority.",
        waitingFor: "Appeal options", nextAction: "Review appeal options within 48 hours",
        notes: [...x.notes, { text: `Result: denied. ${opts.note ?? ""}`.trim(), author: by, at }], history: outcomeHistory(x, opts.note), updatedAt: at,
      });
      if (followUp === "reapply") {
        const next = Math.max(0, ...cases.map((x) => Number(x.ref.slice(-4)) || 0)) + 1;
        const fresh: Case = {
          ...c, id: uid("cs"), ref: `PG-26-${String(next).padStart(4, "0")}`, stage: "lead", status: "active", stageSince: at, deadline: isoFromToday(sla.lead), consultantId: c.leadById,
          salesId: "", caseManagerId: "", route: undefined, claimedAt: undefined, submittedAt: undefined, submissionLog: undefined,
          commissionSar: null, endReason: undefined, qcApprovedAt: undefined, qcBy: undefined, qcNote: undefined, docsVerified: undefined, agreementSigned: undefined, feesCollectedSar: undefined, appointmentAt: undefined,
          waitingFor: STAGE_GUIDE.lead.waitingFor, nextAction: STAGE_GUIDE.lead.nextAction,
          notes: [{ text: `Re-application after the denial of ${c.ref}.`, author: by, at }], history: [{ from: null, to: "lead", actor: by, at, note: `Re-apply from ${c.ref}`, kind: "stage" }], updatedAt: at,
        };
        setCases((l) => [fresh, ...l.map((x) => (x.id === id ? closed(x) : x))]);
        return;
      }
      patchCase(id, closed);
    },
    endCase: (id, type, reason) => {
      const at = now();
      patchCase(id, (x) => ({ ...x, status: type, endReason: reason, notes: [...x.notes, { text: `Case marked ${type.replace("_", " ")}: ${reason}`, author: user.name, at }], updatedAt: at }));
    },
    reactivate: (id) => {
      const at = now();
      patchCase(id, (x) => ({
        ...x, status: "active", endReason: undefined, stageSince: at, deadline: isoFromToday(sla[x.stage]),
        notes: [...x.notes, { text: "Case reactivated by an administrator.", author: user.name, at }], updatedAt: at,
      }));
    },
    addCaseNote: (id, text) => {
      const at = now();
      patchCase(id, (x) => ({ ...x, notes: [...x.notes, { text, author: user.name, at }], updatedAt: at }));
    },
    saveAssessment: (id, a) => {
      setAssessments((m) => ({ ...m, [id]: a }));
      patchCase(id, (x) => ({ ...x, updatedAt: now() }));
    },
    addDoc: (caseId, doc) =>
      setDocs((l) => [{ id: uid("d"), caseId, name: doc.name.trim(), category: "", status: doc.fileName ? "received" : "pending", uploadedBy: doc.fileName ? user.name : "—", at: now(), needsTranslation: doc.needsTranslation || undefined, note: doc.note?.trim() || undefined, fileName: doc.fileName }, ...l]),
    attachDoc: (id, fileName) => setDocs((l) => l.map((x) => (x.id === id ? { ...x, status: "received", uploadedBy: user.name, at: now(), fileName } : x))),
    setDocStatus: (id, status) => setDocs((l) => l.map((d) => (d.id === id ? { ...d, status } : d))),

    addTodo: (t) => setTodos((l) => [{ ...t, id: uid("td"), done: false, createdBy: user.id, createdAt: now() }, ...l]),
    updateTodo: (id, patch) => setTodos((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTodo: (id) => setTodos((l) => l.filter((t) => t.id !== id)),
    addTask: (t) => setTasks((l) => [{ ...t, id: uid("tk"), progress: 0 }, ...l]),
    setTaskProgress: (id, progress) => setTasks((l) => l.map((t) => (t.id === id ? { ...t, progress } : t))),

    addTeamNote: (n) => setTeamNotes((l) => [{ ...n, id: uid("tn"), author: user.name, updatedAt: now() }, ...l]),
    updateTeamNote: (id, patch) => setTeamNotes((l) => l.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n))),
    deleteTeamNote: (id) => setTeamNotes((l) => l.filter((n) => n.id !== id)),

    addUser: (u) => {
      const created: User = { id: uid("u"), name: u.name.trim(), email: u.email.trim().toLowerCase(), role: u.role, workTeam: u.workTeam, teams: u.teams, title: u.title || "Team member", canAdd: u.canAdd, lastSeen: now() };
      setUsers((l) => [...l, created]);
      return { user: created, tempPassword: tempPassword() };
    },
    updateUser: (id, patch) => setUsers((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    resetPassword: () => tempPassword(),

    addAgent: (a) => setAgents((l) => [...l, { ...a, id: uid("ag"), paid: false }]),
    updateAgent: (id, patch) => setAgents((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a))),

    setSla: (v) => setSlaState(v),
    setHandlers: (v) => setHandlersState(v),
    setTemplates: (v) => setTemplatesState(v),
    saveSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onClose={value.closeToast} />
    </Ctx.Provider>
  );
}

function ToastHost({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: number) => void }) {
  const tone = { success: "border-green-300 bg-green-50 text-green-950", info: "border-brand bg-brand-soft text-ink", error: "border-red-300 bg-red-50 text-red-950" };
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 text-[0.9375rem] shadow-lg ${tone[t.tone]}`}>
          <p className="flex-1">{t.message}</p>
          <button type="button" onClick={() => onClose(t.id)} aria-label="Dismiss message" className="-m-1 flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5">×</button>
        </div>
      ))}
    </div>
  );
}
