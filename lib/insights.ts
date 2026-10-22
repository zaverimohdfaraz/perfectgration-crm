import { STAGES, stageLabel, type Case, type Client, type Task, type User } from "./demo-data";
import { daysBetween, deadlineState, deadlineText, fmtDate } from "./dates";
import { visibleCases } from "./permissions";

export type AlertLevel = "critical" | "high" | "medium" | "low";
export type Alert = { id: string; caseId: string; ref: string; client: string; level: AlertLevel; title: string; detail: string };

const nameOf = (clients: Client[], id: string) => clients.find((c) => c.id === id)?.name ?? "Client";

/** Alerts for active cases the user can see, most urgent first. */
export function alertsFor(user: User, cases: Case[], clients: Client[]): Alert[] {
  const out: Alert[] = [];
  for (const c of visibleCases(user, cases)) {
    if (c.status !== "active") continue;
    const client = nameOf(clients, c.clientId);
    const base = { caseId: c.id, ref: c.ref, client };
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
        text: h.from ? `${client} moved from ${stageLabel(h.from)} to ${stageLabel(h.to)}` : `${client} was enrolled`,
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
  };
}

export function stageCounts(user: User, cases: Case[]) {
  const mine = visibleCases(user, cases);
  return STAGES.map((s) => ({ ...s, n: mine.filter((c) => c.stage === s.id).length }));
}

export function tasksFor(user: User, tasks: Task[]) {
  return tasks.filter((t) => user.role !== "consultant" || t.assigneeId === user.id);
}
