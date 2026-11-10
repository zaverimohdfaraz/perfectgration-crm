/**
 * Checks the business rules and the database shapes without needing a database:
 *
 *   npm test
 *
 * 1. A full case journey through the shared rule functions (the same ones the API runs).
 * 2. Who may see and do what (cases, messages, upload links, to-dos).
 * 3. Every sample record survives a round trip through its MongoDB schema unchanged.
 * 4. The API input checks accept what the app sends and refuse bad input.
 */
import assert from "node:assert/strict";
import * as L from "../lib/case-logic";
import { CASES, DOCS, CLIENTS, MESSAGES, TODOS, TASKS, AGENTS, UPLOAD_LINKS, USERS, DEFAULT_SLA_DAYS, type Case, type User } from "../lib/demo-data";
import { inPeriod } from "../lib/analytics";
import { commissionFor, commissionState } from "../lib/agents";
import { waitingLabel } from "../lib/demo-data";
import { displayStatus, canSeeCase, canSendMessage, canSeeMessage, linkState, myWork, canManageTodo, canTerminateUploadLink, canCreateUploadLink, visibleCases } from "../lib/permissions";
import { AgentModel, CaseModel, ClientModel, DocumentModel, MessageModel, TaskModel, TodoModel, UploadLinkModel, UserModel } from "../lib/server/models";
import * as Z from "../lib/server/schemas";
import * as L_share from "../lib/lead-share";
import { byCampaign, demoAds, metaLeads } from "../lib/ads";
import * as LG from "../lib/logins";
import { safeCell } from "../lib/csv";
import { ID_PATTERN } from "../lib/ids";
import { LoginModel } from "../lib/server/models";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try { fn(); passed++; } catch (e) { failures.push(`✗ ${name}\n    ${(e as Error).message.split("\n").slice(0, 6).join("\n    ")}`); }
}

const U = (id: string) => USERS.find((u) => u.id === id)!;
let clock = Date.parse("2026-11-01T09:00:00Z");
const ctx = (user: User): L.Ctx => ({ user, users: USERS, sla: DEFAULT_SLA_DAYS, handlers: {}, at: new Date((clock += 60_000)).toISOString() });
function ok<T>(r: T | L.Fail): T {
  if (L.isFail(r)) throw new Error(`Expected success, got: ${r.error}`);
  return r;
}
const err = (r: unknown) => { assert.ok(L.isFail(r), "Expected the rules to refuse this"); };

const reem = U("u-reem"), omar = U("u-omar"), noura = U("u-noura"), sultan = U("u-sultan"), dina = U("u-dina"), admin = U("u-admin"), manager = U("u-manager");

