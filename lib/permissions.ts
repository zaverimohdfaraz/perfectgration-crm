/**
 * UI-side mirror of the server rules. The UI uses these to hide or label
 * things. The real enforcement lives in the API layer (Phase 2), and the
 * UI is never treated as the security boundary.
 */
import { STATUS_LABEL, type Case, type Role, type User } from "./demo-data";

export const canSeeCase = (u: User, c: Case) => u.role !== "consultant" || u.teams.includes(c.visa);
export const visibleCases = (u: User, cases: Case[]) => cases.filter((c) => canSeeCase(u, c));

export const isAdmin = (u: User) => u.role === "admin";
export const canSeeOutcome = isAdmin;
export const canSeeCommission = isAdmin;
export const canAddCases = (u: User) => isAdmin(u) || !!u.canAdd;
export const canEditCase = (u: User, c: Case) => isAdmin(u) || (u.role === "consultant" && c.consultantId === u.id);
export const canMoveStage = canEditCase;
export const canReactivate = isAdmin;
export const canViewReports = (u: User) => u.role !== "consultant";
export const canUseAdmin = isAdmin;
export const hasRole = (u: User, roles: Role[]) => roles.includes(u.role);

/** Non-admins never see approved or refused outcomes. */
export function displayStatus(u: User, c: Case): { label: string; restricted: boolean } {
  if (!canSeeOutcome(u) && (c.status === "approved" || c.status === "refused")) {
    return { label: "Closed (outcome restricted)", restricted: true };
  }
  return { label: STATUS_LABEL[c.status], restricted: false };
}
