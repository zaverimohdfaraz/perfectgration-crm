/** Shared class names. Plain strings so server and client files can both use them. */
export const field =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-brand-tint disabled:text-ink-muted";
export const area =
  "min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
export const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btn = {
  primary: `${btnBase} bg-brand text-ink-on hover:bg-brand-hover`,
  secondary: `${btnBase} bg-white text-ink ring-1 ring-inset ring-line hover:bg-brand-tint`,
  danger: `${btnBase} bg-red-700 text-white hover:bg-red-800`,
  ghost: `${btnBase} text-brand-deep hover:bg-brand-soft`,
};
export const th = "px-4 py-3 text-left text-sm font-semibold text-ink-muted";
export const td = "px-4 py-3 align-top";
