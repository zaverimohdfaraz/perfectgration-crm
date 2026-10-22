/** Date helpers for <input type="date">. */
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
export const fromDateInput = (v: string) => new Date(`${v}T12:00:00+03:00`).toISOString();

export const NATIONALITIES = ["Saudi", "Pakistani", "Egyptian", "Indian", "Jordanian", "Filipino", "Sudanese", "Yemeni", "Syrian", "Bangladeshi", "Other"];
export const digits = (s: string) => s.replace(/\D/g, "");
