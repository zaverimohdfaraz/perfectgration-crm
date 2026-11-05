"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui";
import { Modal, ModalActions } from "@/components/modal";
import { Field } from "@/components/form";
import { Pager } from "@/components/pagination";
import { Pill } from "@/components/status";
import { useDemo } from "@/lib/store";
import { PRIORITY_LABEL, userById, type Priority, type Todo } from "@/lib/demo-data";
import { canManageTodo, isAdmin } from "@/lib/permissions";
import { TODAY, deadlineState, fmtDate } from "@/lib/dates";
import { fromDateInput, toDateInput } from "@/lib/forms";

const isToday = (iso: string | null) => !!iso && new Date(iso).toDateString() === TODAY.toDateString();
import { area, btn, field } from "@/lib/styles";

export default function TodoPage() {
  const d = useDemo();
  const admin = isAdmin(d.user);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("open");
  const [person, setPerson] = useState(admin ? "all" : d.user.id);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [editing, setEditing] = useState<Todo | "new" | null>(null);
  const [removing, setRemoving] = useState<Todo | null>(null);

  const mine = useMemo(() => d.todos.filter((t) => admin || t.ownerId === d.user.id), [d.todos, d.user.id, admin]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return mine
      .filter((t) => (person === "all" ? true : t.ownerId === person))
      .filter((t) => {
        const st = isToday(t.due) ? "today" : deadlineState(t.due);
        if (show === "open") return !t.done;
        if (show === "done") return t.done;
        if (show === "overdue") return !t.done && st === "overdue";
        if (show === "today") return !t.done && st === "today";
        return true;
      })
      .filter((t) => !needle || t.title.toLowerCase().includes(needle) || (t.notes ?? "").toLowerCase().includes(needle))
      .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  }, [mine, q, show, person]);
  const rows = list.slice((page - 1) * size, page * size);
  const open = mine.filter((t) => !t.done).length;
  const overdue = mine.filter((t) => !t.done && deadlineState(t.due) === "overdue" && !isToday(t.due)).length;
  const staff = d.users.filter((u) => !u.inactive);

  return (
    <>
      <PageHeader title="To-Do List" description={admin ? "Everyone's tasks. You can add, edit and delete for any team member." : "Your own tasks. Only you and the administrator can see them."}
        actions={<Button onClick={() => setEditing("new")}><Plus size={18} aria-hidden /> Add task</Button>} />

      <div className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2 xl:col-span-1"><label htmlFor="td-q" className="mb-1 block text-sm font-semibold">Search</label><input id="td-q" type="search" className={field} placeholder="Task or note" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div><label htmlFor="td-show" className="mb-1 block text-sm font-semibold">Show</label>
          <select id="td-show" className={field} value={show} onChange={(e) => { setShow(e.target.value); setPage(1); }}><option value="open">Open</option><option value="today">Due today</option><option value="overdue">Overdue</option><option value="done">Done</option><option value="all">All</option></select></div>
        {admin && (
          <div><label htmlFor="td-person" className="mb-1 block text-sm font-semibold">Person</label>
            <select id="td-person" className={field} value={person} onChange={(e) => { setPerson(e.target.value); setPage(1); }}><option value="all">Everyone</option>{staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        )}
        <div className="flex items-end gap-2 text-sm"><Pill tone="info">{open} open</Pill>{overdue > 0 && <Pill tone="danger">{overdue} overdue</Pill>}</div>
      </div>

      <Panel title="Tasks" flush>
        {rows.length === 0 ? (
          <div className="p-5"><EmptyState title="Nothing here" body="No tasks match this view. Add one with the button above." /></div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((t) => {
              const st = isToday(t.due) ? "today" : deadlineState(t.due);
              const can = canManageTodo(d.user, t.ownerId);
              return (
                <li key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
                  <button type="button" aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`} disabled={!can} onClick={() => d.updateTodo(t.id, { done: !t.done })}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${t.done ? "border-brand bg-brand text-white" : "border-line bg-white"} disabled:opacity-50`}>{t.done && <Check size={16} aria-hidden />}</button>
                  <div className="min-w-0 flex-1">
                    <p className={`break-words font-semibold ${t.done ? "text-ink-muted line-through" : ""}`}>{t.title}</p>
                    {t.notes && <p className="mt-0.5 break-words text-sm text-ink-muted">{t.notes}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {t.due ? <Pill tone={t.done ? "neutral" : st === "overdue" ? "danger" : st === "today" ? "warning" : "info"}>{t.done ? "Due" : st === "overdue" ? "Overdue" : st === "today" ? "Due today" : "Due"} {fmtDate(t.due)}</Pill> : <Pill>No date</Pill>}
                      {t.priority !== "normal" && <Pill tone={t.priority === "urgent" ? "danger" : "warning"}>{PRIORITY_LABEL[t.priority]}</Pill>}
                      {admin && <span className="text-ink-muted">For {userById(t.ownerId)?.name}{t.createdBy !== t.ownerId ? ` · added by ${userById(t.createdBy)?.name}` : ""}</span>}
                      {t.caseId && <span className="text-ink-muted">Linked to a case</span>}
                    </div>
                  </div>
                  {can && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label={`Edit ${t.title}`} onClick={() => setEditing(t)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-brand-tint"><Pencil size={18} aria-hidden /></button>
                      <button type="button" aria-label={`Delete ${t.title}`} onClick={() => setRemoving(t)} className="flex h-11 w-11 items-center justify-center rounded-lg text-red-800 hover:bg-red-50"><Trash2 size={18} aria-hidden /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Pager total={list.length} page={page} pageSize={size} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
      </Panel>

      {editing && <TodoDialog todo={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {removing && (
        <Modal title="Delete this task?" description={removing.title} onClose={() => setRemoving(null)}>
          <ModalActions>
            <button type="button" className={btn.secondary} onClick={() => setRemoving(null)}>Keep it</button>
            <button type="button" className={btn.danger} onClick={() => { d.deleteTodo(removing.id); d.toast("Task deleted. (Demo: not saved.)"); setRemoving(null); }}>Delete</button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
}

function TodoDialog({ todo, onClose }: { todo: Todo | null; onClose: () => void }) {
  const d = useDemo();
  const admin = isAdmin(d.user);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [notes, setNotes] = useState(todo?.notes ?? "");
  const [due, setDue] = useState(toDateInput(todo?.due ?? null));
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? "normal");
  const [ownerId, setOwnerId] = useState(todo?.ownerId ?? d.user.id);
  const [err, setErr] = useState("");

  const save = () => {
    if (!title.trim()) { setErr("Enter a title for the task."); return; }
    const data = { title: title.trim(), notes: notes.trim() || undefined, due: due ? fromDateInput(due) : null, priority, ownerId: admin ? ownerId : d.user.id };
    if (todo) d.updateTodo(todo.id, data); else d.addTodo(data);
    d.toast(todo ? "Task updated. (Demo: not saved.)" : "Task added. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title={todo ? "Edit task" : "Add task"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate className="space-y-4">
        <Field label="Task" htmlFor="tdd-title" required error={err}><input id="tdd-title" className={field} value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} /></Field>
        <Field label="Notes" htmlFor="tdd-notes" hint="Optional."><textarea id="tdd-notes" className={area} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date" htmlFor="tdd-due"><input id="tdd-due" type="date" className={field} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Priority" htmlFor="tdd-prio"><select id="tdd-prio" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
        </div>
        {admin && (
          <Field label="For" htmlFor="tdd-owner" hint="As administrator you can add tasks for anyone."><select id="tdd-owner" className={field} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>{d.users.filter((u) => !u.inactive).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        )}
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary}>{todo ? "Save task" : "Add task"}</button></ModalActions>
      </form>
    </Modal>
  );
}