/* ─── 1. Full journey ─── */
let c: Case;
test("Social creates a lead and passes it to the whole Sales team", () => {
  c = ok(L.createCase(ctx(reem), { id: "t1", ref: "PG-26-9001", clientId: "c1", visa: "study", leadSource: "Instagram", campaign: "Canada Oct", priority: "normal", destination: "Canada", pass: { kind: "team" } }));
  assert.equal(c.stage, "firstcall");
  assert.equal(c.route?.to, "sales");
  assert.equal(c.campaign, "Canada Oct");
  assert.ok(canSeeCase(reem, c), "sender still sees it until someone accepts");
});
test("A Sales member cannot claim for another team; Case Manager cannot claim it", () => { err(L.claimCase(c, ctx(sultan))); });
test("First Sales member to accept gets it; the second is refused", () => {
  c = ok(L.claimCase(c, ctx(omar)));
  assert.equal(c.salesId, omar.id);
  assert.equal(c.consultantId, omar.id);
  err(L.claimCase(c, ctx(noura)));
  assert.ok(!canSeeCase(reem, c), "Social no longer sees it after it is accepted");
  assert.ok(!canSeeCase(noura, c), "Other Sales members do not see it");
});
test("Only the holder can move it", () => { err(L.moveStage(c, ctx(noura), {})); });
test("Sales moves through its steps", () => {
  for (const want of ["docassess", "appointment", "deal", "advance"]) {
    c = ok(L.moveStage(c, ctx(omar), want === "appointment" ? { appointmentAt: "2026-11-03T10:00:00Z" } : want === "advance" ? { dealFee: 12000 } : {}));
    assert.equal(c.stage, want);
  }
  assert.equal(c.dealFeeSar, 12000);
});
test("Sales cannot pass to Case Manager without recording fees", () => { err(L.passCase(c, ctx(omar), { kind: "team" })); });
test("Problems: record and resolve", () => {
  c = ok(L.addIssue(c, ctx(omar), "client", "Waiting for salary certificate", "is1"));
  assert.equal(L.openIssues(c).length, 1);
  err(L.addIssue(c, ctx(noura), "client", "x", "is2"));
  c = ok(L.resolveIssue(c, ctx(omar), "is1", "Received"));
  assert.equal(L.openIssues(c).length, 0);
  err(L.resolveIssue(c, ctx(omar), "is1"));
});
test("Sales passes to the Case Manager team with fees", () => {
  c = ok(L.passCase(c, ctx(omar), { kind: "team" }, "Paid in full", { fees: 5000 }));
  assert.equal(c.stage, "doccollect");
  assert.equal(c.feesCollectedSar, 5000);
  assert.equal(c.route?.to, "case");
  c = ok(L.claimCase(c, ctx(sultan)));
  assert.ok(!canSeeCase(omar, c), "Sales gets no further details");
});
test("Sales keeps a reduced copy for its own figures, with nothing after the handoff", () => {
  const past = L.pastWorkCopy(c, omar)!;
  assert.ok(past.pastWork);
  assert.equal(past.stage, "doccollect");
  assert.ok(past.history.every((h) => h.kind !== "claim" || h.actor !== sultan.name), "no Case Manager history");
  assert.equal(past.feesCollectedSar, 5000);
  assert.equal(past.notes.length, 0);
  assert.ok(!canSeeCase(omar, past), "the copy can never be opened");
  assert.ok(myWork(omar, [past]).length === 1);
  assert.ok(visibleCases(omar, [past]).length === 0);
  const social = L.pastWorkCopy(c, reem)!;
  assert.equal(social.stage, "firstcall");
  assert.equal(social.salesId, "", "Social does not learn who in Sales took it");
  assert.equal(social.feesCollectedSar, undefined);
  assert.equal(L.pastWorkCopy(c, noura), null);
  assert.equal(L.pastWorkCopy(c, sultan), null);
});
test("Case Manager steps, review sign-off and submission", () => {
  c = ok(L.moveStage(c, ctx(sultan), {}));
  c = ok(L.moveStage(c, ctx(sultan), {}));
  assert.equal(c.stage, "prep");
  assert.ok(c.docsVerified);
  c = ok(L.moveStage(c, ctx(sultan), {}));
  assert.equal(c.stage, "review");
  err(L.moveStage(c, ctx(sultan), {}));
  err(L.approveQc(c, ctx(sultan)));
  c = ok(L.approveQc(c, ctx(manager)));
  c = ok(L.moveStage(c, ctx(sultan), { submissionStatus: "received", submittedAt: "2026-11-01T08:00:00Z" }));
  assert.equal(c.stage, "submitted");
  assert.equal(c.submittedAt, "2026-11-01T08:00:00Z");
  c = ok(L.addSubmissionUpdate(c, ctx(sultan), "biometrics", "Booked"));
  assert.equal(c.submissionLog?.length, 2);
});
test("Hold, reactivate (admin only)", () => {
  const held = ok(L.endCase(c, ctx(sultan), "on_hold", "Embassy closed for holiday", "authority"));
  assert.equal(held.status, "on_hold");
  assert.equal(L.openIssues(held)[0].kind, "authority");
  err(L.reactivate(held, ctx(sultan)));
  const back = ok(L.reactivate(held, ctx(admin)));
  assert.equal(back.status, "active");
  assert.equal(L.openIssues(back).length, 0);
});
test("On hold by client is recorded and shown; reactivating clears it", () => {
  const held = ok(L.endCase(c, ctx(sultan), "on_hold", "Client travelling until next month", "client"));
  assert.equal(held.holdBy, "client");
  assert.equal(displayStatus(admin, held).label, "On hold by client");
  const ours = ok(L.endCase(c, ctx(sultan), "on_hold", "Bank letter pending", "third_party"));
  assert.equal(ours.holdBy, "team");
  assert.equal(displayStatus(admin, ours).label, "On hold");
  assert.equal(ok(L.reactivate(held, ctx(admin))).holdBy, undefined);
});
test("Date filter: a case counts in a period only if something happened in it", () => {
  const r = (from: string, to: string) => ({ key: "custom" as const, from: Date.parse(from), to: Date.parse(to), label: "" });
  const last = c.history[c.history.length - 1].at;
  assert.ok(inPeriod(c, r(last, new Date(Date.parse(last) + 1000).toISOString())));
  assert.ok(!inPeriod({ ...c, deadline: null, appointmentAt: undefined, submittedAt: undefined }, r("2020-01-01T00:00:00Z", "2020-02-01T00:00:00Z")));
});
test("Waiting labels say which team", () => {
  assert.equal(waitingLabel({ visa: "study", route: { to: "sales", kind: "team" } }), "Waiting to be accepted in Sales");
  assert.equal(waitingLabel({ visa: "work", route: { to: "case", kind: "visa", visa: "work" } }), "Waiting to be accepted in Case Manager · Work team");
});
test("Denied with re-application creates a new lead; commission only from admin", () => {
  err(L.logOutcome(c, ctx(dina), { result: "approved" }));
  const r = ok(L.logOutcome(c, ctx(sultan), { result: "refused", followUp: "reapply", newId: "t2", newRef: "PG-26-9002", commission: 999 }));
  assert.equal(r.updated.status, "refused");
  assert.equal(r.created?.stage, "lead");
  assert.equal(r.created?.consultantId, reem.id);
  assert.equal(r.updated.commissionSar ?? null, null, "only an administrator sets commission");
  const a = ok(L.logOutcome(c, ctx(admin), { result: "approved", commission: 1500 }));
  assert.equal(a.updated.commissionSar, 1500);
});
test("Agents: link a case, record commission, mark paid (administrator only)", () => {
  const ag = AGENTS[0];
  err(L.linkAgent(c, ctx(manager), ag.id));
  let x = ok(L.linkAgent({ ...c, agentId: undefined }, ctx(admin), ag.id, ag.name));
  assert.equal(x.agentId, ag.id);
  err(L.setAgentCommission(x, ctx(sultan), 500));
  x = ok(L.setAgentCommission(x, ctx(admin), 750));
  assert.equal(commissionFor(ag, x), 750);
  x = ok(L.setAgentPaid(x, ctx(admin), true));
  assert.equal(commissionState(x), "paid");
  err(L.setAgentCommission(x, ctx(admin), 900));
  x = ok(L.setAgentPaid(x, ctx(admin), false));
  x = ok(L.setAgentCommission(x, ctx(admin), null));
  assert.equal(x.commissionSar, null);
  assert.equal(commissionFor({ ...ag, commissionType: "percent", amount: 10 }, { ...x, dealFeeSar: 12000 }), 1200);
  const un = ok(L.linkAgent(x, ctx(admin), null));
  assert.equal(un.agentId, undefined);
  err(L.setAgentCommission(un, ctx(admin), 100));
});
test("Admin can reassign at any time; others cannot", () => {
  err(L.assignCase(c, ctx(manager), "case", dina.id));
  const r = ok(L.assignCase(c, ctx(admin), "case", dina.id));
  assert.equal(r.consultantId, dina.id);
  err(L.assignCase(c, ctx(admin), "case", omar.id));
});
test("Passing to a visa team only lets members of that visa team accept", () => {
  let v = ok(L.createCase(ctx(reem), { id: "t3", ref: "PG-26-9003", clientId: "c2", visa: "work", leadSource: "Facebook", priority: "high", destination: "Canada", pass: { kind: "visa", visa: "work" } }));
  const members = USERS.filter((u) => u.workTeam === "sales" && !u.inactive);
  for (const m of members) {
    const can = m.teams.includes("work");
    const r = L.claimCase(v, ctx(m));
    assert.equal(!L.isFail(r), can, `${m.name} ${can ? "should" : "should not"} be able to accept`);
  }
  v = ok(L.createCase(ctx(reem), { id: "t4", ref: "PG-26-9004", clientId: "c2", visa: "work", leadSource: "Facebook", priority: "high", destination: "Canada", pass: { kind: "person", userId: noura.id } }));
  assert.equal(v.consultantId, noura.id);
  assert.equal(v.route, undefined);
});

