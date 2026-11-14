/**
 * UI-side mirror of the server rules. The UI uses these to hide or label
 * things. The real enforcement lives in the API layer (Phase 2), and the
 * UI is never treated as the security boundary.
 */
import { STAGE_OWNER, STATUS_LABEL, type Case, type Message, type Role, type TeamId, type UploadLink, type User } from "./demo-data";

export const isAdmin = (u: User) => u.role === "admin";

/** True while a case waits in a pool for someone on the next team to accept it. */
export const isPooled = (c: Case) => !!c.route;

/** A team member can accept a pooled case when it is addressed to their team and their visa team (or to everyone on the team). */
export function canClaim(u: User, c: Case): boolean {
  if (!c.route || u.role !== "consultant" || u.inactive) return false;
  if (u.workTeam !== c.route.to) return false;
  if (c.route.kind === "visa") return u.teams.includes((c.route.visa ?? c.visa) as TeamId);
  return true;
}

/**
 * Admin and Manager see everything. A team member sees only the part of the process their team owns:
 * the leads they created while they own them, pooled cases addressed to them, and cases they accepted.
 * After a handoff the previous team no longer sees the case, except that the sender can still see it until someone accepts it.
 */
export function canSeeCase(u: User, c: Case): boolean {
  if (c.pastWork) return false;
  if (u.role !== "consultant") return true;
  const owner = STAGE_OWNER[c.stage];
  if (c.route) return canClaim(u, c) || (c.route.by === u.name && (c.leadById === u.id || c.salesId === u.id));
  if (owner === "social") return u.workTeam === "social" && c.leadById === u.id;
  if (owner === "sales") return u.workTeam === "sales" && c.salesId === u.id;
  return u.workTeam === "case" && c.caseManagerId === u.id;
}
export const visibleCases = (u: User, cases: Case[]) => cases.filter((c) => canSeeCase(u, c));

/**
 * The cases that count towards a person's own figures: everything for an administrator or manager;
 * for a team member, every case they created, accepted or handled, including ones already passed on.
 */
export const myWork = (u: User, cases: Case[]) =>
  u.role !== "consultant" ? cases : cases.filter((c) => c.leadById === u.id || c.salesId === u.id || c.caseManagerId === u.id);

/** Cases a team member can accept right now. */
export const claimable = (u: User, cases: Case[]) => cases.filter((c) => c.status === "active" && canClaim(u, c));

export const canSeeOutcome = (u: User) => u.role !== "consultant";
/** The case manager who owns a case logs the result. Admin and Manager can too. */
export const canLogOutcome = (u: User, c?: Case) => u.role !== "consultant" || (u.workTeam === "case" && (!c || c.consultantId === u.id));
/** Whether this person may see how a case ended. Sales and Social do not. */
export const canSeeOutcomeOf = (u: User, c: Case) => u.role !== "consultant" || (u.workTeam === "case" && c.caseManagerId === u.id);
export const canApproveQc = (u: User) => u.role !== "consultant";
export const canSeeCommission = isAdmin;
export const canAddCases = (u: User) => isAdmin(u) || !!u.canAdd || u.workTeam === "social";
/** Only the person responsible at the current stage (or an administrator) can work on a case. */
export const canEditCase = (u: User, c: Case) => isAdmin(u) || (u.role === "consultant" && !c.route && c.consultantId === u.id);
export const canMoveStage = canEditCase;
export const canReassign = isAdmin;
export const canReactivate = isAdmin;
export const canViewReports = (u: User) => u.role !== "consultant";
export const canUseAdmin = isAdmin;
export const hasRole = (u: User, roles: Role[]) => roles.includes(u.role);

/** Team members who cannot see outcomes see a restricted label for closed cases. */
/** On hold because the client asked to pause. Older holds count when their open problem is "waiting on the client". */
export const heldByClient = (c: Case) =>
  c.status === "on_hold" && (c.holdBy ? c.holdBy === "client" : c.issues.some((i) => !i.resolvedAt && i.kind === "client"));

export function displayStatus(u: User, c: Case): { label: string; restricted: boolean } {
  if (!canSeeOutcomeOf(u, c) && (c.status === "approved" || c.status === "refused")) {
    return { label: "Closed (result restricted)", restricted: true };
  }
  if (heldByClient(c)) return { label: "On hold by client", restricted: false };
  return { label: STATUS_LABEL[c.status], restricted: false };
}

/** To-do rules: admin manages everyone's list, everyone else manages only their own. */
export const canManageTodo = (u: User, ownerId: string) => isAdmin(u) || ownerId === u.id;

/* ─── Team Notepad (messages) ───────────────────────────── */
/**
 * The administrator can write to anyone: everyone, a team, a visa department or chosen people.
 * Everyone else can only write to the administrator, never to each other.
 */
export function canSendMessage(u: User, m: Pick<Message, "toAll" | "toUserIds" | "toTeams" | "toDepartments">, users: User[]): boolean {
  if (isAdmin(u)) return m.toAll || m.toUserIds.length + m.toTeams.length + m.toDepartments.length > 0;
  if (m.toAll || m.toTeams.length || m.toDepartments.length || m.toUserIds.length === 0) return false;
  return m.toUserIds.every((id) => users.find((x) => x.id === id)?.role === "admin");
}

/** The administrator sees every message. Others see what they sent and what was addressed to them. */
export function canSeeMessage(u: User, m: Message): boolean {
  if (isAdmin(u) || m.fromId === u.id || m.toAll || m.toUserIds.includes(u.id)) return true;
  if (u.workTeam && m.toTeams.includes(u.workTeam)) return true;
  return u.role === "consultant" && m.toDepartments.some((t) => u.teams.includes(t));
}
export const visibleMessages = (u: User, list: Message[]) => list.filter((m) => canSeeMessage(u, m));
export const canPinMessage = isAdmin;
export const canDeleteMessage = isAdmin;

/* ─── Client upload links ───────────────────────────────── */
export type LinkState = "active" | "expired" | "terminated";
export function linkState(l: UploadLink, nowMs: number): LinkState {
  if (l.terminatedAt) return "terminated";
  return Date.parse(l.expiresAt) <= nowMs ? "expired" : "active";
}
/** The person holding the case (or an administrator) can send a client an upload link. */
export const canCreateUploadLink = (u: User, c: Case) => canEditCase(u, c) && c.status !== "approved";
/** The link's creator, the person holding the case, or an administrator can end a link early. */
export const canTerminateUploadLink = (u: User, l: UploadLink, c: Case | undefined) => isAdmin(u) || l.createdById === u.id || (!!c && canEditCase(u, c));
