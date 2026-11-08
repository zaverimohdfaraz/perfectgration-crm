"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, EmptyState, Panel } from "./ui";
import { Pill } from "./status";
import { useDemo } from "@/lib/store";
import { dayKey, rangeDays } from "@/lib/ads";
import type { Range } from "@/lib/analytics";
import { ROLE_LABEL, WORK_TEAM_LABEL, type User } from "@/lib/demo-data";
import { TODAY } from "@/lib/dates";
import { daysBetween, demoLogins, fmtClock, wasIn, workingDays, type LoginDay, type LoginsResponse } from "@/lib/logins";
import { td, th } from "@/lib/styles";

/** The daily sign-in record for a range of days (YYYY-MM-DD). Sample data in demo mode; refreshed every 2 minutes in live mode. */
export function useLogins(from: string, to: string) {
  const d = useDemo();
  const demo = d.mode === "demo";
  const [rows, setRows] = useState<LoginDay[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    if (demo) {
      // The person looking at the sample is obviously signed in today.
      const now = TODAY.getTime();
      const sample = demoLogins(d.users, from, to, now).filter((r) => !(r.userId === d.user.id && r.day === dayKey(now) && !wasIn(r)));
      if (from <= dayKey(now) && dayKey(now) <= to && !sample.some((r) => r.userId === d.user.id && r.day === dayKey(now))) {
        const at = new Date(now - 25 * 60_000).toISOString();
        sample.push({ userId: d.user.id, day: dayKey(now), firstAt: at, lastSignInAt: at, lastActiveAt: new Date(now).toISOString(), signIns: 1, activeMinutes: 25, failed: 0, device: "Chrome on Windows" });
      }
      setRows(sample);
      return;
    }
    let live = true;
    fetch(`/api/logins?from=${from}&to=${to}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j as { error?: string }).error || "The sign-in record could not be loaded."); return j as LoginsResponse; })
      .then((j) => { if (live) { setRows(j.rows); setError(""); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, from, to, tick, d.user.id]);

  useEffect(() => {
    if (demo) return;
    const t = setInterval(reload, 120_000);
    return () => clearInterval(t);
  }, [demo, reload]);

  return { rows, error, reload };
}

export const teamOf = (u: User) => (u.role === "consultant" ? (u.workTeam ? WORK_TEAM_LABEL[u.workTeam] : "Team member") : ROLE_LABEL[u.role]);

/** Online: the CRM reported in within the online window and the person has not signed out since. */
export function onlineNow(r: LoginDay | undefined, nowMs: number, minutes: number) {
  if (!r?.lastActiveAt) return false;
  const last = Date.parse(r.lastActiveAt);
  if (r.signedOutAt && Date.parse(r.signedOutAt) >= last) return false;
  return nowMs - last <= minutes * 60_000;
}

/** People shown in the record: everyone active, plus anyone switched off who still has rows in the range. */
export const peopleFor = (users: User[], rows: LoginDay[]) => users.filter((u) => !u.inactive || rows.some((r) => r.userId === u.id));

export function TodayCell({ r }: { r: LoginDay | undefined }) {
  if (wasIn(r)) return <span className="font-semibold tabular-nums">{r!.signIns > 0 ? fmtClock(r!.firstAt) : <>{fmtClock(r!.firstAt)} <span className="text-xs font-normal text-ink-muted">(still signed in from before)</span></>}</span>;
  if (r?.failed) return <Pill tone="danger">Wrong password ×{r.failed}</Pill>;
  return <span className="text-ink-muted">Not signed in</span>;
}

export function LastSeen({ r, online }: { r: LoginDay | undefined; online: boolean }) {
  if (online) return <span className="inline-flex items-center gap-1.5 font-semibold text-green-800"><span aria-hidden className="h-2 w-2 rounded-full bg-green-600" />Online</span>;
  if (!wasIn(r)) return <span className="text-ink-muted">—</span>;
  return <span className="tabular-nums">{fmtClock(r!.lastActiveAt)}{r!.signedOutAt && <span className="text-ink-muted"> · signed out {fmtClock(r!.signedOutAt)}</span>}</span>;
}

/**
 * Dashboard panel for the administrator: who signed in today (first sign-in, online or last seen),
 * and, for the chosen date filter, on how many working days each person signed in.
 */
export function SignInsPanel({ range }: { range: Range }) {
  const d = useDemo();
  const nowMs = TODAY.getTime();
  const today = dayKey(nowMs);
  const r = rangeDays(range);
  const from = r.from < today ? r.from : today;
  const to = r.to > today ? r.to : today;
  const { rows, error } = useLogins(from, to);
  const all = rows ?? [];
  const showRange = range.key !== "today";
  const rangeTo = r.to < today ? r.to : today;
  const work = r.from <= rangeTo ? workingDays(daysBetween(r.from, rangeTo)) : 0;

  const people = peopleFor(d.users, all.filter((x) => x.day === today));
  const todayOf = (u: User) => all.find((x) => x.userId === u.id && x.day === today);
  const daysIn = (u: User) => all.filter((x) => x.userId === u.id && x.day >= r.from && x.day <= r.to && wasIn(x)).length;
  const online = (u: User) => onlineNow(todayOf(u), nowMs, d.settings.onlineMinutes);
  const sorted = [...people].sort((a, b) =>
    Number(online(b)) - Number(online(a)) || Number(wasIn(todayOf(b))) - Number(wasIn(todayOf(a)))
    || (todayOf(a)?.firstAt ?? "~").localeCompare(todayOf(b)?.firstAt ?? "~") || a.name.localeCompare(b.name));
  const inToday = people.filter((u) => wasIn(todayOf(u))).length;
  const onlineCount = people.filter(online).length;
  const failed = people.reduce((s, u) => s + (todayOf(u)?.failed ?? 0), 0);

  return (
    <Panel title="Sign-ins" description={`Who signed in today${showRange ? `, and days signed in · ${range.label}` : ""}`} flush
      action={<Link href="/sign-ins" className="text-sm font-semibold text-brand-deep hover:underline">Full record</Link>}>
      <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3 text-sm">
        <Pill tone="success">{inToday} of {people.length} signed in today</Pill>
        <Pill tone="neutral">{onlineCount} online now</Pill>
        {people.length - inToday > 0 && <Pill tone="warning">{people.length - inToday} not signed in</Pill>}
        {failed > 0 && <Pill tone="danger">{failed} wrong password{failed === 1 ? "" : "s"} today</Pill>}
      </div>
      {error ? <p className="px-5 py-4 text-sm text-red-800">{error}</p> : rows === null ? <p className="px-5 py-4 text-sm text-ink-muted">Loading…</p> : people.length === 0 ? (
        <EmptyState title="Nobody yet" body="Sign-ins appear here as people sign in." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr className="border-b border-line">
              <th className={th}>Person</th><th className={th}>Signed in today</th><th className={th}>Last seen</th>
              {showRange && <th className={`${th} text-right`}>Days in · {range.label}</th>}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {sorted.map((u) => (
                <tr key={u.id}>
                  <td className={td}><span className="flex items-center gap-3"><Avatar name={u.name} /><span><span className="block font-semibold">{u.name}</span><span className="block text-sm text-ink-muted">{teamOf(u)}</span></span></span></td>
                  <td className={td}><TodayCell r={todayOf(u)} /></td>
                  <td className={td}><LastSeen r={todayOf(u)} online={online(u)} /></td>
                  {showRange && <td className={`${td} text-right tabular-nums`}><span className="font-semibold">{daysIn(u)}</span><span className="text-ink-muted"> of {work}</span></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
