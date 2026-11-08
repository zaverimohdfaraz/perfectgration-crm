/**
 * The app clock. In demo mode it is fixed so the review screens are stable.
 * In live mode it is set from the server's time on every page load (so the server and the browser
 * show exactly the same day counts), then kept current in the browser. Use syncClock() to move it.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DATA_MODE !== "api";
export const TODAY = DEMO_MODE ? new Date("2026-10-21T09:00:00+03:00") : new Date();
export const syncClock = (ms: number) => { if (!DEMO_MODE && Number.isFinite(ms)) TODAY.setTime(ms); };
const DAY = 86_400_000;
const TZ = "Asia/Riyadh";

export const isoFromToday = (days: number) => new Date(TODAY.getTime() + days * DAY).toISOString();

/** Whole days since an ISO timestamp (positive = in the past). */
export const daysBetween = (fromIso: string) =>
  Math.floor((TODAY.getTime() - new Date(fromIso).getTime()) / DAY);

export type StageTone = "ontrack" | "followup" | "urgent";
/** Client rule: up to 10 days on track, over 10 follow up, over 21 urgent. */
export const stageTone = (days: number): StageTone => (days > 21 ? "urgent" : days > 10 ? "followup" : "ontrack");

export type DeadlineState = "none" | "overdue" | "d1" | "d3" | "d7" | "later";
export function deadlineState(iso: string | null): DeadlineState {
  if (!iso) return "none";
  const d = Math.ceil((new Date(iso).getTime() - TODAY.getTime()) / DAY);
  if (d < 0) return "overdue";
  if (d <= 1) return "d1";
  if (d <= 3) return "d3";
  if (d <= 7) return "d7";
  return "later";
}

export function deadlineText(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = Math.ceil((new Date(iso).getTime() - TODAY.getTime()) / DAY);
  if (d < 0) return `Overdue by ${-d} day${-d === 1 ? "" : "s"}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d} days`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Built from parts, so the server and the browser always print the same text. */
function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(iso))) o[p.type] = p.value;
  return { d: o.day.padStart(2, "0"), m: MONTHS[Number(o.month) - 1], y: o.year, hh: o.hour.padStart(2, "0"), mm: o.minute.padStart(2, "0") };
}

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const p = parts(iso);
  return `${p.d} ${p.m} ${p.y}`;
};

export const fmtDateTime = (iso: string) => {
  const p = parts(iso);
  return `${p.d} ${p.m} ${p.y}, ${p.hh}:${p.mm}`;
};

export const fmtSar = (n: number) => `SAR ${n.toLocaleString("en-US")}`;

/** ISO time `days` after another ISO time. */
export const plusDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString();
