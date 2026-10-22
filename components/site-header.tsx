"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import type { NavItem } from "@/lib/nav";
import type { Alert } from "@/lib/insights";

type Props = {
  items: NavItem[];
  alerts: Alert[];
  userName: string;
  roleLabel: string;
  signOutAction: () => Promise<void>;
};

export function SiteHeader({ items, alerts, userName, roleLabel, signOutAction }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="h-1 bg-brand" aria-hidden />
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-4 md:px-8">
        <Link href="/dashboard" aria-label="Perfectgration home" className="shrink-0">
          <Logo className="h-11" />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(i.href) ? "page" : undefined}
              className={`inline-flex min-h-12 items-center rounded-xl px-4 text-base font-semibold transition-colors ${
                isActive(i.href) ? "bg-brand text-ink-on" : "text-ink hover:bg-brand-tint"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell alerts={alerts} />
          <div className="hidden pr-2 text-right xl:block">
            <p className="font-semibold leading-tight">{userName}</p>
            <p className="text-sm text-ink-muted">{roleLabel}</p>
          </div>
          <form action={signOutAction} className="hidden lg:block">
            <button type="submit" className="inline-flex min-h-12 items-center rounded-xl border border-line px-4 font-semibold text-ink hover:bg-brand-tint">
              Sign out
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-brand-tint lg:hidden"
          >
            {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 pb-6 pt-3 lg:hidden">
          <nav aria-label="Mobile">
            <ul className="grid gap-1">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive(i.href) ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-xl px-4 text-lg font-semibold ${
                      isActive(i.href) ? "bg-brand text-ink-on" : "text-ink hover:bg-brand-tint"
                    }`}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-semibold">{userName}</p>
              <p className="text-sm text-ink-muted">{roleLabel}</p>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="inline-flex min-h-12 items-center rounded-xl border border-line px-5 font-semibold">Sign out</button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
