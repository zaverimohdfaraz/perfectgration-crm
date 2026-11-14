"use client";

import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel, Avatar, Tabs } from "@/components/ui";
import { Pill } from "@/components/status";
import { Kpi, RangePicker, useRange } from "@/components/hub";
import { Download, RotateCcw } from "@/components/icons";
import { LastSeen, TodayCell, onlineNow, peopleFor, teamOf, useLogins } from "@/components/sign-ins";
import { useDemo } from "@/lib/store";
import { dayKey, rangeDays } from "@/lib/ads";
import { TODAY } from "@/lib/dates";
import { daysBetween, fmtClock, fmtDay, fmtMinutes, summarise, toCsv, wasIn, type LoginDay, type PersonSummary } from "@/lib/logins";
import type { User } from "@/lib/demo-data";
import { btn, field, td, th } from "@/lib/styles";

const CALENDAR_MAX = 62;
type View = "calendar" | "days" | "people";
type TeamFilter = "" | "leaders" | "social" | "sales" | "case";

/** Day-by-day record of who signed in, when, for how long and from which device. Administrator only. */
export default function SignInsPage() {
  const d = useDemo();
  const r = useRange("week");
  const [view, setView] = useState<View>("calendar");
  const [team, setTeam] = useState<TeamFilter>("");
  const nowMs = TODAY.getTime();
  const today = dayKey(nowMs);
  const { from, to } = rangeDays(r.range);
  const last = to < today ? to : today;
  const { rows, error, reload } = useLogins(from, last < from ? from : last);
  const all = useMemo(() => rows ?? [], [rows]);

  if (d.user.role !== "admin") return <EmptyState title="Administrators only" body="The sign-in record is only available to the administrator." />;

  const days = last >= from ? daysBetween(from, last) : [];
  // Every day counts, including Friday, Saturday and Sunday.
  const work = days.length;
  const people = peopleFor(d.users, all).filter((u) =>
    !team ? true : team === "leaders" ? u.role !== "consultant" : u.role === "consultant" && u.workTeam === team);
  const ids = new Set(people.map((u) => u.id));
  const mine = all.filter((x) => ids.has(x.userId));
  const cell = (u: User, day: string) => mine.find((x) => x.userId === u.id && x.day === day);
  const summary = summarise(people, mine);
  const personDays = mine.filter(wasIn).length;
  const inToday = people.filter((u) => wasIn(cell(u, today))).length;
  const online = people.filter((u) => onlineNow(cell(u, today), nowMs, d.settings.onlineMinutes)).length;
  const failed = mine.reduce((s, x) => s + x.failed, 0);

  const download = () => {
    const blob = new Blob([`﻿${toCsv(d.users, mine)}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sign-ins-${from}-to-${last}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Sign-in record"
        description="Who signed in each day, when they started, when they were last seen, and from which device. Times are Riyadh time."
        actions={<RangePicker state={r} />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Signed in today" value={`${inToday} / ${people.length}`} tone={inToday < people.length ? "warning" : "good"} hint={fmtDay(today)} />
        <Kpi label="Online now" value={online} hint={`CRM open in the last ${d.settings.onlineMinutes} min`} />
        <Kpi label="Average per day" value={work ? (personDays / work).toFixed(1) : "—"} hint={`${work} day${work === 1 ? "" : "s"} · ${r.range.label}`} />
        <Kpi label="Wrong passwords" value={failed} tone={failed ? "danger" : "default"} hint={r.range.label} />
      </div>

      <Panel className="mt-5" flush>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-ink-muted" htmlFor="si-team">Team</label>
            <select id="si-team" className={`${field.replace("w-full", "")} h-10 w-full max-w-[16rem]`} value={team} onChange={(e) => setTeam(e.target.value as TeamFilter)}>
              <option value="">Everyone</option><option value="leaders">Administrator and managers</option>
              <option value="social">Social Media Team</option><option value="sales">Sales Team</option><option value="case">Case Manager</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {d.mode === "api" && <button type="button" className={`${btn.secondary} min-h-10`} onClick={reload}><RotateCcw size={16} aria-hidden />Refresh</button>}
            <button type="button" className={`${btn.secondary} min-h-10`} onClick={download} disabled={!mine.length}><Download size={16} aria-hidden />Download CSV</button>
          </div>
        </div>
        <div className="px-5 pt-2"><Tabs value={view} onChange={(v) => setView(v as View)} tabs={[{ id: "calendar", label: "Calendar" }, { id: "days", label: "By day" }, { id: "people", label: "By person" }]} /></div>

        <div id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`}>
          {error ? <p className="px-5 py-6 text-sm text-red-800">{error}</p>
            : rows === null ? <p className="px-5 py-6 text-sm text-ink-muted">Loading…</p>
            : days.length === 0 ? <EmptyState title="Nothing to show" body="This range is in the future." />
            : people.length === 0 ? <EmptyState title="Nobody in this team" body="Choose another team." />
            : view === "calendar" ? <Calendar people={people} days={days} cell={cell} today={today} />
            : view === "days" ? <ByDay people={people} days={days} cell={cell} today={today} nowMs={nowMs} minutes={d.settings.onlineMinutes} />
            : <ByPerson people={people} summary={summary} work={work} />}
        </div>
      </Panel>
      <p className="mt-3 text-sm text-ink-muted">
        &quot;Time open&quot; counts the minutes the CRM was open in a browser tab, so it shows presence, not work done. Someone who stays signed in overnight
        appears the next day as &quot;still signed in from before&quot;.
      </p>
    </div>
  );
}

type CellFn = (u: User, day: string) => LoginDay | undefined;

function Calendar({ people, days, cell, today }: { people: User[]; days: string[]; cell: CellFn; today: string }) {
  if (days.length > CALENDAR_MAX) return <EmptyState title={`Choose ${CALENDAR_MAX} days or fewer`} body="The calendar shows one column per day. For longer ranges, use By person." />;
  const cols = [...days].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <caption className="sr-only">First sign-in time per person and day</caption>
        <thead><tr>
          <th scope="col" className={`${th} sticky left-0 z-10 min-w-[12rem] border-b border-line bg-white`}>Person</th>
          {cols.map((day) => <th key={day} scope="col" className={`whitespace-nowrap border-b border-line px-2 py-3 text-center text-xs font-semibold ${day === today ? "text-brand-deep" : "text-ink-muted"}`}>{fmtDay(day).split(" ").slice(0, 2).join(" ")}</th>)}
        </tr></thead>
        <tbody>
          {people.map((u) => (
            <tr key={u.id}>
              <th scope="row" className="sticky left-0 z-10 border-b border-line bg-white px-4 py-2 text-left font-semibold"><span className="block whitespace-nowrap">{u.name}</span><span className="block text-xs font-normal text-ink-muted">{teamOf(u)}</span></th>
              {cols.map((day) => {
                const x = cell(u, day);
                const inn = wasIn(x);
                const tip = inn ? `${u.name}, ${fmtDay(day)}: first ${fmtClock(x!.firstAt)}, last seen ${fmtClock(x!.lastActiveAt)}, open ${fmtMinutes(x!.activeMinutes)}` : x?.failed ? `${u.name}, ${fmtDay(day)}: ${x.failed} wrong password(s), not signed in` : `${u.name}, ${fmtDay(day)}: not signed in`;
                return (
                  <td key={day} title={tip} className="border-b border-line px-1 py-2 text-center">
                    {inn ? <span className="inline-block min-w-[3.25rem] rounded-md bg-green-100 px-1.5 py-1 font-semibold tabular-nums text-green-900">{fmtClock(x!.firstAt)}</span>
                      : x?.failed ? <span className="inline-block min-w-[3.25rem] rounded-md bg-red-100 px-1.5 py-1 font-semibold text-red-900">✕ {x.failed}</span>
                      : <span className="text-ink-muted"><span aria-hidden>·</span><span className="sr-only">Not signed in</span></span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="flex flex-wrap gap-4 px-5 py-3 text-xs text-ink-muted">
        <span><span className="mr-1 inline-block rounded bg-green-100 px-1.5 font-semibold text-green-900">08:12</span>first sign-in</span>
        <span><span className="mr-1 inline-block rounded bg-red-100 px-1.5 font-semibold text-red-900">✕ 2</span>wrong passwords, not signed in</span>
      </p>
    </div>
  );
}

function ByDay({ people, days, cell, today, nowMs, minutes }: { people: User[]; days: string[]; cell: CellFn; today: string; nowMs: number; minutes: number }) {
  return (
    <div className="divide-y divide-line">
      {[...days].reverse().map((day) => {
        const inn = people.filter((u) => wasIn(cell(u, day)));
        const out = people.filter((u) => !wasIn(cell(u, day)));
        const sorted = [...inn].sort((a, b) => (cell(a, day)!.firstAt ?? "").localeCompare(cell(b, day)!.firstAt ?? ""));
        return (
          <section key={day} className="py-2">
            <h3 className="flex flex-wrap items-center gap-2 px-5 pt-3 font-semibold">
              {fmtDay(day)}{day === today && <Pill tone="info">Today</Pill>}
              <span className="text-sm font-normal text-ink-muted">{inn.length} of {people.length} signed in</span>
            </h3>
            {inn.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Person</th><th className={th}>First sign-in</th><th className={th}>Last seen</th><th className={th}>Time open</th>
                    <th className={`${th} text-right`}>Sign-ins</th><th className={th}>Device</th>
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {sorted.map((u) => {
                      const x = cell(u, day)!;
                      return (
                        <tr key={u.id}>
                          <td className={td}><span className="flex items-center gap-3"><Avatar name={u.name} /><span><span className="block font-semibold">{u.name}</span><span className="block text-sm text-ink-muted">{teamOf(u)}</span></span></span></td>
                          <td className={td}><TodayCell r={x} />{x.failed > 0 && <span className="mt-1 block text-xs text-red-800">{x.failed} wrong password{x.failed === 1 ? "" : "s"}</span>}</td>
                          <td className={td}><LastSeen r={x} online={day === today && onlineNow(x, nowMs, minutes)} /></td>
                          <td className={`${td} tabular-nums`}>{fmtMinutes(x.activeMinutes)}</td>
                          <td className={`${td} text-right tabular-nums`}>{x.signIns}</td>
                          <td className={`${td} text-sm text-ink-muted`}>{x.device ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {out.length > 0 && (
              <p className="px-5 py-3 text-sm"><span className="font-semibold">Not signed in:</span> {out.map((u) => {
                const f = cell(u, day)?.failed;
                return `${u.name}${f ? ` (${f} wrong password${f === 1 ? "" : "s"})` : ""}`;
              }).join(", ")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ByPerson({ people, summary, work }: { people: User[]; summary: PersonSummary[]; work: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead><tr className="border-b border-line">
          <th className={th}>Person</th><th className={`${th} text-right`}>Days signed in</th><th className={th}>Usual start</th>
          <th className={`${th} text-right`}>Time open</th><th className={`${th} text-right`}>Sign-ins</th><th className={`${th} text-right`}>Wrong passwords</th><th className={th}>Last day in</th>
        </tr></thead>
        <tbody className="divide-y divide-line">
          {people.map((u) => {
            const s = summary.find((x) => x.userId === u.id)!;
            const low = work > 0 && s.days < work;
            return (
              <tr key={u.id}>
                <td className={td}><span className="flex items-center gap-3"><Avatar name={u.name} /><span><span className="block font-semibold">{u.name}</span><span className="block text-sm text-ink-muted">{teamOf(u)}</span></span></span></td>
                <td className={`${td} text-right tabular-nums`}><span className={`font-semibold ${low ? "text-amber-900" : ""}`}>{s.days}</span><span className="text-ink-muted"> of {work}</span></td>
                <td className={`${td} tabular-nums`}>{s.avgFirst ?? "—"}</td>
                <td className={`${td} text-right tabular-nums`}>{fmtMinutes(s.activeMinutes)}</td>
                <td className={`${td} text-right tabular-nums`}>{s.signIns}</td>
                <td className={`${td} text-right tabular-nums ${s.failed ? "font-semibold text-red-800" : ""}`}>{s.failed}</td>
                <td className={td}>{s.lastDay ? fmtDay(s.lastDay) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-5 py-3 text-xs text-ink-muted">&quot;Of&quot; counts every day in the range, Friday and Saturday included. &quot;Usual start&quot; is the average first sign-in time.</p>
    </div>
  );
}
