"use client";

import { btn } from "@/lib/styles";

function pageList(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(count - 1, page + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < count - 1) out.push("…");
  out.push(count);
  return out;
}

export function Pager({
  page, pageSize, total, onPage, onPageSize, sizes = [10, 25, 50],
}: { page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize: (n: number) => void; sizes?: number[] }) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <span>Showing {from}–{to} of {total}</span>
        <label className="flex items-center gap-2">
          <span className="sr-only sm:not-sr-only">Rows</span>
          <select aria-label="Rows per page" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink">
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={`${btn.ghost} !min-h-9 px-3`} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <ul className="hidden items-center gap-1 sm:flex">
          {pageList(page, count).map((p, i) =>
            p === "…" ? (
              <li key={`e${i}`} className="px-1 text-ink-muted" aria-hidden>…</li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => onPage(p)}
                  className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold ${p === page ? "bg-brand text-ink-on" : "text-ink hover:bg-brand-tint"}`}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ul>
        <span className="px-2 text-sm text-ink-muted sm:hidden">Page {page} of {count}</span>
        <button type="button" className={`${btn.ghost} !min-h-9 px-3`} disabled={page >= count} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
