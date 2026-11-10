/**
 * The 13 MongoDB collections.
 *
 * Every record uses a text `_id` (for example "cs_3f9a…") so the same id works in the browser and in the database.
 * Dates are stored as ISO text in UTC ("2026-10-21T06:00:00.000Z"), which sorts and compares correctly.
 * Files are never stored here: a document only keeps the private S3 key of its file.
 */
import mongoose, { Schema, type Model } from "mongoose";

/**
 * Defence in depth: any query value that contains a Mongo operator (such as {"$ne": ""}) is treated as plain data,
 * not as an instruction. Filters this code writes itself are marked trusted (see lib/server/trusted.ts).
 */
mongoose.set("sanitizeFilter", true);

const opts = { versionKey: false, minimize: false } as const;
const sub = { _id: false } as const;
const S = String;
const optStr = String;
const optNum = Number;
const optBool = Boolean;

/**
 * Builds a schema without Mongoose's type inference (which is very slow for schemas this size).
 * The shapes are already typed in lib/demo-data.ts, and every input is checked with zod in the API.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schema = (def: Record<string, unknown>, o: Record<string, unknown> = opts): Schema => new Schema(def as any, o as any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;
function model(name: string, s: Schema, collection: string): AnyModel {
  return (mongoose.models[name] as AnyModel) ?? mongoose.model(name, s, collection);
}

/* 1. users: people who can sign in. Passwords are stored only as bcrypt hashes. */
const UserSchema = schema({
  _id: S,
  name: { type: S, required: true, trim: true },
  email: { type: S, required: true, lowercase: true, trim: true, unique: true },
  role: { type: S, enum: ["admin", "manager", "consultant"], required: true },
  teams: { type: [S], default: [] },
  workTeam: { type: S, enum: ["social", "sales", "case"], default: undefined },
  title: { type: S, default: "Team member" },
  canAdd: optBool,
  inactive: optBool,
  lastSeen: { type: S, default: () => new Date().toISOString() },
  lastActiveAt: S,
  passwordHash: { type: S, required: true },
  mustChangePassword: { type: Boolean, default: true },
  failedLogins: { type: Number, default: 0 },
  lockedUntil: optStr,
  /** Goes up when the password changes or the account is switched off, which signs the person out everywhere. */
  sessionVersion: { type: Number, default: 1 },
});

/* 2. clients */
const ClientSchema = schema({
  _id: S,
  name: { type: S, required: true, trim: true },
  phone: { type: S, default: "" },
  email: { type: S, default: "" },
  nationality: { type: S, default: "" },
  country: { type: S, default: "" },
  dob: { type: S, default: "" },
  updatedAt: { type: S, required: true },
});
ClientSchema.index({ phone: 1 });
ClientSchema.index({ name: 1 });

/* 3. cases: the whole case, with its history, notes, problems and submission log embedded. */
const RouteSchema = schema({ to: S, kind: S, visa: optStr, userId: optStr, by: S, at: S }, sub);
const NoteSchema = schema({ text: S, author: S, at: S }, sub);
const HistorySchema = schema({ from: { type: S, default: null }, to: S, actor: S, at: S, note: optStr, handoff: optStr, kind: optStr }, sub);
const IssueSchema = schema({ id: S, kind: S, text: S, by: S, at: S, resolvedAt: optStr, resolvedBy: optStr, resolution: optStr }, sub);
const SubmissionSchema = schema({ status: S, note: optStr, by: S, at: S }, sub);
const AutoSharedSchema = schema({ kind: S, visa: optStr, at: S }, sub);
const CaseSchema = schema({
  _id: S,
  ref: { type: S, required: true, unique: true },
  clientId: { type: S, required: true, index: true },
  visa: { type: S, required: true },
  stage: { type: S, required: true, index: true },
  status: { type: S, required: true, index: true },
  consultantId: { type: S, default: "" },
  leadById: { type: S, default: "" },
  salesId: { type: S, default: "" },
  caseManagerId: { type: S, default: "" },
  route: { type: RouteSchema, default: undefined },
  claimedAt: optStr,
  submittedAt: optStr,
  submissionLog: { type: [SubmissionSchema], default: undefined },
  resultNote: optStr,
  issues: { type: [IssueSchema], default: [] },
  campaign: optStr,
  dealFeeSar: optNum,
  priority: { type: S, default: "normal" },
  destination: { type: S, default: "" },
  budget: optNum,
  appointmentAt: optStr,
  agreementSigned: optBool,
  feesCollectedSar: { type: Number, default: undefined },
  docsVerified: optBool,
  qcApprovedAt: optStr,
  qcBy: optStr,
  qcNote: optStr,
  stageSince: { type: S, required: true },
  deadline: { type: S, default: null },
  leadSource: { type: S, default: "" },
  agentId: optStr,
  /** Administrator only. Removed before any data is sent to anyone else. */
  commissionSar: { type: Number, default: null },
  endReason: optStr,
  waitingFor: { type: S, default: "" },
  nextAction: { type: S, default: "" },
  notes: { type: [NoteSchema], default: [] },
  history: { type: [HistorySchema], default: [] },
  /** The eligibility (document) assessment, when one has been done. */
  assessment: { type: Schema.Types.Mixed, default: undefined },
  autoShared: { type: AutoSharedSchema, default: undefined },
  holdBy: S,
  agentPaidAt: S,
  agentPaidBy: S,
  updatedAt: { type: S, required: true },
});
CaseSchema.index({ consultantId: 1, status: 1 });
CaseSchema.index({ updatedAt: -1 });

