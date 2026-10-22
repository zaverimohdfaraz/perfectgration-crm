import Link from "next/link";
import { PageTitle, Card, EmptyState } from "@/components/ui";
import { DeadlineText } from "@/components/status";
import { requireUser } from "@/lib/session";
import { caseById, clientById, userById } from "@/lib/demo-data";
import { tasksFor } from "@/lib/insights";

export default function TasksPage() {
  const user = requireUser();
  const tasks = tasksFor(user).sort((a, b) => a.deadline.localeCompare(b.deadline));

  return (
    <div>
      <PageTitle title="Partner tasks" subtitle="Things you are waiting on from universities, employers and other partners." />
      {tasks.length === 0 ? (
        <Card><EmptyState title="No tasks right now" body="Tasks assigned to you will appear here." /></Card>
      ) : (
        <ul className="space-y-4">
          {tasks.map((t) => {
            const c = caseById(t.caseId);
            return (
              <li key={t.id} className="rounded-lg border border-line bg-white p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-bold">{t.title}</p>
                    <p className="text-ink-muted">{t.partner} · {clientById(c?.clientId ?? "")?.name} · {c?.ref}</p>
                    <p className="text-ink-muted">Assigned to {userById(t.assigneeId)?.name}</p>
                  </div>
                  <DeadlineText iso={t.deadline} />
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-base font-semibold">
                    <span>Progress</span>
                    <span>{t.progress}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-brand-soft" role="progressbar" aria-label={`Progress for ${t.title}`} aria-valuenow={t.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
                {c && <Link href={`/cases/${c.id}`} className="mt-5 inline-flex min-h-12 items-center font-semibold text-brand-deep hover:underline">Open the case</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
