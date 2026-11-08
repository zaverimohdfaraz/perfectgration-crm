/**
 * Automatic lead sharing for the Sales team.
 *
 * Leads passed to Sales (to the whole team or to one visa team) are shared evenly among the Sales members
 * who are online. When another member comes online, untouched leads move from the others to them, so
 * everyone stays even (40 leads and 4 people: 10 each; a 5th person: 8 each; a 6th: 7, 7, 7, 7, 6, 6).
 *
 * Only UNTOUCHED leads ever move: as soon as the holder does anything with a lead (a note, a problem, moving
 * it forward, pressing "Keep this lead"), it is theirs and is never moved again. Leads passed to one named
 * person are never shared.
 */
import type { Case, User } from "./demo-data";

export type ShareSettings = { autoShareLeads: boolean; onlineMinutes: number };
export type ShareMove = { caseId: string; fromUserId: string | null; toUserId: string };

/** Online = the CRM was open (it pings every minute) within the last `minutes` minutes. */
export const isOnline = (u: User, nowMs: number, minutes: number) =>
  !!u.lastActiveAt && nowMs - Date.parse(u.lastActiveAt) <= minutes * 60_000;

export const isSalesMember = (u: User) => u.role === "consultant" && u.workTeam === "sales" && !u.inactive;

/** A lead that may be shared or moved: waiting in the Sales pool, or shared automatically and not touched yet. */
export function isShareable(c: Case): boolean {
  if (c.status !== "active" || c.stage !== "firstcall") return false;
  if (c.route) return c.route.to === "sales" && c.route.kind !== "person";
  return !!c.autoShared;
}

/** Who may receive a lead: any Sales member, or for a visa-team lead only members of that visa team. */
export function canReceive(u: User, c: Case): boolean {
  if (!isSalesMember(u)) return false;
  const scope = c.route ? { kind: c.route.kind, visa: c.route.visa ?? c.visa } : c.autoShared;
  if (!scope) return false;
  return scope.kind === "visa" ? u.teams.includes(scope.visa ?? c.visa) : true;
}

const holderOf = (c: Case) => (c.route ? null : c.consultantId || null);
const sharedAt = (c: Case) => c.autoShared?.at ?? c.route?.at ?? c.stageSince;

/**
 * Works out which leads go to whom. Pure: it changes nothing, it returns the moves.
 * Leads stay where they are whenever that keeps things even, so nobody loses a lead without need.
 */
export function planShare(cases: Case[], users: User[], online: Set<string>): ShareMove[] {
  const members = users.filter((u) => isSalesMember(u) && online.has(u.id)).sort((a, b) => a.id.localeCompare(b.id));
  if (members.length === 0) return [];
  const leads = cases.filter(isShareable).sort((a, b) => sharedAt(a).localeCompare(sharedAt(b)) || a.id.localeCompare(b.id));
  const owner = new Map<string, string | null>();
  // Load = every First Call lead a person holds, including ones they already started (those never move,
  // but they count, so someone who is busy with leads gets fewer new ones).
  const count = new Map(members.map((m) => [m.id, cases.filter((c) => c.status === "active" && c.stage === "firstcall" && !c.route && !c.autoShared && c.consultantId === m.id).length]));

  // 1. Leads already with an online member who may hold them stay put for now.
  const pool: Case[] = [];
  for (const c of leads) {
    const h = holderOf(c);
    const m = h ? members.find((x) => x.id === h) : undefined;
    if (m && canReceive(m, c)) { owner.set(c.id, m.id); count.set(m.id, count.get(m.id)! + 1); }
    else if (members.some((x) => canReceive(x, c))) pool.push(c);
    // else: nobody online may take it; it stays where it is.
  }

  // 2. Waiting leads (and leads from people who went offline) go to whoever has the fewest.
  for (const c of pool) {
    const best = members.filter((m) => canReceive(m, c)).sort((a, b) => count.get(a.id)! - count.get(b.id)!)[0];
    owner.set(c.id, best.id);
    count.set(best.id, count.get(best.id)! + 1);
  }

  // 3. Even out: move the most recently shared lead from the busiest person to the least busy one who may take it.
  for (let guard = 0; guard < 10_000; guard++) {
    let moved = false;
    const byLoad = [...members].sort((a, b) => count.get(b.id)! - count.get(a.id)!);
    outer: for (const rich of byLoad) {
      for (const poor of [...byLoad].reverse()) {
        if (count.get(rich.id)! - count.get(poor.id)! <= 1) continue;
        const candidates = leads.filter((c) => owner.get(c.id) === rich.id && canReceive(poor, c)).sort((a, b) => sharedAt(b).localeCompare(sharedAt(a)));
        if (!candidates.length) continue;
        owner.set(candidates[0].id, poor.id);
        count.set(rich.id, count.get(rich.id)! - 1);
        count.set(poor.id, count.get(poor.id)! + 1);
        moved = true;
        break outer;
      }
    }
    if (!moved) break;
  }

  const moves: ShareMove[] = [];
  for (const c of leads) {
    const to = owner.get(c.id);
    if (to && to !== holderOf(c)) moves.push({ caseId: c.id, fromUserId: holderOf(c), toUserId: to });
  }
  return moves;
}
