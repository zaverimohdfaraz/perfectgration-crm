"use client";

import { useState } from "react";
import { Pin, PinOff, Plus } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { Pill } from "@/components/status";
import { DeptChip } from "@/components/department";
import { TeamNoteDialog } from "@/components/dialogs-admin";
import { ConfirmDialog } from "@/components/modal";
import { useDemo } from "@/lib/store";
import { VISA_TYPES, type TeamNote } from "@/lib/demo-data";
import { visibleNotes } from "@/lib/permissions";
import { fmtDate } from "@/lib/dates";
import { btn, field } from "@/lib/styles";

export default function NotepadPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [aud, setAud] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [edit, setEdit] = useState<TeamNote | "new" | null>(null);
  const [del, setDel] = useState<TeamNote | null>(null);

  const mine = visibleNotes(d.user, d.teamNotes);
  const cats = [...new Set(mine.map((n) => n.category))];
  const needle = q.trim().toLowerCase();
  const forMe = (n: TeamNote) => n.people.includes(d.user.id) || n.departments.some((t) => d.user.teams.includes(t));

  const list = mine
    .filter((n) => !cat || n.category === cat)
    .filter((n) => !needle || `${n.title} ${n.content}`.toLowerCase().includes(needle))
    .filter((n) => {
      if (!aud) return true;
      if (aud === "everyone") return n.departments.length === 0 && n.people.length === 0;
      if (aud === "forme") return forMe(n);
      if (aud === "mine") return n.author === d.user.name;
      if (aud.startsWith("dept:")) return n.departments.includes(aud.slice(5) as never);
      return true;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  const count = Math.max(1, Math.ceil(list.length / size));
  const safe = Math.min(page, count);
  const rows = list.slice((safe - 1) * size, safe * size);
  const nameOf = (id: string) => d.users.find((u) => u.id === id)?.name ?? "Former member";

  return (
    <div>
      <PageHeader eyebrow="Internal" title="Team Notepad" description="Shared guidance for the team. Choose who each note is for. Internal only, never shown to clients or included in client documents."
        actions={<Button onClick={() => setEdit("new")}><Plus size={18} aria-hidden /> New note</Button>} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1"><label htmlFor="nt-q" className="mb-1 block text-sm font-semibold">Search</label><input id="nt-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Title or text" /></div>
        <div><label htmlFor="nt-aud" className="mb-1 block text-sm font-semibold">Audience</label>
          <select id="nt-aud" className={field} value={aud} onChange={(e) => { setAud(e.target.value); setPage(1); }}>
            <option value="">All notes I can see</option><option value="everyone">For everyone</option>{d.user.role === "consultant" && <option value="forme">For me or my departments</option>}<option value="mine">Written by me</option>
            {VISA_TYPES.map((v) => <option key={v.id} value={`dept:${v.id}`}>{v.label} department</option>)}
          </select>
        </div>
        <div><label htmlFor="nt-cat" className="mb-1 block text-sm font-semibold">Category</label><select id="nt-cat" className={field} value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
      </form>

      {rows.length === 0 ? (
        <Panel><EmptyState title="No notes found" body="Change the filters, or add a note to share guidance with the team.">
          <button type="button" className={btn.secondary} onClick={() => { setQ(""); setCat(""); setAud(""); }}>Clear filters</button>
        </EmptyState></Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((n) => {
              const canEdit = n.author === d.user.name || d.user.role === "admin";
              const everyone = n.departments.length === 0 && n.people.length === 0;
              return (
                <article key={n.id} className={`flex min-w-0 flex-col rounded-xl border p-5 ${n.pinned ? "border-brand bg-brand-tint" : "border-line bg-white"}`}>
                  <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{n.title}</h2>{n.pinned && <Pill tone="info">Pinned</Pill>}</div>
                  <p className="mt-1 text-sm text-ink-muted">{n.category}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Who this note is for">
                    <span className="text-sm font-medium text-ink-muted">For:</span>
                    {everyone ? <Pill tone="neutral">Everyone</Pill> : (<>{n.departments.map((t) => <DeptChip key={t} team={t} />)}{n.people.map((id) => <Pill key={id} tone="neutral">{nameOf(id)}</Pill>)}</>)}
                  </div>
                  <p className="mt-3 max-w-prose whitespace-pre-line break-words text-[15px] leading-relaxed">{n.content}</p>
                  <p className="mt-auto pt-4 text-sm text-ink-muted">{n.author} · Updated {fmtDate(n.updatedAt)}</p>
                  {canEdit && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => { d.updateTeamNote(n.id, { pinned: !n.pinned }); d.toast(n.pinned ? "Note unpinned. (Demo: not saved.)" : "Note pinned. (Demo: not saved.)", "info"); }}>{n.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}{n.pinned ? "Unpin" : "Pin"}</button>
                      <button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => setEdit(n)}>Edit</button>
                      <button type="button" className={`${btn.ghost} !min-h-10 text-sm !text-red-800 hover:!bg-red-50`} onClick={() => setDel(n)}>Delete</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-white"><Pager page={safe} pageSize={size} total={list.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[6, 12, 24]} /></div>
        </>
      )}

      {edit && <TeamNoteDialog note={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {del && <ConfirmDialog title="Delete this note?" body={`“${del.title}” will be removed for everyone it was shared with.`} confirmLabel="Delete note" danger onConfirm={() => { d.deleteTeamNote(del.id); d.toast("Note deleted. (Demo: not saved.)"); }} onClose={() => setDel(null)} />}
    </div>
  );
}
