import "server-only";
import { randomBytes } from "node:crypto";
import { DEFAULT_SLA_DAYS, TEMPLATES, type Agent, type Assessment, type Case, type Client, type Doc, type Message, type StageId, type Task, type Template, type Todo, type UploadLink, type User } from "@/lib/demo-data";
import { canSeeCase, canManageTodo, visibleMessages } from "@/lib/permissions";
import { DEFAULT_SETTINGS, type Bootstrap, type Settings } from "@/lib/bootstrap";
import { pastWorkCopy, type Ctx } from "@/lib/case-logic";
import { AgentModel, CaseModel, ClientModel, CounterModel, DocumentModel, MessageModel, SettingsModel, TaskModel, TodoModel, UploadLinkModel, UserModel } from "./models";
import { HttpError } from "./http-error";
import { trust } from "@/lib/server/trusted";

/* ─── Turning stored records into the shapes the app uses ─── */
type Raw = Record<string, unknown> & { _id: string };

/** Drops `_id` (renamed to `id`) and any empty optional values. */
export function out<T>(doc: Raw | null | undefined): T {
  if (!doc) throw new HttpError(404, "Not found.");
  const { _id, ...rest } = doc;
  for (const k of Object.keys(rest)) if (rest[k] === undefined) delete rest[k];
  return { id: _id, ...rest } as T;
}
/** The other direction: `id` becomes `_id`. */
export function into<T extends { id: string }>(x: T): Record<string, unknown> {
  const { id, ...rest } = x;
  return { _id: id, ...rest };
}

const USER_SECRETS = ["passwordHash", "mustChangePassword", "failedLogins", "lockedUntil", "sessionVersion"] as const;
export function outUser(doc: Raw | null | undefined): User {
  const u = out<Record<string, unknown>>(doc);
  for (const k of USER_SECRETS) delete u[k];
  return u as unknown as User;
}

export function outCase(doc: Raw | null | undefined): Case {
  const c = out<Case & { assessment?: Assessment }>(doc);
  delete c.assessment;
  return c;
}

/** Only an administrator ever receives the commission figure. */
export const forViewer = (u: User, c: Case): Case => (u.role === "admin" ? c : { ...c, commissionSar: null });

export const newId = (prefix: string) => `${prefix}_${randomBytes(10).toString("hex")}`;
export const nowIso = () => new Date().toISOString();

/* ─── Settings (one record) ─── */
export type StoredSettings = { sla: Record<StageId, number>; handlers: Record<string, string>; templates: Template[]; company: Settings };
export async function loadSettings(): Promise<StoredSettings> {
  const s = (await SettingsModel.findById("main").lean()) as { sla?: Record<StageId, number>; handlers?: Record<string, string>; templates?: Template[]; company?: Partial<Settings> } | null;
  return {
    sla: { ...DEFAULT_SLA_DAYS, ...(s?.sla ?? {}) },
    handlers: s?.handlers ?? {},
    templates: s?.templates?.length ? s.templates : TEMPLATES,
    company: { ...DEFAULT_SETTINGS, ...(s?.company ?? {}) },
  };
}

export async function allUsers(): Promise<User[]> {
  const list = (await UserModel.find().sort({ name: 1 }).lean()) as Raw[];
  return list.map(outUser);
}

/** The rules context the shared case functions need, built from the database. */
export async function ctxFor(user: User): Promise<Ctx> {
  const [users, s] = await Promise.all([allUsers(), loadSettings()]);
  return { user, users, sla: s.sla, handlers: s.handlers, at: nowIso() };
}

