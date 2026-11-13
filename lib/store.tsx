"use client";

/**
 * App state.
 *
 * Demo mode (default): everything lives in memory and resets on reload.
 * Live mode (NEXT_PUBLIC_DATA_MODE=api): the server loads the data, every change is sent to the API, and the
 * server's saved version replaces the on-screen one. Case changes run through lib/case-logic.ts on both sides,
 * so the browser shows the change instantly and the server checks and saves exactly the same result.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AGENTS, ASSESSMENTS, CASES, CLIENTS, DEFAULT_SLA_DAYS, DOCS, MESSAGES, TASKS, TEMPLATES, TODOS, UPLOAD_LINKS, USERS,
  type Agent, type Assessment, type Case, type CaseStatus, type Client, type Doc, type IssueKind, type Message, type Priority, type Role, type StageId,
  type SubmissionStatus, type Task, type TeamId, type Template, type Todo, type UploadLink, type User, type WorkTeam,
} from "./demo-data";
import { DEMO_MODE, TODAY, syncClock } from "./dates";
import { visibleCases } from "./permissions";
import * as L from "./case-logic";
import type { CaseEdit, MoveInput, OutcomeResult, PassTarget } from "./case-logic";
import { DEFAULT_SETTINGS, type Bootstrap, type Settings } from "./bootstrap";

export type { Settings } from "./bootstrap";
export type { PassTarget, OutcomeResult } from "./case-logic";
export { nextStageFor } from "./case-logic";

export type ToastItem = { id: number; message: string; tone: "success" | "info" | "error" };

type NewClient = { name: string; phone: string; email: string; nationality: string; country?: string; dob?: string };
type NewCase = { clientId: string; visa: TeamId; leadSource: string; campaign?: string; priority: Priority; destination?: string; subDestination?: string; budget?: number; agentId?: string; note?: string; pass?: PassTarget };
type NewTodo = { title: string; notes?: string; due: string | null; priority: Priority; ownerId: string; caseId?: string };
type NewDoc = { name: string; note?: string; needsTranslation?: boolean; file?: File };
type NewMessage = Pick<Message, "subject" | "body" | "toAll" | "toUserIds" | "toTeams" | "toDepartments" | "replyToId">;
type NewLink = { caseId: string; requested: string[]; message?: string; expiresAt: string };

type Demo = {
  mode: "demo" | "api";
  user: User;
  users: User[]; clients: Client[]; cases: Case[]; visible: Case[]; docs: Doc[]; tasks: Task[];
  todos: Todo[]; messages: Message[]; agents: Agent[]; assessments: Record<string, Assessment>; uploadLinks: UploadLink[];
  sla: Record<StageId, number>; handlers: Record<string, string>; templates: Template[]; settings: Settings;
  dismissed: string[]; toasts: ToastItem[];

  toast: (message: string, tone?: ToastItem["tone"]) => void;
  closeToast: (id: number) => void;
  dismissAlert: (id: string) => void;
  restoreAlerts: () => void;

  addClient: (c: NewClient) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addCase: (c: NewCase) => Case;
  updateCase: (id: string, patch: CaseEdit) => void;
  moveStage: (id: string, opts: MoveInput) => boolean;
  passCase: (id: string, target: PassTarget, note?: string, fees?: number) => boolean;
  claimCase: (id: string) => boolean;
  assignCase: (id: string, team: WorkTeam, userId: string) => boolean;
  addSubmissionUpdate: (id: string, status: SubmissionStatus, note?: string) => boolean;
  approveQc: (id: string) => boolean;
  returnQc: (id: string, note: string) => boolean;
  logOutcome: (id: string, opts: { result: OutcomeResult; commission?: number; followUp?: "appeal" | "reapply" | "none"; note?: string }) => boolean;
  endCase: (id: string, type: Exclude<CaseStatus, "active" | "approved">, reason: string, kind?: IssueKind) => boolean;
  reactivate: (id: string) => boolean;
  keepLead: (id: string) => boolean;
  linkAgent: (id: string, agentId: string | null) => boolean;
  setAgentPaid: (id: string, paid: boolean) => boolean;
  setAgentCommission: (id: string, amount: number | null) => boolean;
  addCaseNote: (id: string, text: string) => boolean;
  addIssue: (id: string, kind: IssueKind, text: string) => boolean;
  resolveIssue: (id: string, issueId: string, resolution?: string) => boolean;
  saveAssessment: (id: string, a: Assessment) => void;

  addDoc: (caseId: string, doc: NewDoc) => Promise<boolean>;
  attachFile: (docId: string, file: File) => Promise<boolean>;
  setDocStatus: (id: string, status: Doc["status"]) => void;
  openDoc: (id: string) => void;

  createUploadLink: (l: NewLink) => Promise<UploadLink | null>;
  terminateUploadLink: (id: string) => void;
  uploadLinkUrl: (l: UploadLink) => string;

  addTodo: (t: NewTodo) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "progress">) => void;
  setTaskProgress: (id: string, progress: number) => void;

  sendMessage: (m: NewMessage) => boolean;
  markRead: (id: string) => void;
  pinMessage: (id: string, pinned: boolean) => void;
  deleteMessage: (id: string) => void;

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

const randomId = (prefix: string) => `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 20) : Math.random().toString(36).slice(2, 14)}`;
const tempPassword = () => {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return `Pg-${Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("")}`;
};

const DEMO_DATA: Bootstrap = {
  userId: "", users: USERS, clients: CLIENTS, cases: CASES, docs: DOCS, tasks: TASKS, todos: TODOS, messages: MESSAGES, agents: AGENTS,
  assessments: ASSESSMENTS, uploadLinks: UPLOAD_LINKS, sla: DEFAULT_SLA_DAYS, handlers: {}, templates: TEMPLATES, settings: DEFAULT_SETTINGS,
};

class ApiError extends Error {}

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export function DemoProvider({ userId, initial, children }: { userId: string; initial?: Bootstrap; children: ReactNode }) {
  const live = !DEMO_MODE && !!initial;
  const start = live ? initial! : DEMO_DATA;
  // Live mode: the first render uses the server's clock, so the page the server sends and the browser's first render match exactly.
  const clockSet = useRef(false);
  if (live && !clockSet.current) { syncClock(Date.parse(initial!.serverNow ?? "")); clockSet.current = true; }
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    // Then keep the clock current, so day counts and "overdue" stay right if the screen is left open.
    const run = () => { syncClock(Date.now()); setTick((t) => t + 1); };
    run();
    const t = setInterval(run, 60_000);
    return () => clearInterval(t);
  }, [live]);

  const [users, setUsers] = useState<User[]>(start.users);
  const [clients, setClients] = useState<Client[]>(start.clients);
  const [cases, setCases] = useState<Case[]>(start.cases);
  const [docs, setDocs] = useState<Doc[]>(start.docs);
  const [tasks, setTasks] = useState<Task[]>(start.tasks);
  const [todos, setTodos] = useState<Todo[]>(start.todos);
  const [messages, setMessages] = useState<Message[]>(start.messages);
  const [agents, setAgents] = useState<Agent[]>(start.agents);
  const [assessments, setAssessments] = useState<Record<string, Assessment>>(start.assessments);
  const [uploadLinks, setUploadLinks] = useState<UploadLink[]>(start.uploadLinks);
  const [sla, setSlaState] = useState<Record<StageId, number>>(start.sla);
  const [handlers, setHandlersState] = useState<Record<string, string>>(start.handlers);
  const [templates, setTemplatesState] = useState<Template[]>(start.templates);
  const [settings, setSettings] = useState<Settings>(start.settings);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Live mode: a ping every minute marks this person as online (for automatic lead sharing) and
  // refreshes the screen when anything changed elsewhere (a lead shared with you, a new message…).
  const latest = useRef({ since: "", sinceMsg: "" });
  latest.current = {
    since: cases.reduce((m, c) => (c.updatedAt > m ? c.updatedAt : m), ""),
    sinceMsg: messages.reduce((m, x) => (x.at > m ? x.at : m), ""),
  };
  useEffect(() => {
    if (!live) return;
    let stop = false;
    const beat = async () => {
      try {
        const r = await call<{ changed: boolean }>("/api/presence", "POST", latest.current);
        if (r.changed && !stop) await resync();
      } catch { /* offline for a moment; try again next minute */ }
    };
    void beat();
    const t = setInterval(beat, 60_000);
    const onShow = () => { if (document.visibilityState === "visible") void beat(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const tick = useRef(0);
  const seq = useRef(1000);
  /** Demo uses a fixed clock so screens stay stable; live mode uses the real time. */
  const now = () => (live ? new Date().toISOString() : new Date(TODAY.getTime() + ++tick.current * 60_000).toISOString());
  const uid = (p: string) => (live ? randomId(p) : `${p}${++seq.current}`);

  const user = users.find((u) => u.id === (live ? initial!.userId : userId)) ?? users[0];

  const toast: Demo["toast"] = (message, tone = "success") => {
    const id = ++seq.current;
    const text = live ? message.replace(/\s*\((?:Demo|demo)[^)]*\)\.?/g, "").trim() : message;
    setToasts((t) => [...t, { id, message: text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };

  /** Reload everything from the server after a failed save, so the screen matches what is really stored. */
  const resync = async () => {
    try {
      const b = await call<Bootstrap>("/api/bootstrap", "GET");
      setUsers(b.users); setClients(b.clients); setCases(b.cases); setDocs(b.docs); setTasks(b.tasks); setTodos(b.todos); setMessages(b.messages);
      setAgents(b.agents); setAssessments(b.assessments); setUploadLinks(b.uploadLinks); setSlaState(b.sla); setHandlersState(b.handlers); setTemplatesState(b.templates); setSettings(b.settings);
    } catch { /* keep the current screen */ }
  };
  /** Send a change to the server. On failure show the reason and reload the real data. */
  const save = <T,>(path: string, method: string, body: unknown, onOk?: (r: T) => void) => {
    if (!live) return;
    call<T>(path, method, body).then((r) => onOk?.(r)).catch((e: Error) => { toast(e.message, "error"); void resync(); });
  };

  const ctx = (): L.Ctx => ({ user, users, sla, handlers, at: now() });
  const nextRef = (offset = 1) => `PG-${String(new Date(TODAY).getUTCFullYear()).slice(2)}-${String(Math.max(0, ...cases.map((c) => Number(c.ref.slice(-4)) || 0)) + offset).padStart(4, "0")}`;
  const replaceCase = (c: Case) => setCases((l) => l.map((x) => (x.id === c.id ? c : x)));

  /** Run a case action locally, then on the server. Returns false (with a message) when the rules do not allow it. */
  const caseAction = (id: string, action: Record<string, unknown> & { type: string }, run: (c: Case, x: L.Ctx) => Case | L.Fail): boolean => {
    const c = cases.find((x) => x.id === id);
    if (!c) { toast("Case not found.", "error"); return false; }
    const res = run(c, ctx());
    if (L.isFail(res)) { toast(res.error, "error"); return false; }
    replaceCase(res);
    save<{ case: Case }>(`/api/cases/${id}/actions`, "POST", action, (r) => replaceCase(r.case));
    return true;
  };

  const value: Demo = {
    mode: live ? "api" : "demo",
    user, users, clients, cases, visible: visibleCases(user, cases), docs, tasks, todos, messages, agents, assessments, uploadLinks, sla, handlers, templates, settings, dismissed, toasts,

    toast,
    closeToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    dismissAlert: (id) => setDismissed((d) => [...d, id]),
    restoreAlerts: () => setDismissed([]),

    /* ─── Clients ─── */
    addClient: (input) => {
      const client: Client = { id: uid("c"), name: input.name.trim(), phone: input.phone.trim(), email: input.email.trim(), nationality: input.nationality, country: input.country ?? "", dob: input.dob ?? "", updatedAt: now() };
      setClients((l) => [client, ...l]);
      save<{ client: Client }>("/api/clients", "POST", client, (r) => setClients((l) => l.map((x) => (x.id === r.client.id ? r.client : x))));
      return client;
    },
    updateClient: (id, patch) => {
      setClients((l) => l.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)));
      save<{ client: Client }>(`/api/clients/${id}`, "PATCH", patch, (r) => setClients((l) => l.map((x) => (x.id === id ? r.client : x))));
    },

    /* ─── Cases ─── */
    addCase: (input) => {
      const res = L.createCase(ctx(), { ...input, id: uid("cs"), ref: nextRef() });
      if (L.isFail(res)) { toast(res.error, "error"); throw new Error(res.error); }
      setCases((l) => [res, ...l]);
      save<{ case: Case }>("/api/cases", "POST", { ...input, id: res.id }, (r) => replaceCase(r.case));
      return res;
    },
    updateCase: (id, patch) => { caseAction(id, { type: "edit", patch }, (c, x) => L.editCase(c, x, patch)); },
    moveStage: (id, opts) => caseAction(id, { type: "move", ...opts }, (c, x) => L.moveStage(c, x, opts)),
    passCase: (id, target, note, fees) => caseAction(id, { type: "pass", target, note, fees }, (c, x) => L.passCase(c, x, target, note, { fees })),
    claimCase: (id) => caseAction(id, { type: "claim" }, (c, x) => L.claimCase(c, x)),
    assignCase: (id, team, userId) => caseAction(id, { type: "assign", team, userId }, (c, x) => L.assignCase(c, x, team, userId)),
    addSubmissionUpdate: (id, status, note) => caseAction(id, { type: "submission", status, note }, (c, x) => L.addSubmissionUpdate(c, x, status, note)),
    approveQc: (id) => caseAction(id, { type: "approveQc" }, (c, x) => L.approveQc(c, x)),
    returnQc: (id, note) => caseAction(id, { type: "returnQc", note }, (c, x) => L.returnQc(c, x, note)),
    endCase: (id, type, reason, kind) => caseAction(id, { type: "end", status: type, reason, kind }, (c, x) => L.endCase(c, x, type, reason, kind)),
    reactivate: (id) => caseAction(id, { type: "reactivate" }, (c, x) => L.reactivate(c, x)),
    keepLead: (id) => caseAction(id, { type: "keep" }, (c, x) => L.keepLead(c, x)),
    linkAgent: (id, agentId) => caseAction(id, { type: "agent", agentId }, (c, x) => L.linkAgent(c, x, agentId, agents.find((a) => a.id === agentId)?.name)),
    setAgentPaid: (id, paid) => caseAction(id, { type: "agentPaid", paid }, (c, x) => L.setAgentPaid(c, x, paid)),
    setAgentCommission: (id, amount) => caseAction(id, { type: "agentCommission", amount }, (c, x) => L.setAgentCommission(c, x, amount)),
    addCaseNote: (id, text) => caseAction(id, { type: "note", text }, (c, x) => L.addNote(c, x, text)),
    addIssue: (id, kind, text) => {
      const issueId = uid("is");
      return caseAction(id, { type: "issue", kind, text, issueId }, (c, x) => L.addIssue(c, x, kind, text, issueId));
    },
    resolveIssue: (id, issueId, resolution) => caseAction(id, { type: "resolveIssue", issueId, resolution }, (c, x) => L.resolveIssue(c, x, issueId, resolution)),
    logOutcome: (id, opts) => {
      const c = cases.find((x) => x.id === id);
      if (!c) return false;
      const newId = uid("cs");
      const res = L.logOutcome(c, ctx(), { ...opts, newId, newRef: nextRef() });
      if (L.isFail(res)) { toast(res.error, "error"); return false; }
      setCases((l) => [...(res.created ? [res.created] : []), ...l.map((x) => (x.id === id ? res.updated : x))]);
      save<{ case: Case; created?: Case }>(`/api/cases/${id}/actions`, "POST", { type: "outcome", ...opts, newId }, (r) => {
        setCases((l) => l.map((x) => (x.id === r.case.id ? r.case : r.created && x.id === r.created.id ? r.created : x)));
      });
      return true;
    },
    saveAssessment: (id, a) => {
      setAssessments((m) => ({ ...m, [id]: a }));
      save(`/api/cases/${id}/assessment`, "PUT", a);
    },

    /* ─── Documents (files go to private storage; only the location is saved) ─── */
    addDoc: async (caseId, input) => {
      const doc: Doc = { id: uid("d"), caseId, name: input.name.trim(), category: "", status: "pending", uploadedBy: "—", at: now(), needsTranslation: input.needsTranslation || undefined, note: input.note?.trim() || undefined, source: "team" };
      if (!live) {
        setDocs((l) => [input.file ? { ...doc, status: "received", uploadedBy: user.name, fileName: input.file.name, size: input.file.size } : doc, ...l]);
        return true;
      }
      try {
        const { doc: created } = await call<{ doc: Doc }>("/api/documents", "POST", { id: doc.id, caseId, name: doc.name, note: doc.note, needsTranslation: doc.needsTranslation });
        setDocs((l) => [created, ...l]);
        if (input.file) return await value.attachFile(created.id, input.file);
        return true;
      } catch (e) { toast((e as Error).message, "error"); return false; }
    },
    attachFile: async (docId, file) => {
      if (!live) {
        setDocs((l) => l.map((x) => (x.id === docId ? { ...x, status: "received", uploadedBy: user.name, at: now(), fileName: file.name, size: file.size } : x)));
        return true;
      }
      try {
        const { url, key } = await call<{ url: string; key: string }>(`/api/documents/${docId}/upload-url`, "POST", { fileName: file.name, contentType: file.type || "application/octet-stream", size: file.size });
        const put = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!put.ok) throw new ApiError("The file could not be uploaded to storage. Please try again.");
        const { doc } = await call<{ doc: Doc }>(`/api/documents/${docId}/complete`, "POST", { key, fileName: file.name });
        setDocs((l) => l.map((x) => (x.id === docId ? doc : x)));
        return true;
      } catch (e) { toast((e as Error).message, "error"); return false; }
    },
    setDocStatus: (id, status) => {
      setDocs((l) => l.map((d) => (d.id === id ? { ...d, status } : d)));
      save<{ doc: Doc }>(`/api/documents/${id}`, "PATCH", { status }, (r) => setDocs((l) => l.map((x) => (x.id === id ? r.doc : x))));
    },
    openDoc: (id) => {
      if (!live) { toast("In the live system this opens the file through a private, time-limited link. (Demo.)", "info"); return; }
      window.open(`/api/documents/${id}/download`, "_blank", "noopener");
    },

    /* ─── Client upload links ─── */
    createUploadLink: async (input) => {
      const c = cases.find((x) => x.id === input.caseId);
      if (!c) return null;
      if (!live) {
        const link: UploadLink = { id: uid("ul"), token: `demo-${Math.random().toString(36).slice(2, 12)}`, caseId: c.id, clientId: c.clientId, createdById: user.id, createdAt: now(), expiresAt: input.expiresAt, requested: input.requested, message: input.message, uploads: [] };
        setUploadLinks((l) => [link, ...l]);
        return link;
      }
      try {
        const { link } = await call<{ link: UploadLink }>("/api/upload-links", "POST", input);
        setUploadLinks((l) => [link, ...l]);
        return link;
      } catch (e) { toast((e as Error).message, "error"); return null; }
    },
    terminateUploadLink: (id) => {
      const at = now();
      setUploadLinks((l) => l.map((x) => (x.id === id ? { ...x, terminatedAt: at, terminatedById: user.id } : x)));
      save<{ link: UploadLink }>(`/api/upload-links/${id}`, "PATCH", { terminate: true }, (r) => setUploadLinks((l) => l.map((x) => (x.id === id ? r.link : x))));
    },
    // Clients get the public upload address (NEXT_PUBLIC_UPLOAD_BASE_URL, e.g. https://upload.yourdomain.com) when it is set, so the CRM address is never shown to them.
    uploadLinkUrl: (l) => `${(process.env.NEXT_PUBLIC_UPLOAD_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "")}/k/${l.token}`,

    /* ─── To-do lists and partner tasks ─── */
    addTodo: (t) => {
      const todo: Todo = { ...t, id: uid("td"), done: false, createdBy: user.id, createdAt: now() };
      setTodos((l) => [todo, ...l]);
      save<{ todo: Todo }>("/api/todos", "POST", todo, (r) => setTodos((l) => l.map((x) => (x.id === todo.id ? r.todo : x))));
    },
    updateTodo: (id, patch) => {
      setTodos((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      save<{ todo: Todo }>(`/api/todos/${id}`, "PATCH", patch, (r) => setTodos((l) => l.map((x) => (x.id === id ? r.todo : x))));
    },
    deleteTodo: (id) => {
      setTodos((l) => l.filter((t) => t.id !== id));
      save(`/api/todos/${id}`, "DELETE", {});
    },
    addTask: (t) => {
      const task: Task = { ...t, id: uid("tk"), progress: 0 };
      setTasks((l) => [task, ...l]);
      save<{ task: Task }>("/api/tasks", "POST", task, (r) => setTasks((l) => l.map((x) => (x.id === task.id ? r.task : x))));
    },
    setTaskProgress: (id, progress) => {
      setTasks((l) => l.map((t) => (t.id === id ? { ...t, progress } : t)));
      save(`/api/tasks/${id}`, "PATCH", { progress });
    },

    /* ─── Team Notepad messages ─── */
    sendMessage: (m) => {
      const msg: Message = { ...m, id: uid("m"), fromId: user.id, at: now(), pinned: false, readBy: [user.id] };
      setMessages((l) => [msg, ...l]);
      save<{ message: Message }>("/api/messages", "POST", msg, (r) => setMessages((l) => l.map((x) => (x.id === msg.id ? r.message : x))));
      return true;
    },
    markRead: (id) => {
      const m = messages.find((x) => x.id === id);
      if (!m || m.readBy.includes(user.id)) return;
      setMessages((l) => l.map((x) => (x.id === id ? { ...x, readBy: [...x.readBy, user.id] } : x)));
      save(`/api/messages/${id}`, "PATCH", { read: true });
    },
    pinMessage: (id, pinned) => {
      setMessages((l) => l.map((x) => (x.id === id ? { ...x, pinned } : x)));
      save(`/api/messages/${id}`, "PATCH", { pinned });
    },
    deleteMessage: (id) => {
      setMessages((l) => l.filter((x) => x.id !== id));
      save(`/api/messages/${id}`, "DELETE", {});
    },

    /* ─── People and settings ─── */
    addUser: (u) => {
      const created: User = { id: uid("u"), name: u.name.trim(), email: u.email.trim().toLowerCase(), role: u.role, workTeam: u.workTeam, teams: u.teams, title: u.title || "Team member", canAdd: u.canAdd, lastSeen: now() };
      const pw = tempPassword();
      setUsers((l) => [...l, created]);
      save<{ user: User }>("/api/users", "POST", { ...created, tempPassword: pw }, (r) => setUsers((l) => l.map((x) => (x.id === created.id ? r.user : x))));
      return { user: created, tempPassword: pw };
    },
    updateUser: (id, patch) => {
      setUsers((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      save<{ user: User }>(`/api/users/${id}`, "PATCH", patch, (r) => setUsers((l) => l.map((x) => (x.id === id ? r.user : x))));
    },
    resetPassword: (id) => {
      const pw = tempPassword();
      save(`/api/users/${id}`, "PATCH", { tempPassword: pw });
      return pw;
    },
    addAgent: (a) => {
      const agent: Agent = { ...a, id: uid("ag"), paid: false };
      setAgents((l) => [...l, agent]);
      save("/api/agents", "POST", agent);
    },
    updateAgent: (id, patch) => {
      setAgents((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      save(`/api/agents/${id}`, "PATCH", patch);
    },
    setSla: (v) => { setSlaState(v); save("/api/settings", "PUT", { sla: v }); },
    setHandlers: (v) => { setHandlersState(v); save("/api/settings", "PUT", { handlers: v }); },
    setTemplates: (v) => { setTemplatesState(v); save("/api/settings", "PUT", { templates: v }); },
    saveSettings: (patch) => { setSettings((s) => ({ ...s, ...patch })); save("/api/settings", "PUT", { company: patch }); },
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