/* ─── 2. Permissions ─── */
const msg = (to: Partial<{ toAll: boolean; toUserIds: string[]; toTeams: ("social" | "sales" | "case")[]; toDepartments: ("study" | "work")[] }>) => ({ toAll: false, toUserIds: [], toTeams: [], toDepartments: [], ...to });
test("Team Notepad: only the admin can message others; members only message the admin", () => {
  assert.ok(canSendMessage(admin, msg({ toAll: true }), USERS));
  assert.ok(canSendMessage(admin, msg({ toTeams: ["sales"] }), USERS));
  assert.ok(canSendMessage(admin, msg({ toDepartments: ["study"] }), USERS));
  assert.ok(canSendMessage(admin, msg({ toUserIds: [omar.id] }), USERS));
  assert.ok(!canSendMessage(admin, msg({}), USERS), "admin must choose someone");
  assert.ok(canSendMessage(omar, msg({ toUserIds: [admin.id] }), USERS));
  assert.ok(!canSendMessage(omar, msg({ toUserIds: [noura.id] }), USERS), "member to member is refused");
  assert.ok(!canSendMessage(omar, msg({ toUserIds: [admin.id, noura.id] }), USERS));
  assert.ok(!canSendMessage(omar, msg({ toUserIds: [manager.id] }), USERS), "a manager is not the administrator");
  assert.ok(!canSendMessage(omar, msg({ toAll: true }), USERS));
  assert.ok(!canSendMessage(manager, msg({ toTeams: ["sales"] }), USERS));
});
test("Team Notepad: people see only what is addressed to them", () => {
  const base = { id: "x", fromId: admin.id, subject: "s", body: "b", at: "2026-11-01T00:00:00Z", pinned: false, readBy: [] };
  assert.ok(canSeeMessage(omar, { ...base, ...msg({ toTeams: ["sales"] }) }));
  assert.ok(!canSeeMessage(reem, { ...base, ...msg({ toTeams: ["sales"] }) }));
  assert.ok(canSeeMessage(omar, { ...base, ...msg({ toDepartments: [omar.teams[0] as "study"] }) }));
  const fromOmar = { ...base, fromId: omar.id, ...msg({ toUserIds: [admin.id] }) };
  assert.ok(canSeeMessage(admin, fromOmar));
  assert.ok(canSeeMessage(omar, fromOmar));
  assert.ok(!canSeeMessage(noura, fromOmar));
});
test("Upload links: state, who can create and end them", () => {
  const l = UPLOAD_LINKS[0];
  assert.equal(linkState(l, Date.parse(l.expiresAt) - 1), "active");
  assert.equal(linkState(l, Date.parse(l.expiresAt)), "expired");
  assert.equal(linkState({ ...l, terminatedAt: "2026-10-20T00:00:00Z" }, 0), "terminated");
  const cs = CASES.find((x) => x.id === l.caseId)!;
  const holder = USERS.find((u) => u.id === cs.consultantId)!;
  assert.ok(canCreateUploadLink(holder, cs));
  assert.ok(canCreateUploadLink(admin, cs));
  assert.ok(!canCreateUploadLink(omar, cs));
  assert.ok(canTerminateUploadLink(admin, l, cs));
  assert.ok(!canTerminateUploadLink(omar, l, cs));
});
test("To-do lists: admin manages everyone's, others only their own", () => {
  assert.ok(canManageTodo(admin, omar.id));
  assert.ok(canManageTodo(omar, omar.id));
  assert.ok(!canManageTodo(omar, noura.id));
  assert.ok(!canManageTodo(manager, omar.id));
});

