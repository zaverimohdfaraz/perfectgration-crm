
import { PageHeader, Button, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { TEAM_NOTES } from "@/lib/demo-data";
import { fmtDate } from "@/lib/dates";

export default function NotesPage() {
  requireUser();

  const notes = [...TEAM_NOTES].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned)
  );

  return (
    <div>
      <PageHeader
        title="Team notes"
        description="Shared guidance for the team. Only staff can see these."
        actions={<Button disabled>New note</Button>}
      />

      {notes.length === 0 ? (
        <div className="rounded-xl border border-line bg-white">
          <EmptyState
            title="No team notes yet"
            body="Shared guidance and important notes will appear here."
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {notes.map((n) => (
            <article
              key={n.id}
              className={`rounded-xl border p-6 ${
                n.pinned
                  ? "border-brand bg-brand-tint"
                  : "border-line bg-white"
              }`}
            >
              {n.pinned && (
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-deep">
                  Pinned
                </p>
              )}

              <h2 className="text-xl font-bold text-ink">{n.title}</h2>

              <p className="mt-3 text-lg leading-relaxed text-ink">
                {n.content}
              </p>

              <p className="mt-4 text-sm text-ink-muted">
                {n.author} · {fmtDate(n.updatedAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
