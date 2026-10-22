"use client";

import type { ReactNode } from "react";

export function Field({ label, htmlFor, hint, error, required, children }: { label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-sm font-medium text-red-800">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-brand" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