/* ─── 2b. Automatic lead sharing ─── */
{
  const at = (i: number) => new Date(Date.parse("2026-11-01T06:00:00Z") + i * 60_000).toISOString();
  const sales = (n: number): User[] => Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, name: `Sales ${i + 1}`, email: `s${i + 1}@x.com`, role: "consultant", workTeam: "sales", teams: i === 5 ? ["work"] : ["study", "work"], title: "", lastSeen: at(0) }));
  const pooled = (i: number, kind: "team" | "visa" | "person" = "team", visa: "study" | "work" = "study"): Case => ({
    ...CASES[0], id: `L${i}`, ref: `PG-26-${1000 + i}`, visa, stage: "firstcall", status: "active", consultantId: "", salesId: "", caseManagerId: "", issues: [], notes: [], history: [],
    route: { to: "sales", kind, visa: kind === "visa" ? visa : undefined, userId: kind === "person" ? "s1" : undefined, by: "Reem", at: at(i) }, stageSince: at(i), updatedAt: at(i),
  });
  const apply = (cases: Case[], users: User[], online: string[]) => {
    const moves = L_share.planShare(cases, users, new Set(online));
    return { moves, cases: cases.map((c) => { const m = moves.find((x) => x.caseId === c.id); return m ? L.shareCase(c, users.find((u) => u.id === m.toUserId)!, at(500), m.fromUserId ?? undefined) : c; }) };
  };
  const counts = (cases: Case[], users: User[]) => users.map((u) => cases.filter((c) => !c.route && c.consultantId === u.id).length);
  const people = sales(6);

  test("40 leads, 4 Sales members online: 10 each", () => {
    let cs = Array.from({ length: 40 }, (_, i) => pooled(i));
    cs = apply(cs, people, ["s1", "s2", "s3", "s4"]).cases;
    assert.deepEqual(counts(cs, people.slice(0, 4)), [10, 10, 10, 10]);
    assert.ok(cs.every((c) => !c.route && c.autoShared?.kind === "team"));
    (globalThis as Record<string, unknown>).__cs = cs;
  });
  test("A 5th member comes online: leads move from the others, 8 each", () => {
    const before = (globalThis as Record<string, unknown>).__cs as Case[];
    const r = apply(before, people, ["s1", "s2", "s3", "s4", "s5"]);
    assert.deepEqual(counts(r.cases, people.slice(0, 5)), [8, 8, 8, 8, 8]);
    assert.equal(r.moves.length, 8, "only the 8 needed leads move");
    assert.ok(r.moves.every((m) => m.toUserId === "s5"));
    (globalThis as Record<string, unknown>).__cs = r.cases;
  });
  test("A 6th member (work visa only) comes online: still as even as possible", () => {
    const before = (globalThis as Record<string, unknown>).__cs as Case[];
    const withWork = before.map((c, i) => (i % 2 ? { ...c, visa: "work" as const } : c));
    const r = apply(withWork, people, ["s1", "s2", "s3", "s4", "s5", "s6"]);
    const n = counts(r.cases, people);
    assert.ok(Math.max(...n) - Math.min(...n) <= 1, `counts ${n}`);
    assert.equal(n.reduce((a, b) => a + b, 0), 40);
  });
  test("A lead the holder has worked on never moves", () => {
    let cs = Array.from({ length: 4 }, (_, i) => pooled(i));
    cs = apply(cs, people, ["s1"]).cases;
    const holder = people[0];
    const x: L.Ctx = { user: holder, users: people, sla: DEFAULT_SLA_DAYS, handlers: {}, at: at(600) };
    cs[0] = ok(L.addNote(cs[0], x, "Called, no answer"));
    cs[1] = ok(L.keepLead(cs[1], x));
    assert.equal(cs[0].autoShared, undefined);
    const r = apply(cs, people, ["s1", "s2"]);
    assert.ok(r.moves.every((m) => m.caseId !== cs[0].id && m.caseId !== cs[1].id));
    assert.deepEqual(counts(r.cases, people.slice(0, 2)), [2, 2]);
  });
  test("Leads of someone who went offline go to people still online; with nobody online leads wait", () => {
    let cs = Array.from({ length: 6 }, (_, i) => pooled(i));
    assert.equal(L_share.planShare(cs, people, new Set()).length, 0);
    cs = apply(cs, people, ["s1", "s2"]).cases;
    const r = apply(cs, people, ["s2", "s3"]);
    assert.deepEqual(counts(r.cases, [people[1], people[2]]), [3, 3]);
    assert.equal(counts(r.cases, [people[0]])[0], 0);
  });
  test("Visa-team leads go only to that visa team; named-person leads are never shared", () => {
    const cs = [pooled(1, "visa", "study"), pooled(2, "visa", "study"), pooled(3, "person")];
    const r = apply(cs, people, ["s6"]); // s6 is on the work visa team only
    assert.equal(r.moves.length, 0);
    const r2 = apply(cs, people, ["s1", "s6"]);
    assert.deepEqual(r2.moves.map((m) => m.toUserId), ["s1", "s1"]);
  });
  test("Inactive or non-Sales people never receive leads", () => {
    const odd: User[] = [{ ...people[0], inactive: true }, { ...people[1], workTeam: "case" }];
    assert.equal(L_share.planShare([pooled(1)], odd, new Set(["s1", "s2"])).length, 0);
  });
  test("Admin assignment ends automatic sharing for that lead", () => {
    const shared = L.shareCase(pooled(1), people[0], at(1));
    const r = ok(L.assignCase(shared, { user: admin, users: [...USERS, ...people], sla: DEFAULT_SLA_DAYS, handlers: {}, at: at(2) }, "sales", omar.id));
    assert.equal(r.autoShared, undefined);
  });
}

