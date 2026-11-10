/**
 * Daily sign-in record, shared by the screens and the server.
 * The server keeps one row per person per Riyadh calendar day (collection `logins`):
 * when they first signed in or opened the CRM that day, how many times they signed in,
 * when the CRM was last open, roughly how long it was open, wrong-password attempts, and the device.
 */
import { dayKey } from "./ads";
import { safeCell } from "./csv";
import type { User } from "./demo-data";

export type LoginDay = {
  userId: string;
  /** Riyadh calendar day, YYYY-MM-DD. */
  day: string;
  /** First sign-in or first activity that day. Missing when the day only has wrong-password attempts. */
  firstAt?: string;
  lastSignInAt?: string;
  /** Last time the CRM was open (it reports every minute while open). */
  lastActiveAt?: string;
  signedOutAt?: string;
  signIns: number;
  /** Minutes the CRM was open that day (one per minute it reported in). */
  activeMinutes: number;
  /** Wrong-password attempts that day. */
  failed: number;
  lastFailedAt?: string;
  /** For example "Chrome on Windows". */
  device?: string;
};

export type LoginsResponse = { rows: LoginDay[] };

/** Longest range the record can be read for in one go. */
export const MAX_DAYS = 366;
const DAY = 86_400_000;
const TZ = 3 * 3_600_000;

export const loginId = (userId: string, day: string) => `${userId}:${day}`;

/** True when the person actually used the CRM that day (not only wrong-password attempts). */
export const wasIn = (r: LoginDay | undefined) => !!r && (r.signIns > 0 || r.activeMinutes > 0 || !!r.firstAt);

/** Every day from `from` to `to` (inclusive), as YYYY-MM-DD. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); t <= end && out.length <= MAX_DAYS; t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Friday and Saturday: the weekend in Saudi Arabia. */
export const isWeekend = (day: string) => [5, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay());

/** Riyadh clock time, "09:05". */
export const fmtClock = (iso?: string) => (iso ? new Date(Date.parse(iso) + TZ).toISOString().slice(11, 16) : "—");

/** "Wed 21 Oct" */
export function fmtDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]} ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
}

export const fmtMinutes = (m: number) => (m <= 0 ? "—" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/** "Chrome on Windows", from the browser's user-agent text. Nothing else about the device is kept. */
export function deviceFrom(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export type PersonSummary = {
  userId: string;
  /** Days the person used the CRM in the range. */
  days: number;
  signIns: number;
  activeMinutes: number;
  failed: number;
  /** Average first sign-in time on the days they were in, "09:12". */
  avgFirst?: string;
  lastDay?: string;
};

/** Totals per person for a set of daily rows. */
export function summarise(users: User[], rows: LoginDay[]): PersonSummary[] {
  return users.map((u) => {
    const mine = rows.filter((r) => r.userId === u.id);
    const inDays = mine.filter(wasIn);
    const firsts = inDays.filter((r) => r.firstAt).map((r) => (Date.parse(r.firstAt!) + TZ) % DAY);
    const avg = firsts.length ? Math.round(firsts.reduce((s, x) => s + x, 0) / firsts.length / 60_000) : undefined;
    return {
      userId: u.id,
      days: inDays.length,
      signIns: mine.reduce((s, r) => s + r.signIns, 0),
      activeMinutes: mine.reduce((s, r) => s + r.activeMinutes, 0),
      failed: mine.reduce((s, r) => s + r.failed, 0),
      avgFirst: avg === undefined ? undefined : `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`,
      lastDay: inDays.map((r) => r.day).sort().at(-1),
    };
  });
}

/** Working days (Sunday to Thursday) in a list of days. */
export const workingDays = (days: string[]) => days.filter((d) => !isWeekend(d)).length;

/** CSV of the daily rows, for Excel. */
export function toCsv(users: User[], rows: LoginDay[]): string {
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const esc = (v: string | number) => {
    const t = String(safeCell(v));
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const head = ["Date", "Person", "First sign-in", "Last seen", "Signed out", "Sign-ins", "Minutes open", "Wrong passwords", "Device"];
  const body = [...rows].sort((a, b) => b.day.localeCompare(a.day) || name(a.userId).localeCompare(name(b.userId))).map((r) =>
    [r.day, name(r.userId), r.firstAt ? fmtClock(r.firstAt) : "", r.lastActiveAt ? fmtClock(r.lastActiveAt) : "", r.signedOutAt ? fmtClock(r.signedOutAt) : "", r.signIns, r.activeMinutes, r.failed, r.device ?? ""].map(esc).join(","));
  return [head.join(","), ...body].join("\n");
}

/**
 * Sample record for demo mode: working days only, most people in most days, a few absences,
 * and today's sign-ins up to the demo clock. Always the same for the same range.
 */
export function demoLogins(users: User[], fromDay: string, toDay: string, nowMs: number): LoginDay[] {
  const out: LoginDay[] = [];
  const today = dayKey(nowMs);
  const from = fromDay;
  const to = toDay < today ? toDay : today;
  if (from > to) return out;
  const devices = ["Chrome on Windows", "Chrome on Mac", "Safari on iPhone", "Edge on Windows", "Chrome on Android"];
  users.forEach((u, i) => {
    if (u.inactive) return;
    for (const day of daysBetween(from, to)) {
      if (isWeekend(day)) continue;
      const seed = (Number(day.replace(/-/g, "")) * (i + 7)) % 101;
      const isToday = day === today;
      if (seed % 9 === 0 || (isToday && ["u-faisal", "u-dina"].includes(u.id))) continue; // absent, or not in yet today
      const startMin = 7 * 60 + 40 + ((seed * 3) % 70); // 07:40 to 08:50
      const base = Date.parse(`${day}T00:00:00Z`) - TZ;
      const first = base + startMin * 60_000;
      if (first > nowMs) continue;
      const lastMs = isToday ? nowMs - ((seed % 4) * 60_000 + (seed % 3 === 0 ? 45 * 60_000 : 0)) : first + (420 + (seed % 90)) * 60_000;
      const last = Math.max(first, lastMs);
      out.push({
        userId: u.id, day,
        firstAt: new Date(first).toISOString(), lastSignInAt: new Date(first).toISOString(), lastActiveAt: new Date(last).toISOString(),
        signedOutAt: isToday || seed % 4 === 0 ? undefined : new Date(last).toISOString(),
        signIns: 1 + (seed % 5 === 0 ? 1 : 0),
        activeMinutes: Math.max(1, Math.round((last - first) / 60_000 * 0.9)),
        failed: seed % 11 === 0 ? 1 + (seed % 2) : 0,
        device: devices[(i + (seed % 2)) % devices.length],
      });
    }
  });
  // Someone who could not get in today: wrong passwords only.
  const p = users.find((u) => u.id === "u-dina");
  if (p && from <= today && today <= to) out.push({ userId: p.id, day: today, signIns: 0, activeMinutes: 0, failed: 2, lastFailedAt: new Date(nowMs - 20 * 60_000).toISOString() });
  return out;
}
