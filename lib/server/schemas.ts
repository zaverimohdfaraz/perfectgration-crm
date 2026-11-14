/** Input checks for every API route. Anything not listed here is refused or dropped. */
import { z } from "zod";

export const id = z.string().regex(/^[A-Za-z0-9_-]{2,64}$/, "Not a valid id.");
export const iso = z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)), "Not a valid date.");
export const text = (max: number) => z.string().trim().max(max);
export const reqText = (max: number) => z.string().trim().min(1).max(max);
const money = z.number().finite().min(0).max(100_000_000);

export const visa = z.enum(["study", "work", "visit", "skilled", "eb2niw"]);
export const workTeam = z.enum(["social", "sales", "case"]);
export const role = z.enum(["admin", "manager", "consultant"]);
export const priority = z.enum(["normal", "high", "urgent"]);
export const stage = z.enum(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect", "verify", "prep", "review", "submitted", "outcome"]);
export const submissionStatus = z.enum(["received", "docs_requested", "biometrics", "under_review", "returned"]);
export const issueKind = z.enum(["client", "third_party", "authority", "internal", "other"]);

export const passTarget = z.object({ kind: z.enum(["person", "visa", "team"]), visa: visa.optional(), userId: id.optional() });

/* Clients */
export const clientFields = z.object({
  name: reqText(120), phone: text(40), email: z.union([z.literal(""), z.string().trim().email().max(160)]),
  nationality: text(60), country: text(60).optional(), dob: text(20).optional(),
});
export const newClient = clientFields.extend({ id });
export const clientPatch = clientFields.partial().strict();

/* Cases */
export const newCase = z.object({
  id, clientId: id, visa, leadSource: reqText(60), campaign: text(120).optional(), priority, destination: text(80).optional(), subDestination: text(80).optional(),
  budget: money.optional(), agentId: id.optional(), note: text(2000).optional(), pass: passTarget.optional(),
});

export const caseEdit = z.object({
  deadline: iso.nullable().optional(), nextAction: text(300).optional(), waitingFor: text(300).optional(), priority: priority.optional(),
  leadSource: text(60).optional(), agentId: id.optional(), campaign: text(120).optional(), budget: money.optional(), destination: text(80).optional(),
  subDestination: text(80).optional(), visa: z.union([visa, z.literal("")]).optional(),
}).strict();

export const caseAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("edit"), patch: caseEdit }),
  z.object({ type: z.literal("move"), note: text(2000).optional(), appointmentAt: iso.optional(), fees: money.optional(), dealFee: money.optional(), submissionStatus: submissionStatus.optional(), submittedAt: iso.optional() }),
  z.object({ type: z.literal("pass"), target: passTarget, note: text(2000).optional(), fees: money.optional() }),
  z.object({ type: z.literal("claim") }),
  z.object({ type: z.literal("assign"), team: workTeam, userId: id }),
  z.object({ type: z.literal("submission"), status: submissionStatus, note: text(2000).optional() }),
  z.object({ type: z.literal("approveQc") }),
  z.object({ type: z.literal("returnQc"), note: reqText(2000) }),
  z.object({ type: z.literal("end"), status: z.enum(["on_hold", "returned", "withdrawn", "refused"]), reason: reqText(2000), kind: issueKind.optional() }),
  z.object({ type: z.literal("reactivate") }),
  z.object({ type: z.literal("keep") }),
  z.object({ type: z.literal("agent"), agentId: id.nullable() }),
  z.object({ type: z.literal("agentPaid"), paid: z.boolean() }),
  z.object({ type: z.literal("agentCommission"), amount: money.nullable() }),
  z.object({ type: z.literal("note"), text: reqText(4000) }),
  z.object({ type: z.literal("issue"), kind: issueKind, text: reqText(2000), issueId: id }),
  z.object({ type: z.literal("resolveIssue"), issueId: id, resolution: text(2000).optional() }),
  z.object({ type: z.literal("outcome"), result: z.enum(["approved", "refused", "returned", "withdrawn"]), commission: money.optional(), followUp: z.enum(["appeal", "reapply", "none"]).optional(), note: text(2000).optional(), newId: id }),
]);

