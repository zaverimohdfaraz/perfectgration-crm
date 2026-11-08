/** Referral agent commission, worked out per case. */
import type { Agent, Case } from "./demo-data";

export type CommissionState = "paid" | "due" | "not_due" | "none";
export const COMMISSION_LABEL: Record<CommissionState, string> = { paid: "Paid", due: "Due", not_due: "Not due yet", none: "No commission" };

/** The case's fee the percentage applies to: the deal fee, else the fees collected. */
export const caseFee = (c: Case) => c.dealFeeSar ?? c.feesCollectedSar ?? 0;

/** Commission for one case: the amount recorded on the case if there is one, else the agent's terms. */
export function commissionFor(a: Agent, c: Case): number {
  if (typeof c.commissionSar === "number") return c.commissionSar;
  return a.commissionType === "flat" ? a.amount : Math.round((caseFee(c) * a.amount) / 100);
}

/**
 * Commission is due once the client has paid fees (the case reached Advance / Fees Collection or later).
 * Cases closed before that earn nothing.
 */
export function commissionState(c: Case): CommissionState {
  if (c.agentPaidAt) return "paid";
  const reachedFees = c.history.some((h) => h.to === "advance") || typeof c.feesCollectedSar === "number";
  if (reachedFees) return "due";
  if (c.status === "withdrawn" || c.status === "refused" || c.status === "returned") return "none";
  return "not_due";
}
