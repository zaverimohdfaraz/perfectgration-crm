/**
 * Numbers for the Social Media, Sales and Case Manager pages. Everything is worked out from the case
 * history, so a figure always matches what actually happened and when.
 */
import { STAGE_OWNER, type Case, type HistoryEntry, type StageId, type StageOwner } from "./demo-data";
import { TODAY } from "./dates";

const DAY = 86_400_000;
const TZ_OFFSET = 3 * 3_600_000; // Riyadh, UTC+3, no daylight saving

export type RangeKey = "today" | "week" | "month" | "custom";
export type Range = { key: RangeKey; from: number; to: number; label: string };

/** Start of the Riyadh calendar day that contains `ms`. */
const dayStart = (ms: number) => Math.floor((ms + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET;

export function makeRange(key: RangeKey, custom?: { from: string; to: string }): Range {
  const now = TODAY.getTime();
  const today = dayStart(now);
  if (key === "today") return { key, from: today, to: today + DAY, label: "Today" };
  if (key === "week") {
    // Working week starts on Sunday in Saudi Arabia.
    const dow = new Date(today + TZ_OFFSET).getUTCDay();
    const from = today - dow * DAY;
    return { key, from, to: today + DAY, label: "This week" };
  }
  if (key === "custom" && custom?.from && custom?.to) {
    const f = dayStart(Date.parse(`${custom.from}T12:00:00+03:00`));
    const t = dayStart(Date.parse(`${custom.to}T12:00:00+03:00`)) + DAY;
    return f < t ? { key, from: f, to: t, label: "Custom range" } : { key, from: t - DAY, to: f + DAY, label: "Custom range" };
  }
  const d = new Date(today + TZ_OFFSET);
  const from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - TZ_OFFSET;
  return { key: "month", from, to: today + DAY, label: "This month" };
}

export const inRange = (iso: string | undefined, r: Range) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return t >= r.from && t < r.to;
};

/**
 * True when anything happened on the case in the period: created, moved, accepted, a note, a problem,
 * a submission update, an appointment or a deadline. The date filters on the team pages and the
 * dashboard use this, so every list and number follows the chosen period.
 */
export function inPeriod(c: Case, r: Range): boolean {
  if (inRange(c.updatedAt, r) || inRange(c.stageSince, r) || inRange(c.deadline ?? undefined, r) || inRange(c.appointmentAt, r) || inRange(c.submittedAt, r)) return true;
  return c.history.some((h) => inRange(h.at, r)) || c.notes.some((n) => inRange(n.at, r)) || c.issues.some((i) => inRange(i.at, r) || inRange(i.resolvedAt, r)) || (c.submissionLog ?? []).some((s) => inRange(s.at, r));
}

/** The history entry where the case moved into `stage`, if it did. */
export const entered = (c: Case, stage: StageId): HistoryEntry | undefined => c.history.find((h) => h.to === stage && h.from !== h.to);
export const enteredIn = (c: Case, stage: StageId, r: Range) => inRange(entered(c, stage)?.at, r);
export const claimIn = (c: Case, team: "sales" | "case", r: Range) =>
  c.history.some((h) => h.kind === "claim" && STAGE_OWNER[h.to] === team && inRange(h.at, r));

/** Day-by-day counts for a chart. Long ranges are grouped by week so the chart stays readable. */
export function series(r: Range, points: { at?: string }[][]): { label: string; values: number[] }[] {
  const days = Math.max(1, Math.round((r.to - r.from) / DAY));
  const step = days > 31 ? 7 : 1;
  const buckets: { label: string; values: number[] }[] = [];
  for (let start = r.from; start < r.to; start += step * DAY) {
    const end = Math.min(r.to, start + step * DAY);
    const d = new Date(start + TZ_OFFSET);
    const label = `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
    buckets.push({ label: step === 7 ? `w/c ${label}` : label, values: points.map((list) => list.filter((p) => p.at && Date.parse(p.at) >= start && Date.parse(p.at) < end).length) });
  }
  return buckets;
}

export const ownerOf = (c: Case): StageOwner => STAGE_OWNER[c.stage];
export const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((TODAY.getTime() - Date.parse(iso)) / DAY)) : 0);
export const hoursBetween = (a?: string, b?: string) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 3_600_000) : null);

export function avg(nums: (number | null)[]): number | null {
  const ok = nums.filter((n): n is number => typeof n === "number");
  return ok.length ? ok.reduce((s, n) => s + n, 0) / ok.length : null;
}

export const fmtHours = (h: number | null) => (h === null ? "—" : h < 24 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} days`);
export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
