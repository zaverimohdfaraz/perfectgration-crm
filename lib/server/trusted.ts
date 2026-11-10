import mongoose from "mongoose";

/**
 * Marks a query filter written by this code as trusted, so the database safety setting (sanitizeFilter) leaves its
 * operators ($in, $gte, $or, $ne …) alone. Every condition is marked, however deeply it is nested. Never pass user input through this.
 */
export function trust<T>(v: T): T {
  if (Array.isArray(v)) return v.map(trust) as unknown as T;
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = trust(val);
    const hasOperator = Object.keys(v).some((k) => k.startsWith("$"));
    return (hasOperator ? mongoose.trusted(out) : out) as T;
  }
  return v;
}
