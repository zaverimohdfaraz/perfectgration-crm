/**
 * Writes the daily sign-in record (collection `logins`). Every function here is best-effort:
 * callers catch errors, so a problem with the record can never stop anyone signing in or working.
 */
import "server-only";
import { LoginModel } from "./models";
import { dayKey } from "@/lib/ads";
import { loginId, type LoginDay } from "@/lib/logins";

/** A reported minute counts only if the previous one was at least this long ago (the screen reports once a minute). */
const MIN_GAP_MS = 50_000;

const isDuplicate = (e: unknown) => (e as { code?: number })?.code === 11000;

/** Two first-of-the-day writes can race to create the row; the loser simply tries once more. */
async function upsert(_id: string, update: Record<string, unknown>) {
  try {
    await LoginModel.updateOne({ _id }, update, { upsert: true });
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    await LoginModel.updateOne({ _id }, update, { upsert: true });
  }
}

export async function recordSignIn(userId: string, device: string) {
  const now = new Date();
  const iso = now.toISOString();
  const day = dayKey(now.getTime());
  await upsert(loginId(userId, day), {
    $setOnInsert: { userId, day },
    $min: { firstAt: iso },
    $set: { lastSignInAt: iso, lastActiveAt: iso, device },
    $inc: { signIns: 1 },
    $unset: { signedOutAt: 1 },
  });
}

export async function recordFailed(userId: string) {
  const now = new Date();
  const day = dayKey(now.getTime());
  await upsert(loginId(userId, day), { $setOnInsert: { userId, day }, $set: { lastFailedAt: now.toISOString() }, $inc: { failed: 1 } });
}

/** Called by the once-a-minute report from an open CRM. Also starts the day's row for someone still signed in from yesterday. */
export async function recordActivity(userId: string) {
  const now = new Date();
  const iso = now.toISOString();
  const day = dayKey(now.getTime());
  const _id = loginId(userId, day);
  const cutoff = new Date(now.getTime() - MIN_GAP_MS).toISOString();
  const r = await LoginModel.updateOne(
    { _id, $or: [{ lastActiveAt: { $lt: cutoff } }, { lastActiveAt: { $exists: false } }] },
    { $set: { lastActiveAt: iso }, $inc: { activeMinutes: 1 }, $min: { firstAt: iso }, $unset: { signedOutAt: 1 } },
  );
  if (r.matchedCount === 0) {
    // No row yet today (or a report less than a minute ago, in which case this changes nothing).
    try {
      await LoginModel.updateOne({ _id }, { $setOnInsert: { userId, day, firstAt: iso, lastActiveAt: iso, activeMinutes: 1 } }, { upsert: true });
    } catch (e) {
      if (!isDuplicate(e)) throw e;
    }
  }
}

export async function recordSignOut(userId: string) {
  const now = new Date();
  await LoginModel.updateOne({ _id: loginId(userId, dayKey(now.getTime())) }, { $set: { signedOutAt: now.toISOString() } });
}

/** Rows for a range of days (YYYY-MM-DD, inclusive). */
export async function readLogins(from: string, to: string): Promise<LoginDay[]> {
  const docs = (await LoginModel.find({ day: { $gte: from, $lte: to } }).lean()) as unknown as (Partial<LoginDay> & { userId: string; day: string })[];
  return docs.map((d) => ({
    userId: d.userId, day: d.day,
    firstAt: d.firstAt, lastSignInAt: d.lastSignInAt, lastActiveAt: d.lastActiveAt, signedOutAt: d.signedOutAt,
    signIns: d.signIns ?? 0, activeMinutes: d.activeMinutes ?? 0, failed: d.failed ?? 0, lastFailedAt: d.lastFailedAt, device: d.device,
  }));
}
