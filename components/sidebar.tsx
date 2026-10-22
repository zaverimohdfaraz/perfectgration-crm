"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, Users, ListChecks, NotebookPen, BarChart3,
  UserCog, Handshake, Workflow, Settings, Menu, X,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { Logo } from "./logo";

const ICONS = {
  dashboard: LayoutDashboard,
  cases: Briefcase,
  clients: Users,
  tasks: ListChecks,
  notes: NotebookPen,
  reports: BarChart3,
  team: UserCog,
  agents: Handshake,
  workflow: Workflow,
  settings: Settings,
} as const;

function NavList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                  active ? "bg-brand-soft text-brand-deep" : "text-ink hover:bg-surface2"
                }`}
              >
                <Icon size={20} aria-hidden className={active ? "text-brand-dark" : "text-ink-muted"} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Logo className="h-9" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface2"
        >
          <Menu size={24} aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo className="h-9" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface2">
                <X size={22} aria-hidden />
              </button>
            </div>
            <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white p-5 md:flex">
        <Logo className="mb-8 h-10 self-start" />
        <NavList items={items} pathname={pathname} />
      </aside>
    </>
  );
}