/* ─── 2c. Ad results ─── */
test("Meta lead counting and campaign totals", () => {
  assert.equal(metaLeads([{ action_type: "lead", value: "7" }, { action_type: "onsite_conversion.lead_grouped", value: "5" }]), 7);
  assert.equal(metaLeads([{ action_type: "onsite_conversion.lead_grouped", value: "5" }, { action_type: "offsite_conversion.fb_pixel_lead", value: "2" }, { action_type: "link_click", value: "99" }]), 7);
  assert.equal(metaLeads(undefined), 0);
  const demo = demoAds({ key: "custom", from: Date.parse("2026-10-01T00:00:00+03:00"), to: Date.parse("2026-10-08T00:00:00+03:00"), label: "" });
  assert.equal(new Set(demo.rows.map((r) => r.date)).size, 7, "one row per day for 7 days");
  const t = byCampaign(demo.rows);
  assert.equal(t.length, 4);
  assert.ok(t[0].spend >= t[1].spend);
});

/* ─── 3. Database shapes ─── */
const clean = (x: unknown): unknown => JSON.parse(JSON.stringify(x));
function roundTrip(name: string, M: typeof CaseModel, list: { id: string }[], extra: Record<string, unknown> = {}) {
  test(`MongoDB schema keeps every ${name} field`, () => {
    for (const item of list) {
      const { id, ...rest } = item as Record<string, unknown> & { id: string };
      const doc = new M({ _id: id, ...rest, ...extra });
      const v = doc.validateSync();
      if (v) throw new Error(`${name} ${id}: ${v.message}`);
      const { _id, ...back } = doc.toObject() as Record<string, unknown>;
      for (const k of Object.keys(extra)) delete back[k];
      const want = clean(item) as Record<string, unknown>;
      const got = clean({ id: _id, ...back }) as Record<string, unknown>;
      // Defaults the schema adds for empty optional lists or flags are fine; everything the app sent must come back unchanged.
      for (const k of Object.keys(want)) assert.deepEqual(got[k], want[k], `${name} ${id}: field "${k}" changed`);
      const added = Object.keys(got).filter((k) => !(k in want) && !(Array.isArray(got[k]) && (got[k] as unknown[]).length === 0) && got[k] !== null && got[k] !== "");
      assert.deepEqual(added, [], `${name} ${id}: unexpected fields ${added.join(", ")}`);
    }
  });
}
roundTrip("case", CaseModel, [...CASES, c!]);
roundTrip("client", ClientModel as never, CLIENTS);
roundTrip("document", DocumentModel as never, DOCS);
roundTrip("message", MessageModel as never, MESSAGES);
roundTrip("to-do", TodoModel as never, TODOS);
roundTrip("partner task", TaskModel as never, TASKS);
roundTrip("agent", AgentModel as never, AGENTS);
roundTrip("upload link", UploadLinkModel as never, UPLOAD_LINKS);
roundTrip("user", UserModel as never, USERS, { passwordHash: "x", mustChangePassword: false, failedLogins: 0, sessionVersion: 1 });


