/** Date helpers for <input type="date">. */
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
export const fromDateInput = (v: string) => new Date(`${v}T12:00:00+03:00`).toISOString();

export const NATIONALITIES = ["Saudi", "Pakistani", "Egyptian", "Indian", "Jordanian", "Filipino", "Sudanese", "Yemeni", "Syrian", "Bangladeshi", "Other"];
export const digits = (s: string) => s.replace(/\D/g, "");
/** <input type="datetime-local"> works in local wall time; the CRM works in Riyadh time (UTC+3). */
export const toDateTimeInput = (iso: string) => new Date(Date.parse(iso) + 3 * 3_600_000).toISOString().slice(0, 16);
export const fromDateTimeInput = (v: string) => (v ? new Date(`${v}:00+03:00`).toISOString() : "");
