import type { ReactNode } from "react";

export function SituationSummary({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <section aria-labelledby="situation-title" className="rounded-xl border border-brand/40 bg-brand-tint p-5">
      <h2 id="situation-title" className="text-lg font-semibold">Current situation</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-sm font-medium text-ink-muted">{i.label}</dt>
            <dd className="mt-1 text-[15px] text-ink">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
