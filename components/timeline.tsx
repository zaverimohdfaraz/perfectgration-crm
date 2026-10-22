export function Timeline({ items, empty = "Nothing recorded yet." }: { items: { id: string; title: string; meta: string; body?: string }[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ol className="relative ml-2 border-l-2 border-brand-soft pl-6">
      {items.map((i) => (
        <li key={i.id} className="relative pb-5 last:pb-0">
          <span aria-hidden className="absolute -left-[33px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand ring-1 ring-brand/40" />
          <p className="font-medium text-ink">{i.title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{i.meta}</p>
          {i.body && <p className="mt-1.5 text-[15px] text-ink">{i.body}</p>}
        </li>
      ))}
    </ol>
  );
}
