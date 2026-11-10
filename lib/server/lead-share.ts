import "server-only";
/**
 * Runs automatic lead sharing (see lib/lead-share.ts for the rules).
 * Called when a Sales member signs in or out, when a lead is passed to Sales, and from the one-minute ping
 * every open CRM sends (at most once a minute), so leads of people who went offline are shared again.
 */
import { planShare, isOnline } from "@/lib/lead-share";
import { shareCase } from "@/lib/case-logic";
import type { Case } from "@/lib/demo-data";
import { CaseModel, CounterModel } from "./models";
import { allUsers, loadSettings, outCase, saveCase } from "./data";
import { trust } from "@/lib/server/trusted";

const LOCK = "lock-lead-share";
const LAST = "last-lead-share";

/** Only one run at a time across all servers. Returns false when another run holds the lock. */
async function lock(): Promise<boolean> {
  const now = Date.now();
  try {
    const r = await CounterModel.updateOne(trust({ _id: LOCK, seq: { $lt: now } }), { $set: { seq: now + 20_000 } }, { upsert: true });
    return r.modifiedCount + r.upsertedCount > 0;
  } catch {
    return false; // the lock exists and is held (upsert hit the existing record)
  }
}
const unlock = () => CounterModel.updateOne({ _id: LOCK }, { $set: { seq: 0 } });

/**
 * @param force run now (sign-in, sign-out, new lead). Otherwise runs at most once a minute.
 * @returns how many leads changed hands
 */
export async function runLeadSharing(force = false): Promise<number> {
  const settings = await loadSettings();
  if (!settings.company.autoShareLeads) return 0;
  const now = Date.now();
  if (!force) {
    const last = (await CounterModel.findById(LAST).lean()) as { seq?: number } | null;
    if (last?.seq && now - last.seq < 55_000) return 0;
  }
  if (!(await lock())) return 0;
  try {
    await CounterModel.updateOne({ _id: LAST }, { $set: { seq: now } }, { upsert: true });
    const users = await allUsers();
    const online = new Set(users.filter((u) => isOnline(u, now, settings.company.onlineMinutes)).map((u) => u.id));
    const raw = (await CaseModel.find({ stage: "firstcall", status: "active" }).lean()) as never[];
    const cases = raw.map(outCase);
    const moves = planShare(cases, users, online);
    let done = 0;
    for (const m of moves) {
      const c = cases.find((x) => x.id === m.caseId)!;
      const to = users.find((u) => u.id === m.toUserId)!;
      const from = m.fromUserId ? users.find((u) => u.id === m.fromUserId)?.name : undefined;
      try {
        await saveCase(c, shareCase(c, to, new Date().toISOString(), from));
        done++;
      } catch {
        // Someone changed this lead at the same moment (for example they just worked on it). Leave it.
      }
    }
    return done;
  } finally {
    await unlock();
  }
}

/** Runs sharing for a lead that just reached the Sales pool, and returns the lead as it is now. Never throws. */
export async function shareNow(c: Case): Promise<Case> {
  try {
    await runLeadSharing(true);
    const raw = await CaseModel.findById(c.id).lean();
    return raw ? outCase(raw as never) : c;
  } catch (e) {
    console.error("[lead-share]", e);
    return c;
  }
}

/** Marks someone as online now (or offline). */
export async function setActive(userId: string, active: boolean) {
  const { UserModel } = await import("./models");
  await UserModel.updateOne({ _id: userId }, active ? { $set: { lastActiveAt: new Date().toISOString() } } : { $unset: { lastActiveAt: 1 } });
}
