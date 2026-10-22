"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { btn } from "@/lib/styles";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-semibold text-brand-deep">{eyebrow}</p>}
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink md:text-[28px] md:leading-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Button({
  variant = "primary", children, onClick, type = "button", disabled, ariaLabel,
}: { variant?: keyof typeof btn; children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; ariaLabel?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={btn[variant]}>{children}</button>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: keyof typeof btn }) {
  return <Link href={href} className={btn[variant]}>{children}</Link>;
}

export function Panel({
  title, description, action, children, flush = false, id, className = "",
}: { title?: string; description?: string; action?: ReactNode; children: ReactNode; flush?: boolean; id?: string; className?: string }) {
  return (
    <section id={id} className={`rounded-xl border border-line bg-white ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "blue", icon }: { label: string; value: number | string; hint?: string; tone?: "blue" | "red" | "amber" | "green"; icon?: ReactNode }) {
  const chip = { blue: "bg-brand-soft text-brand-deep", red: "bg-red-100 text-red-800", amber: "bg-amber-100 text-amber-900", green: "bg-green-100 text-green-800" }[tone];
  return (
    <div className="flex items-start gap-4 rounded-xl border border-line bg-white p-5">
      {icon && <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${chip}`}>{icon}</span>}
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="max-w-md text-sm text-ink-muted">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const sz = size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-deep ${sz}`}>{initials}</span>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full max-w-48 overflow-hidden rounded-full bg-brand-soft">
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="w-11 text-sm font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" aria-label="Sections" className="-mx-1 flex overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-[15px] font-semibold ${on ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {t.label}
            {t.count !== undefined && <span className={`rounded-full px-2 text-xs ${on ? "bg-brand-soft text-brand-deep" : "bg-slate-100 text-ink-muted"}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Small reminder that changes in this preview are not stored. */
export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-ink-muted">{children}</p>;
}
