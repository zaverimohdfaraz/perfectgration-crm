import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { TEAM_NOTES } from "@/lib/demo-data";
import { fmtDate } from "@/lib/dates";
import { ComingSoon } from "@/components/ui";

export default function NotesPage() {
  requireUser();
  const notes = [...TEAM_NOTES].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div>
      <PageTitle
        title="Team notes"
        subtitle="Shared guidance for the team. Only staff can see these."
        action={<ComingSoon label="New note" />}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {notes.map((n) => (
          <article key={n.id} className={`rounded-lg border p-6 ${n.pinned ? "border-brand bg-brand-tint" : "border-line bg-white"}`}>
            {n.pinned && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-deep">Pinned</p>}
            <h2 className="text-xl font-bold">{n.title}</h2>
            <p className="mt-3 text-lg leading-relaxed">{n.content}</p>
            <p className="mt-4 text-ink-muted">{n.author} · {fmtDate(n.updatedAt)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
