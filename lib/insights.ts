import { STAGES, stageLabel, type Case, type Client, type Task, type Todo, type User } from "./demo-data";
import { daysBetween, deadlineState, deadlineText, fmtDate } from "./dates";
import { canSeeOutcomeOf, visibleCases } from "./permissions";

export type AlertLevel = "critical" | "high" | "medium" | "low";
export type Alert = { id: string; caseId: string; ref: string; client: string; level: AlertLevel; title: string; detail: string };

/** The escalation triggers from the client's process flowchart. Returns null when the case is on time. */
export function escalationFor(c: Case): { level: AlertLevel; title: string; detail: string } | null {
  const days = daysBetween(c.stageSince);
  if (c.route) return days >= 1 ? { level: "critical", title: `Nobody has accepted this ${c.route.to === "sales" ? "lead" : "case"}`, detail: `Waiting ${days} ${days === 1 ? "day" : "days"} since ${c.route.by} passed it` } : null;
  switch (c.stage) {
    case "lead": return days > 1 ? { level: "high", title: "Lead not passed to Sales within 24 hrs", detail: `Social Media Team · ${days} days` } : null;
    case "firstcall": return days >= 3 ? { level: "critical", title: "Stuck in First Call for 3+ days", detail: `Escalate to the manager · ${days} days` } : days > 1 ? { level: "high", title: "No call logged after 24 hrs", detail: "Flagged red" } : null;
    case "docassess": return days > 2 ? { level: "high", title: "Document assessment overdue", detail: "Manager alert" } : null;
    case "appointment": return c.appointmentAt && daysBetween(c.appointmentAt) >= 1 ? { level: "high", title: "Visit done but no deal after 24 hrs", detail: "Follow-up required" } : days > 3 ? { level: "high", title: "No appointment booked after 3 days", detail: "Manager alert" } : null;
    case "deal": return days > 1 ? { level: "high", title: "Deal not finalised after 24 hrs", detail: "Follow-up required" } : null;
    case "advance": return days > 2 ? { level: "high", title: "Fees not collected after 2 days", detail: "Manager alert" } : null;
    case "doccollect": return days > 7 ? { level: "medium", title: "Incomplete documents after 7 days", detail: "Reminder to the client" } : null;
    case "verify": return days > 3 ? { level: "medium", title: "Verification not done after 3 days", detail: "Reminder to the case manager" } : null;
    case "prep": return days > 7 ? { level: "critical", title: "Prep not done in 7 days", detail: "Manager escalation" } : null;
    case "review": return days > 2 ? { level: "critical", title: "Review pending after 2 days", detail: "Urgent flag" } : null;
    case "submitted":
      return c.qcApprovedAt && !c.submittedAt && daysBetween(c.qcApprovedAt) > 2 ? { level: "critical", title: "Not submitted within 2 days of approval", detail: "Urgent flag" } : null;
    case "outcome": return c.status === "refused" && days > 2 ? { level: "high", title: "Review appeal options (48 hrs)", detail: "Denied case needs a decision" } : null;
    default: return null;
  }
}

const nameOf = (clients: Client[], id: string) => clients.find((c) => c.id === id)?.name ?? "Client";

/** Alerts for active cases the user can see, most urgent first. */
export function alertsFor(user: User, cases: Case[], clients: Client[]): Alert[] {
  const out: Alert[] = [];
  for (const c of visibleCases(user, cases)) {
    const client = nameOf(clients, c.clientId);
    const base = { caseId: c.id, ref: c.ref, client };
    if (c.status === "refused" && canSeeOutcomeOf(user, c)) {
      const e = escalationFor(c);
      if (e) out.push({ ...base, id: `${c.id}-esc`, level: e.level, title: `${e.title}: ${client}`, detail: `${e.detail} · ${c.ref}` });
    }
    if (c.status !== "active") continue;
    const esc = escalationFor(c);
    if (esc) out.push({ ...base, id: `${c.id}-esc`, level: esc.level, title: `${esc.title}: ${client}`, detail: `${esc.detail} · ${c.ref}` });
    const dl = deadlineState(c.deadline);
    const days = daysBetween(c.stageSince);

    if (dl === "overdue") out.push({ ...base, id: `${c.id}-deadline`, level: "critical", title: `Overdue: ${client}`, detail: `${deadlineText(c.deadline)} · ${c.ref}` });
    else if (dl === "d1") out.push({ ...base, id: `${c.id}-deadline`, level: "high", title: `Due tomorrow: ${client}`, detail: `${c.ref} · ${fmtDate(c.deadline)}` });
    else if (dl === "d3") out.push({ ...base, id: `${c.id}-deadline`, level: "medium", title: `Due in 3 days: ${client}`, detail: `${c.ref} · ${fmtDate(c.deadline)}` });
    else if (dl === "d7") out.push({ ...base, id: `${c.id}-deadline`, level: "low", title: `Coming up: ${client}`, detail: `${c.ref} · ${fmtDate(c.deadline)}` });

    if (days > 21) out.push({ ...base, id: `${c.id}-stage`, level: "critical", title: `Stuck in stage: ${client}`, detail: `${days} days in ${stageLabel(c.stage)}` });
    else if (days > 10) out.push({ ...base, id: `${c.id}-stage`, level: "medium", title: `Slow in stage: ${client}`, detail: `${days} days in ${stageLabel(c.stage)}` });
  }
  const rank: Record<AlertLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export type Activity = { id: string; at: string; text: string; actor: string; ref: string; caseId: string };

export function recentActivity(user: User, cases: Case[], clients: Client[], limit = 6): Activity[] {
  const items: Activity[] = [];
  for (const c of visibleCases(user, cases)) {
    const client = nameOf(clients, c.clientId);
    c.history.forEach((h, i) =>
      items.push({
        id: `${c.id}-h${i}`,
        at: h.at,
        text: h.kind === "claim" || h.kind === "assign" ? `${client}: ${h.handoff ?? "accepted"}` : h.from && h.from !== h.to ? `${client} moved from ${stageLabel(h.from)} to ${stageLabel(h.to)}` : `${client} was added as a lead`,
        actor: h.actor,
        ref: c.ref,
        caseId: c.id,
      }),
    );
    c.notes.forEach((n, i) => items.push({ id: `${c.id}-n${i}`, at: n.at, text: `Note on ${client}: ${n.text}`, actor: n.author, ref: c.ref, caseId: c.id }));
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function metricsFor(user: User, cases: Case[]) {
  const mine = visibleCases(user, cases);
  const active = mine.filter((c) => c.status === "active");
  return {
    total: mine.length,
    active: active.length,
    urgent: active.filter((c) => daysBetween(c.stageSince) > 21).length,
    overdue: active.filter((c) => deadlineState(c.deadline) === "overdue").length,
    dueWithin3: active.filter((c) => ["d1", "d3"].includes(deadlineState(c.deadline))).length,
    closed: mine.filter((c) => c.status === "approved" || c.status === "refused" || c.status === "withdrawn").length,
    waiting: mine.filter((c) => c.status === "active" && !!c.route).length,
  };
}

export function stageCounts(user: User, cases: Case[]) {
  const mine = visibleCases(user, cases);
  return STAGES.map((s) => ({ ...s, n: mine.filter((c) => c.stage === s.id).length }));
}

export function todosFor(user: User, todos: Todo[]) {
  return todos.filter((t) => user.role === "admin" || t.ownerId === user.id);
}

export function tasksFor(user: User, tasks: Task[]) {
  return tasks.filter((t) => user.role !== "consultant" || t.assigneeId === user.id);
}
