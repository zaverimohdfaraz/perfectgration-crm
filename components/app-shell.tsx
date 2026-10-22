"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Briefcase, Handshake, LayoutDashboard, ListChecks, LogOut, Menu, NotebookPen, Search, Settings, UserCog, Users, Workflow, X,
} from "@/components/icons";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { NAV_ITEMS } from "@/lib/nav";
import { ROLE_LABEL, visaLabel } from "@/lib/demo-data";
import { useDemo } from "@/lib/store";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard, "/cases": Briefcase, "/clients": Users, "/partner-tasks": ListChecks, "/notepad": NotebookPen,
  "/reports": BarChart3, "/team": UserCog, "/agents": Handshake, "/workflow": Workflow, "/settings": Settings,
};

export function AppShell({ signOutAction, children }: { signOutAction: () => Promise<void>; children: ReactNode }) {
  const { user } = useDemo();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));
  const groups = ["Workspace", "Management", "Administration"].map((g) => ({ g, items: items.filter((i) => i.group === g) })).filter((x) => x.items.length > 0);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const sidebar = (onNavigate?: () => void) => (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Perfectgration dashboard"><Logo className="h-8" /></Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto p-3">
        {groups.map(({ g, items: gi }) => (
          <div key={g}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{g}</p>
            <ul className="space-y-0.5">
              {gi.map((i) => {
                const Icon = ICONS[i.href] ?? LayoutDashboard;
                const active = isActive(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${active ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-brand-tint hover:text-ink"}`}
                    >
                      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand" />}
                      <Icon size={20} aria-hidden className={active ? "text-brand-deep" : ""} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-line p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-ink-on">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink-muted">{ROLE_LABEL[user.role]}</p>
            {user.role === "consultant" && <p className="truncate text-xs font-semibold text-brand-deep">{user.teams.map((t) => visaLabel(t)).join(" · ")} team</p>}
          </div>
        </div>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-[15px] font-medium hover:bg-brand-tint">
            <LogOut size={18} aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white lg:flex print:hidden">{sidebar()}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-tint"><X size={20} aria-hidden /></button>
            {sidebar(() => setOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-4 md:px-8 print:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-brand-tint lg:hidden"><Menu size={22} aria-hidden /></button>
          <form action="/cases" role="search" className="relative min-w-0 max-w-md flex-1">
            <label htmlFor="global-search" className="sr-only">Search clients or case references</label>
            <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input id="global-search" name="q" type="search" placeholder="Search clients or case numbers" className="h-10 w-full rounded-lg border border-line bg-brand-tint pl-10 pr-3 text-[15px] placeholder:text-ink-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 xl:inline">Demo mode · changes are not saved</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 xl:hidden">Demo</span>
            <NotificationBell />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-5 sm:py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
