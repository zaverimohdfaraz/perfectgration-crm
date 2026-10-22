"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, X } from "@/components/icons";
import { alertsFor, type AlertLevel } from "@/lib/insights";
import { userById } from "@/lib/demo-data";
import { useDemo } from "@/lib/store";
import { btn } from "@/lib/styles";

const LABEL: Record<AlertLevel, string> = { critical: "Overdue or urgent", high: "Due tomorrow", medium: "Needs attention", low: "Coming up" };
const DOT: Record<AlertLevel, string> = { critical: "bg-red-600", high: "bg-amber-600", medium: "bg-amber-500", low: "bg-brand" };

export function NotificationBell() {
  const d = useDemo();
  const [open, setOpen] = useState(false);
  const all = alertsFor(d.user, d.cases, d.clients);
  const items = all.filter((a) => !d.dismissed.includes(a.id));
  const urgent = items.filter((a) => a.level === "critical" || a.level === "high").length;

  const sendReminder = (caseId: string, client: string) => {
    const c = d.cases.find((x) => x.id === caseId);
    const who = userById(c?.consultantId ?? "")?.name ?? "the consultant";
    d.toast(`Reminder email sent to ${who} about ${client}. (Demo: no email was sent.)`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="alerts-panel"
        aria-label={`Notifications${urgent ? `, ${urgent} need action` : ""}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-brand-tint"
      >
        <Bell size={22} aria-hidden />
        {urgent > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{urgent}</span>
        )}
      </button>

      {open && (
        <div id="alerts-panel" role="region" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(94vw,400px)] overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">Notifications</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-brand-tint">
              <X size={18} aria-hidden />
            </button>
          </div>
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="p-6 text-center text-sm text-ink-muted">You are all caught up. No deadlines or stage alerts right now.</li>}
            {items.map((a) => (
              <li key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.level]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-muted">{LABEL[a.level]}</p>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-ink-muted">{a.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/cases/${a.caseId}`} onClick={() => setOpen(false)} className={`${btn.secondary} !min-h-10 text-sm`}>Open</Link>
                      <button type="button" onClick={() => sendReminder(a.caseId, a.client)} className={`${btn.secondary} !min-h-10 text-sm`}>Send reminder</button>
                      <button type="button" onClick={() => d.dismissAlert(a.id)} className={`${btn.ghost} !min-h-10 text-sm`}>Dismiss</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {d.dismissed.length > 0 && (
            <div className="border-t border-line p-3 text-center">
              <button type="button" onClick={d.restoreAlerts} className="text-sm font-semibold text-brand-deep hover:underline">Show {d.dismissed.length} dismissed</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
