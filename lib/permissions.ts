/**
 * UI-side mirror of the server rules. The UI uses these to hide or label
 * things. The real enforcement lives in the API layer (Phase 2), and the
 * UI is never treated as the security boundary.
 */
import { STAGE_OWNER, STATUS_LABEL, type Case, type Role, type TeamNote, type User } from "./demo-data";

export const isAdmin = (u: User) => u.role === "admin";

/** True while a case waits in a pool for someone on the next team to accept it. */
export const isPooled = (c: Case) => !!c.route;

/** A team member can accept a pooled case when it is addressed to their team and their visa team (or to everyone on the team). */
export function canClaim(u: User, c: Case): boolean {
  if (!c.route || u.role !== "consultant" || u.inactive) return false;
  if (u.workTeam !== c.route.to) return false;
  if (c.route.kind === "visa") return u.teams.includes(c.route.visa ?? c.visa);
  return true;
}

/**
 * Admin and Manager see everything. A team member sees only the part of the process their team owns:
 * the leads they created while they own them, pooled cases addressed to them, and cases they accepted.
 * After a handoff the previous team no longer sees the case, except that the sender can still see it until someone accepts it.
 */
export function canSeeCase(u: User, c: Case): boolean {
  if (u.role !== "consultant") return true;
  const owner = STAGE_OWNER[c.stage];
  if (c.route) return canClaim(u, c) || (c.route.by === u.name && (c.leadById === u.id || c.salesId === u.id));
  if (owner === "social") return u.workTeam === "social" && c.leadById === u.id;
  if (owner === "sales") return u.workTeam === "sales" && c.salesId === u.id;
  return u.workTeam === "case" && c.caseManagerId === u.id;
}
export const visibleCases = (u: User, cases: Case[]) => cases.filter((c) => canSeeCase(u, c));

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
export function displayStatus(u: User, c: Case): { label: string; restricted: boolean } {
  if (!canSeeOutcomeOf(u, c) && (c.status === "approved" || c.status === "refused")) {
    return { label: "Closed (result restricted)", restricted: true };
  }
  return { label: STATUS_LABEL[c.status], restricted: false };
}

/** To-do rules: admin manages everyone's list, everyone else manages only their own. */
export const canManageTodo = (u: User, ownerId: string) => isAdmin(u) || ownerId === u.id;

/**
 * A note is visible to: its author, administrators and managers, everyone when no audience is set,
 * people named on it, and members of the departments it is addressed to.
 */
export function canSeeNote(u: User, n: TeamNote): boolean {
  if (u.role !== "consultant") return true;
  if (n.author === u.name) return true;
  if (n.departments.length === 0 && n.people.length === 0) return true;
  return n.people.includes(u.id) || n.departments.some((t) => u.teams.includes(t));
}
export const visibleNotes = (u: User, notes: TeamNote[]) => notes.filter((n) => canSeeNote(u, n));
