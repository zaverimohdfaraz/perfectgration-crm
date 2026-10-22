/** Builds a query-string href, dropping empty values. */
export function buildHref(base: string, params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
