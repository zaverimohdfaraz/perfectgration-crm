"use client";

import { useRef, useState } from "react";
import type { PublicLinkInfo } from "@/lib/server/public-links";

const MAX = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

type Row = { key: string; name: string; item?: string; status: "uploading" | "done" | "error"; error?: string };

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso));

function typeOf(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt = TYPES[ext];
  if (!byExt) return null;
  return file.type && Object.values(TYPES).includes(file.type) ? file.type : byExt;
}

async function post<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "The upload failed. Please try again.");
  return json as T;
}

export function ClientUploader({ token, info, live }: { token: string; info: PublicLinkInfo; live: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [closed, setClosed] = useState<string | null>(null);
  const seq = useRef(0);
  const doneItems = new Set([...info.received.map((r) => r.item), ...rows.filter((r) => r.status === "done").map((r) => r.item)].filter(Boolean));

  const update = (key: string, patch: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function upload(file: File, item?: string) {
    const key = `r${++seq.current}`;
    setRows((l) => [...l, { key, name: file.name, item, status: "uploading" }]);
    const contentType = typeOf(file);
    if (!contentType) return update(key, { status: "error", error: "Only PDF, JPG, PNG or WEBP files are accepted." });
    if (file.size > MAX) return update(key, { status: "error", error: "This file is larger than 10 MB." });
    if (file.size === 0) return update(key, { status: "error", error: "This file is empty." });
    if (!live) {
      await new Promise((r) => setTimeout(r, 600));
      return update(key, { status: "done" });
    }
    try {
      const { url, ticket } = await post<{ url: string; ticket: string }>(`/api/public/upload-links/${encodeURIComponent(token)}/presign`, { fileName: file.name, contentType, size: file.size, item });
      const put = await fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!put.ok) throw new Error("The file could not be sent. Please check your connection and try again.");
      await post(`/api/public/upload-links/${encodeURIComponent(token)}/complete`, { ticket });
      update(key, { status: "done" });
    } catch (e) {
      const msg = (e as Error).message;
      update(key, { status: "error", error: msg });
      if (/expired|closed|no longer open/i.test(msg)) setClosed(msg);
    }
  }

  const pick = (files: FileList | null, item?: string) => { if (files) for (const f of Array.from(files).slice(0, 10)) void upload(f, item); };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{info.firstName ? `Hello ${info.firstName},` : "Hello,"}</h1>
        <p className="mt-2 text-base text-ink-muted sm:text-lg">{info.company} has asked you to upload the documents below for your application.</p>
        {info.message && <p className="mt-4 rounded-xl bg-brand-soft p-4 text-base text-ink">{info.message}</p>}
        {info.expiresAt && <p className="mt-4 text-sm font-medium text-ink-muted">This link is open until {fmt(info.expiresAt)} (Riyadh time).</p>}
        {!live && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Demo preview: files are checked but not stored.</p>}
      </section>

      {closed && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900">{closed}</div>}

      <section className="rounded-2xl border border-line bg-white" aria-labelledby="req">
        <h2 id="req" className="border-b border-line px-6 py-4 text-lg font-bold">What to upload</h2>
        <ul className="divide-y divide-line">
          {info.requested.map((item, i) => {
            const done = doneItems.has(item);
            return (
              <li key={item} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold">{item}</p>
                  <p className={`text-sm ${done ? "font-medium text-green-800" : "text-ink-muted"}`}>{done ? "Received. You can add more pages if needed." : "Waiting for your file"}</p>
                </div>
                <label className={`inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-5 text-base font-semibold focus-within:ring-4 focus-within:ring-brand/30 ${done || closed ? "border border-line bg-white text-ink hover:bg-brand-tint" : "bg-brand text-ink-on hover:bg-brand-hover"}`}>
                  {done ? "Add another file" : "Choose file"}
                  <input type="file" accept={ACCEPT} multiple disabled={!!closed} className="sr-only" aria-label={`Upload ${item}`} id={`up-${i}`} onChange={(e) => { pick(e.target.files, item); e.target.value = ""; }} />
                </label>
              </li>
            );
          })}
          <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold">{info.requested.length ? "Anything else" : "Your documents"}</p>
              <p className="text-sm text-ink-muted">PDF, JPG, PNG or WEBP, up to 10 MB each.</p>
            </div>
            <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-5 text-base font-semibold text-ink hover:bg-brand-tint focus-within:ring-4 focus-within:ring-brand/30">
              Choose files
              <input type="file" accept={ACCEPT} multiple disabled={!!closed} className="sr-only" aria-label="Upload other files" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            </label>
          </li>
        </ul>
      </section>

      {(rows.length > 0 || info.received.length > 0) && (
        <section className="rounded-2xl border border-line bg-white" aria-labelledby="sent" aria-live="polite">
          <h2 id="sent" className="border-b border-line px-6 py-4 text-lg font-bold">Your uploads</h2>
          <ul className="divide-y divide-line">
            {info.received.map((r, i) => (
              <li key={`old-${i}`} className="flex items-center justify-between gap-3 px-6 py-3 text-base"><span className="min-w-0 truncate">{r.name}</span><span className="shrink-0 text-sm font-medium text-green-800">Received</span></li>
            ))}
            {rows.map((r) => (
              <li key={r.key} className="px-6 py-3 text-base">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{r.name}{r.item ? <span className="text-ink-muted"> · {r.item}</span> : null}</span>
                  <span className={`shrink-0 text-sm font-medium ${r.status === "done" ? "text-green-800" : r.status === "error" ? "text-red-800" : "text-ink-muted"}`}>{r.status === "done" ? "Received" : r.status === "error" ? "Not sent" : "Uploading…"}</span>
                </div>
                {r.error && <p className="mt-1 text-sm text-red-800">{r.error}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
