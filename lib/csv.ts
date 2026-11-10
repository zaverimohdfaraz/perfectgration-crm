/**
 * Text that Excel would run as a formula (=, +, -, @, tab, carriage return at the start) gets an apostrophe in front,
 * so it is shown as plain text. Numbers are left alone.
 */
export function safeCell(v: string | number): string | number {
  return typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

/** Real browser download of a CSV file. Opens in Excel. Proper .xlsx export arrives with the backend. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(safeCell(v)).replace(/"/g, '""')}"`;
  const text = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