/* 4. documents: details of each document. The file itself lives in S3 under `storageKey`. */
const DocumentSchema = schema({
  _id: S,
  caseId: { type: S, required: true, index: true },
  name: { type: S, required: true },
  category: { type: S, default: "" },
  status: { type: S, enum: ["pending", "received", "verified"], default: "pending" },
  uploadedBy: { type: S, default: "—" },
  at: { type: S, required: true },
  needsTranslation: optBool,
  note: optStr,
  fileName: optStr,
  storageKey: optStr,
  size: optNum,
  contentType: optStr,
  source: optStr,
  linkId: optStr,
});

/* 5. uploadlinks: secure links clients use to upload files. */
const LinkUploadSchema = schema({ docId: S, name: S, item: optStr, at: S }, sub);
const UploadLinkSchema = schema({
  _id: S,
  token: { type: S, required: true, unique: true },
  caseId: { type: S, required: true, index: true },
  clientId: { type: S, required: true },
  createdById: { type: S, required: true },
  createdAt: { type: S, required: true },
  expiresAt: { type: S, required: true },
  requested: { type: [S], default: [] },
  message: optStr,
  terminatedAt: optStr,
  terminatedById: optStr,
  uploads: { type: [LinkUploadSchema], default: [] },
});

/* 6. messages: Team Notepad. */
const MessageSchema = schema({
  _id: S,
  fromId: { type: S, required: true, index: true },
  subject: { type: S, required: true },
  body: { type: S, required: true },
  at: { type: S, required: true },
  toAll: { type: Boolean, default: false },
  toUserIds: { type: [S], default: [] },
  toTeams: { type: [S], default: [] },
  toDepartments: { type: [S], default: [] },
  replyToId: optStr,
  pinned: { type: Boolean, default: false },
  readBy: { type: [S], default: [] },
});
MessageSchema.index({ at: -1 });

/* 7. todos: everyone's to-do lists. */
const TodoSchema = schema({
  _id: S,
  title: { type: S, required: true },
  notes: optStr,
  due: { type: S, default: null },
  priority: { type: S, default: "normal" },
  done: { type: Boolean, default: false },
  ownerId: { type: S, required: true, index: true },
  createdBy: { type: S, required: true },
  createdAt: { type: S, required: true },
  caseId: optStr,
});

/* 8. partnertasks: work waiting on a third party (bank, translator, embassy, …). */
const TaskSchema = schema({
  _id: S,
  title: { type: S, required: true },
  caseId: { type: S, required: true, index: true },
  partner: { type: S, default: "" },
  assigneeId: { type: S, default: "" },
  deadline: { type: S, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
});

/* 9. agents: referral agents and their commission terms. */
const AgentSchema = schema({
  _id: S,
  name: { type: S, required: true },
  city: { type: S, default: "" },
  phone: { type: S, default: "" },
  email: { type: S, default: "" },
  commissionType: { type: S, enum: ["flat", "percent"], default: "flat" },
  amount: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  notes: { type: S, default: "" },
});

/* 10. settings: one record ("main") with the company details, step deadlines, default handlers and message templates. */
const SettingsSchema = schema({
  _id: S,
  company: { type: Schema.Types.Mixed, default: {} },
  sla: { type: Schema.Types.Mixed, default: {} },
  handlers: { type: Schema.Types.Mixed, default: {} },
  templates: { type: Schema.Types.Mixed, default: [] },
  /** Result of the last Meta and Google Ads sync (time, success, error message). */
  adSync: { type: Schema.Types.Mixed, default: {} },
});

/* 11. counters: running numbers, used for case references (PG-26-0001). */
const CounterSchema = schema({ _id: S, seq: { type: Number, default: 0 } });

/* 12. adinsights: Meta and Google Ads results, one row per campaign per day. Optional: empty until the ad keys are added. */
const AdInsightSchema = schema({
  _id: S,
  platform: { type: S, enum: ["meta", "google"], required: true },
  accountId: { type: S, required: true },
  campaignId: { type: S, required: true },
  campaignName: { type: S, default: "" },
  date: { type: S, required: true, index: true },
  spend: { type: Number, default: 0 },
  currency: { type: S, default: "" },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  syncedAt: S,
});

/* 13. logins: the daily sign-in record. One row per person per Riyadh day ("<userId>:<YYYY-MM-DD>"). */
const LoginSchema = schema({
  _id: S,
  userId: { type: S, required: true },
  day: { type: S, required: true, index: true },
  firstAt: optStr,
  lastSignInAt: optStr,
  lastActiveAt: optStr,
  signedOutAt: optStr,
  signIns: optNum,
  activeMinutes: optNum,
  failed: optNum,
  lastFailedAt: optStr,
  device: optStr,
});
LoginSchema.index({ userId: 1, day: -1 });

export const UserModel = model("User", UserSchema, "users");
export const ClientModel = model("Client", ClientSchema, "clients");
export const CaseModel = model("Case", CaseSchema, "cases");
export const DocumentModel = model("Document", DocumentSchema, "documents");
export const UploadLinkModel = model("UploadLink", UploadLinkSchema, "uploadlinks");
export const MessageModel = model("Message", MessageSchema, "messages");
export const TodoModel = model("Todo", TodoSchema, "todos");
export const TaskModel = model("Task", TaskSchema, "partnertasks");
export const AgentModel = model("Agent", AgentSchema, "agents");
export const SettingsModel = model("Settings", SettingsSchema, "settings");
export const CounterModel = model("Counter", CounterSchema, "counters");
export const AdInsightModel = model("AdInsight", AdInsightSchema, "adinsights");
export const LoginModel = model("Login", LoginSchema, "logins");

export const ALL_MODELS = [UserModel, ClientModel, CaseModel, DocumentModel, UploadLinkModel, MessageModel, TodoModel, TaskModel, AgentModel, SettingsModel, CounterModel, AdInsightModel, LoginModel];