export const assessment = z.object({
  inputs: z.array(z.object({ label: text(80), value: text(200) })).max(40),
  missing: z.array(text(200)).max(40),
  ruleVersion: text(40), assessedBy: text(120), assessedAt: iso, indicative: text(400).optional(),
});

/* Documents and files */
export const newDoc = z.object({ id, caseId: id, name: reqText(160), note: text(500).optional(), needsTranslation: z.boolean().optional() });
export const docPatch = z.object({ status: z.enum(["pending", "received", "verified"]) }).strict();
export const fileInfo = z.object({ fileName: reqText(200), contentType: text(100), size: z.number().int().positive() });
export const completeUpload = z.object({ key: reqText(300), fileName: reqText(200) });

/* Client upload links */
export const newLink = z.object({ caseId: id, requested: z.array(reqText(160)).max(30), message: text(1000).optional(), expiresAt: iso });
export const linkPatch = z.object({ terminate: z.literal(true) });
export const publicPresign = fileInfo.extend({ item: text(160).optional() });
export const publicComplete = z.object({ ticket: reqText(2000) });

/* To-dos and partner tasks */
export const newTodo = z.object({ id, title: reqText(200), notes: text(2000).optional(), due: iso.nullable(), priority, ownerId: id, caseId: id.optional() });
export const todoPatch = z.object({ title: reqText(200).optional(), notes: text(2000).optional(), due: iso.nullable().optional(), priority: priority.optional(), done: z.boolean().optional(), ownerId: id.optional(), caseId: id.optional() }).strict();
export const newTask = z.object({ id, title: reqText(200), caseId: id, partner: text(120), assigneeId: id, deadline: iso });
export const taskPatch = z.object({ progress: z.number().int().min(0).max(100) }).strict();

/* Team Notepad */
export const newMessage = z.object({
  id, subject: reqText(160), body: reqText(5000), toAll: z.boolean(), toUserIds: z.array(id).max(200), toTeams: z.array(workTeam).max(3),
  toDepartments: z.array(visa).max(5), replyToId: id.optional(),
});
export const messagePatch = z.object({ read: z.literal(true).optional(), pinned: z.boolean().optional() }).strict();

/* People, agents, settings */
export const newUser = z.object({
  id, name: reqText(120), email: z.string().trim().toLowerCase().email().max(160), role, workTeam: workTeam.optional(), teams: z.array(visa).max(5),
  title: text(80), canAdd: z.boolean().optional(), tempPassword: z.string().min(10).max(128),
});
export const userPatch = z.object({
  name: reqText(120).optional(), email: z.string().trim().toLowerCase().email().max(160).optional(), role: role.optional(), workTeam: workTeam.nullable().optional(),
  teams: z.array(visa).max(5).optional(), title: text(80).optional(), canAdd: z.boolean().optional(), inactive: z.boolean().optional(),
  tempPassword: z.string().min(10).max(128).optional(),
});
export const agentFields = z.object({
  name: reqText(120), city: text(80), phone: text(40), email: z.union([z.literal(""), z.string().trim().email().max(160)]),
  commissionType: z.enum(["flat", "percent"]), amount: z.number().finite().min(0).max(10_000_000), notes: text(2000), paid: z.boolean().optional(),
});
export const newAgent = agentFields.extend({ id });
export const agentPatch = agentFields.partial();

export const template = z.object({ id, name: reqText(120), channel: z.enum(["WhatsApp", "Email"]), stage, body: reqText(4000) });
export const company = z.object({
  tradingName: text(120), legalName: text(160), email: z.union([z.literal(""), z.string().trim().email().max(160)]), phone: text(40), city: text(80), country: text(80),
  language: text(40), currency: text(10), dateFormat: text(40), timezone: text(60), workweek: text(60), emailConnected: z.boolean(),
  autoShareLeads: z.boolean(), onlineMinutes: z.number().int().min(2).max(240),
}).partial();
export const settingsPut = z.object({
  sla: z.partialRecord(stage, z.number().int().min(0).max(365)).optional(),
  handlers: z.record(z.string().regex(/^[a-z0-9]+:[a-z]+$/), z.string().max(64)).optional(),
  templates: z.array(template).max(100).optional(),
  company: company.optional(),
});