/* ─── Sign-in record ─── */
test("sign-in record: devices, days and weekends", () => {
  assert.equal(LG.deviceFrom("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"), "Chrome on Windows");
  assert.equal(LG.deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"), "Safari on iPhone");
  assert.equal(LG.deviceFrom("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0"), "Edge on Windows");
  assert.equal(LG.deviceFrom(null), "Unknown device");
  assert.deepEqual(LG.daysBetween("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.equal(LG.isWeekend("2026-10-23"), true, "Friday");
  assert.equal(LG.isWeekend("2026-10-24"), true, "Saturday");
  assert.equal(LG.isWeekend("2026-10-25"), false, "Sunday is a working day");
  assert.equal(LG.workingDays(LG.daysBetween("2026-10-18", "2026-10-24")), 5);
  assert.equal(LG.fmtClock("2026-10-21T05:07:00.000Z"), "08:07", "Riyadh time");
  assert.equal(LG.fmtDay("2026-10-21"), "Wed 21 Oct");
  assert.equal(LG.fmtMinutes(135), "2 h 15 min");
});
test("sign-in record: who was in, and totals per person", () => {
  const rows: LG.LoginDay[] = [
    { userId: "u-omar", day: "2026-10-20", firstAt: "2026-10-20T05:00:00.000Z", signIns: 1, activeMinutes: 300, failed: 0 },
    { userId: "u-omar", day: "2026-10-21", firstAt: "2026-10-21T06:00:00.000Z", signIns: 2, activeMinutes: 100, failed: 1 },
    { userId: "u-noura", day: "2026-10-21", signIns: 0, activeMinutes: 0, failed: 3 },
  ];
  assert.equal(LG.wasIn(rows[2]), false, "wrong passwords only is not signed in");
  const [o, n] = LG.summarise([omar, noura], rows);
  assert.deepEqual([o.days, o.signIns, o.activeMinutes, o.failed, o.avgFirst, o.lastDay], [2, 3, 400, 1, "08:30", "2026-10-21"]);
  assert.deepEqual([n.days, n.failed, n.avgFirst], [0, 3, undefined]);
  const csv = LG.toCsv(USERS, rows).split("\n");
  assert.equal(csv.length, 4);
  assert.ok(csv[1].startsWith("2026-10-21,"), "newest first");
});
test("sign-in record: sample data never shows the future or inactive people", () => {
  const now = Date.parse("2026-10-21T06:00:00.000Z"); // 09:00 Riyadh
  const rows = LG.demoLogins(USERS, "2026-10-01", "2026-10-31", now);
  assert.deepEqual(rows, LG.demoLogins(USERS, "2026-10-01", "2026-10-31", now), "same every time");
  assert.ok(rows.length > 50);
  assert.ok(rows.every((r) => r.day <= "2026-10-21" && (!r.firstAt || Date.parse(r.firstAt) <= now)));
  assert.ok(!rows.some((r) => r.userId === "u-hadi"), "inactive account");
  assert.ok(!rows.some((r) => LG.isWeekend(r.day)));
  const today = rows.filter((r) => r.day === "2026-10-21");
  assert.ok(today.some(LG.wasIn) && today.some((r) => !LG.wasIn(r)));
});
test("sign-in record row fits its MongoDB schema", () => {
  const doc = { _id: LG.loginId("u-omar", "2026-10-21"), userId: "u-omar", day: "2026-10-21", firstAt: "2026-10-21T05:00:00.000Z", lastSignInAt: "2026-10-21T05:00:00.000Z", lastActiveAt: "2026-10-21T09:00:00.000Z", signIns: 1, activeMinutes: 240, failed: 0, device: "Chrome on Windows" };
  const m = new LoginModel(doc);
  assert.equal(m.validateSync(), undefined);
  assert.deepEqual(m.toObject(), doc);
});


/* ─── Injection and spreadsheet safety ─── */
test("ids in web addresses: only the id shape gets through", () => {
  for (const ok of ["cs_3f9a1", "u-faisal", "doc_12AB", "A".repeat(64), "k7Yp0bQx_2mT-9Lz3Vw8Rn1Hs5Ja4Ep6Gd0Cf2Xb9Qm8Zt3Yr7Nk"]) assert.ok(ID_PATTERN.test(ok), ok);
  for (const bad of ["", "a".repeat(65), "x$ne", "u.faisal", "a/b", "a%20b", "{\"$ne\":\"\"}", "a b", "ümm"]) assert.ok(!ID_PATTERN.test(bad), JSON.stringify(bad));
});
test("spreadsheet cells: formulas are shown as text, numbers are untouched", () => {
  assert.equal(safeCell("=HYPERLINK(\"http://x\")"), "'=HYPERLINK(\"http://x\")");
  assert.equal(safeCell("+1+1"), "'+1+1");
  assert.equal(safeCell("-2"), "'-2");
  assert.equal(safeCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(safeCell("\tcmd"), "'\tcmd");
  assert.equal(safeCell("Chrome on Windows"), "Chrome on Windows");
  assert.equal(safeCell(-5), -5);
  assert.equal(safeCell(0), 0);
});
test("sign-in CSV: a crafted device name cannot run as a formula", () => {
  const csv = LG.toCsv(USERS, [{ userId: "u-omar", day: "2026-10-21", firstAt: "2026-10-21T05:00:00.000Z", signIns: 1, activeMinutes: 1, failed: 0, device: "=cmd|' /C calc'!A0" }]);
  assert.ok(csv.split("\n")[1].endsWith(",'=cmd|' /C calc'!A0"), csv);
});

/* ─── 4. API input checks ─── */
test("API accepts what the app sends", () => {
  Z.newCase.parse({ clientId: "c1", visa: "study", leadSource: "Instagram", campaign: "X", priority: "normal", destination: "Canada", budget: 1000, pass: { kind: "team" }, id: "cs_abc123" });
  Z.caseAction.parse({ type: "pass", target: { kind: "visa", visa: "work" }, note: "n", fees: 100 });
  Z.caseAction.parse({ type: "outcome", result: "refused", followUp: "reapply", newId: "cs_x1" });
  Z.caseAction.parse({ type: "edit", patch: { deadline: null, nextAction: "a", waitingFor: "b", priority: "high", leadSource: "Facebook" } });
  Z.newMessage.parse({ id: "m_1a", subject: "Hi", body: "B", toAll: false, toUserIds: ["u-admin"], toTeams: [], toDepartments: [], fromId: "ignored", at: "ignored", pinned: true, readBy: [] });
  Z.newLink.parse({ caseId: "cs1", requested: ["Passport"], expiresAt: "2026-11-05T10:00:00.000Z" });
  Z.newUser.parse({ id: "u_ab", name: "A", email: "A@B.com", role: "consultant", workTeam: "sales", teams: ["study"], title: "", canAdd: false, tempPassword: "Pg-abcdefghj", lastSeen: "x" });
  Z.settingsPut.parse({ sla: { lead: 1 }, handlers: { "study:doccollect": "u-sultan", "eb2niw:prep": "" } });
  for (const t of TODOS) Z.newTodo.parse(t);
  for (const a of AGENTS) Z.newAgent.parse(a);
});
test("API refuses bad input", () => {
  assert.throws(() => Z.caseAction.parse({ type: "drop_database" }));
  assert.throws(() => Z.newCase.parse({ id: "../../etc", clientId: "c1", visa: "study", leadSource: "x", priority: "normal", destination: "" }));
  assert.throws(() => Z.caseEdit.parse({ commissionSar: 5000 }), "commission cannot be edited through case edits");
  assert.throws(() => Z.clientPatch.parse({ $where: "1" }));
  assert.throws(() => Z.todoPatch.parse({ createdBy: "u-admin" }));
  assert.throws(() => Z.newMessage.parse({ id: "m1", subject: "", body: "b", toAll: true, toUserIds: [], toTeams: [], toDepartments: [] }));
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) { console.log(failures.join("\n\n")); process.exit(1); }
