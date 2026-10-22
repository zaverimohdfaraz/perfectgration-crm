"use client";

import { useState } from "react";
import { Pin, PinOff, Plus } from "lucide-react";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui";
import { Pill } from "@/components/status";
import { TeamNoteDialog } from "@/components/dialogs-admin";
import { ConfirmDialog } from "@/components/modal";
import { useDemo } from "@/lib/store";
import { fmtDate } from "@/lib/dates";
import { btn, field } from "@/lib/styles";
import type { TeamNote } from "@/lib/demo-data";

export default function NotepadPage() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState<TeamNote | "new" | null>(null);
  const [del, setDel] = useState<TeamNote | null>(null);

  const cats = [...new Set(d.teamNotes.map((n) => n.category))];
  const needle = q.trim().toLowerCase();
  const notes = d.teamNotes
    .filter((n) => (!cat || n.category === cat) && (!needle || `${n.title} ${n.content}`.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <PageHeader eyebrow="Internal" title="Team Notepad" description="Shared guidance for the team. Internal only, never shown to clients or included in client documents."
        actions={<Button onClick={() => setEdit("new")}><Plus size={18} aria-hidden /> New note</Button>} />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div><label htmlFor="nt-q" className="mb-1 block text-sm font-semibold">Search</label><input id="nt-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or text" /></div>
        <div><label htmlFor="nt-cat" className="mb-1 block text-sm font-semibold">Category</label><select id="nt-cat" className={field} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
      </form>

      {notes.length === 0 ? (
        <Panel><EmptyState title="No notes found" body="Add a note to share guidance with the team." /></Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {notes.map((n) => {
            const mine = n.author === d.user.name || d.user.role === "admin";
            return (
              <article key={n.id} className={`flex flex-col rounded-xl border p-5 ${n.pinned ? "border-brand bg-brand-tint" : "border-line bg-white"}`}>
                <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{n.title}</h2>{n.pinned && <Pill tone="info">Pinned</Pill>}</div>
                <p className="mt-1 text-sm text-ink-muted">{n.category}</p>
                <p className="mt-3 max-w-prose whitespace-pre-line text-[15px] leading-relaxed">{n.content}</p>
                <p className="mt-auto pt-4 text-sm text-ink-muted">{n.author} · Updated {fmtDate(n.updatedAt)}</p>
                {mine && (
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
      )}

      {edit && <TeamNoteDialog note={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {del && <ConfirmDialog title="Delete this note?" body={`“${del.title}” will be removed for everyone on the team.`} confirmLabel="Delete note" danger onConfirm={() => { d.deleteTeamNote(del.id); d.toast("Note deleted. (Demo: not saved.)"); }} onClose={() => setDel(null)} />}
    </div>
  );
}