/** Next case reference, for example PG-26-0042. Safe when two people create a case at the same moment. */
export async function nextCaseRef(): Promise<string> {
  const yy = String(new Date().getUTCFullYear()).slice(2);
  const c = (await CounterModel.findOneAndUpdate({ _id: `case-${yy}` }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()) as { seq: number } | null;
  return `PG-${yy}-${String(c?.seq ?? 1).padStart(4, "0")}`;
}

/* ─── Cases ─── */
export async function getCase(id: string): Promise<{ c: Case; assessment?: Assessment }> {
  const raw = (await CaseModel.findById(id).lean()) as (Raw & { assessment?: Assessment }) | null;
  if (!raw) throw new HttpError(404, "Case not found.");
  return { c: outCase(raw), assessment: raw.assessment };
}

/** Case the person may see, or a 404 (never a hint that it exists). */
export async function getVisibleCase(user: User, id: string): Promise<Case> {
  const { c } = await getCase(id);
  if (!canSeeCase(user, c)) throw new HttpError(404, "Case not found.");
  return c;
}

/**
 * Saves a changed case, but only if nobody else changed it in the meantime (the `updatedAt` it was read with must
 * still match). That is what makes "first to accept gets it" safe when two people press Accept together.
 */
export async function saveCase(before: Case, after: Case): Promise<Case> {
  const { id, ...rest } = after;
  delete (rest as Partial<Case>).pastWork;
  const existing = (await CaseModel.findById(id).select({ assessment: 1 }).lean()) as { assessment?: Assessment } | null;
  const doc = { _id: id, ...rest, ...(existing?.assessment ? { assessment: existing.assessment } : {}) };
  const saved = (await CaseModel.findOneAndReplace({ _id: id, updatedAt: before.updatedAt }, doc, { new: true }).lean()) as Raw | null;
  if (!saved) throw new HttpError(409, "Someone else changed this case a moment ago. The screen has been refreshed; please try again.");
  return outCase(saved);
}

/* ─── Everything a signed-in person starts with, filtered by what they may see ─── */
export async function loadBootstrap(user: User): Promise<Bootstrap> {
  const leader = user.role !== "consultant";
  const [users, settings, rawCases] = await Promise.all([allUsers(), loadSettings(), CaseModel.find().sort({ updatedAt: -1 }).lean() as Promise<(Raw & { assessment?: Assessment })[]>]);

  const visible: Case[] = [];
  const assessments: Record<string, Assessment> = {};
  for (const raw of rawCases) {
    const c = outCase(raw);
    if (canSeeCase(user, c)) {
      visible.push(forViewer(user, c));
      if (raw.assessment) assessments[c.id] = raw.assessment;
    } else {
      const past = pastWorkCopy(c, user);
      if (past) visible.push(past);
    }
  }
  const openIds = visible.filter((c) => !c.pastWork).map((c) => c.id);
  const clientIds = [...new Set(visible.map((c) => c.clientId))];

  const [clients, docs, tasks, todos, messages, agents, links] = await Promise.all([
    (leader ? ClientModel.find() : ClientModel.find(trust({ _id: { $in: clientIds } }))).sort({ updatedAt: -1 }).lean(),
    (leader ? DocumentModel.find() : DocumentModel.find(trust({ caseId: { $in: openIds } }))).lean(),
    (leader ? TaskModel.find() : TaskModel.find(trust({ $or: [{ caseId: { $in: openIds } }, { assigneeId: user.id }] }))).lean(),
    (user.role === "admin" ? TodoModel.find() : TodoModel.find({ ownerId: user.id })).sort({ createdAt: -1 }).lean(),
    MessageModel.find().sort({ at: -1 }).limit(500).lean(),
    AgentModel.find().sort({ name: 1 }).lean(),
    (leader ? UploadLinkModel.find() : UploadLinkModel.find(trust({ caseId: { $in: openIds } }))).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    userId: user.id,
    serverNow: nowIso(),
    users,
    clients: (clients as Raw[]).map((x) => out<Client>(x)),
    cases: visible,
    docs: (docs as Raw[]).map((x) => out<Doc>(x)),
    tasks: (tasks as Raw[]).map((x) => out<Task>(x)),
    todos: (todos as Raw[]).map((x) => out<Todo>(x)).filter((t) => canManageTodo(user, t.ownerId)),
    messages: visibleMessages(user, (messages as Raw[]).map((x) => out<Message>(x))),
    // Commission terms are for administrators only.
    agents: (agents as Raw[]).map((x) => out<Agent>(x)).map((a) => (user.role === "admin" ? a : { ...a, amount: 0, paid: false, notes: "" })),
    assessments,
    uploadLinks: (links as Raw[]).map((x) => out<UploadLink>(x)),
    sla: settings.sla,
    handlers: settings.handlers,
    templates: settings.templates,
    settings: settings.company,
  };
}
