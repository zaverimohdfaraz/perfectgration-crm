import { STAGES, STAGE_OWNER, DEFAULT_SLA_DAYS, type Case, type StageId, type StageOwner } from "./demo-data";
import { TODAY } from "./dates";

const DAY = 86_400_000;
export type Period = { stage: StageId; owner: StageOwner; ownerId: string; enteredAt: string; leftAt?: string; days: number; allowed: number; late: boolean; current: boolean; waitedDays?: number };

const ownerIdFor = (c: Case, owner: StageOwner) => (owner === "social" ? c.leadById : owner === "sales" ? c.salesId : owner === "case" ? c.caseManagerId : "");

/** How long each step took, who held it, and whether it ran past the allowed days. Used to show where a case got stuck. */
export function stagePeriods(c: Case, sla: Record<StageId, number> = DEFAULT_SLA_DAYS): Period[] {
  const moves = c.history.filter((h) => h.kind !== "claim" && h.kind !== "assign" && h.from !== h.to);
  const claims = c.history.filter((h) => h.kind === "claim");
  return moves.map((h, i) => {
    const next = moves[i + 1];
    const end = next ? new Date(next.at).getTime() : TODAY.getTime();
    const start = new Date(h.at).getTime();
    const days = Math.max(0, Math.floor((end - start) / DAY));
    const allowed = sla[h.to] ?? 1;
    const claim = claims.find((x) => x.to === h.to && new Date(x.at).getTime() >= start && new Date(x.at).getTime() <= end);
    const owner = STAGE_OWNER[h.to];
    return {
      stage: h.to, owner, ownerId: ownerIdFor(c, owner), enteredAt: h.at, leftAt: next?.at, days, allowed, late: days > allowed,
      current: !next && c.status === "active" && c.stage === h.to, waitedDays: claim ? Math.floor((new Date(claim.at).getTime() - start) / DAY) : undefined,
    };
  });
}

/** The step where a case spent the most time past its allowance, or null when nothing ran late. */
export function worstDelay(c: Case): Period | null {
  const late = stagePeriods(c).filter((p) => p.late);
  return late.sort((a, b) => b.days - b.allowed - (a.days - a.allowed))[0] ?? null;
}

export const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id);
