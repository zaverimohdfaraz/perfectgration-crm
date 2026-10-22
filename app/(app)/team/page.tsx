"use client";

import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { PageHeader, Panel, Avatar, Button, EmptyState } from "@/components/ui";
import { Pager } from "@/components/pagination";
import { Pill } from "@/components/status";
import { DEPT, DeptChip, DeptIcon } from "@/components/department";
import { AccessDialog, AddUserDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { ROLE_LABEL, VISA_TYPES, type Role, type TeamId, type User } from "@/lib/demo-data";
import { fmtDate } from "@/lib/dates";
import { btn, field, td, th } from "@/lib/styles";

type Filter = "" | TeamId | "leadership";

function access(u: User) {
  const admin = u.role === "admin";
  const manager = u.role === "manager";
  return [
    { group: "Cases", items: [
      { label: admin || manager ? "Sees cases from every department" : "Sees cases from their own departments only", on: true },
      { label: "Add new cases", on: admin || !!u.canAdd, note: "Can be granted to a person" },
      { label: "Move stages on cases they handle", on: !manager },
    ]},
    { group: "Sensitive data", items: [
      { label: "See commission and final outcomes", on: admin, note: "Administrators only" },
      { label: "Reports and exports", on: admin || manager },
    ]},
    { group: "Administration", items: [
      { label: "Manage people, departments and permissions", on: admin },
      { label: "Agents, workflow setup and settings", on: admin },
      { label: "Reactivate ended cases", on: admin },
    ]},
  ];
}

export default function TeamPage() {
  const d = useDemo();
  const [filter, setFilter] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const [selected, setSelected] = useState(d.users[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const members = d.users.filter((u) => u.role === "consultant");
  const leaders = d.users.filter((u) => u.role !== "consultant");
  const casesOf = (id: string) => d.cases.filter((c) => c.consultantId === id && c.status === "active").length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return d.users.filter((u) => {
      if (filter === "leadership" && u.role === "consultant") return false;
      if (filter && filter !== "leadership" && !(u.role === "consultant" && u.teams.includes(filter))) return false;
      if (role && u.role !== role) return false;
      if (needle && !`${u.name} ${u.email}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [d.users, filter, role, q]);

  const count = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(page, count);
  const pageRows = rows.slice((safe - 1) * size, safe * size);
  const sel = d.users.find((u) => u.id === selected) ?? d.users[0];

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Team" description="Everyone with access, and the department each person works in. Team members see only their own departments."
        actions={<Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden /> Add team member</Button>} />

      <h2 className="mb-3 text-lg font-semibold">Departments</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {VISA_TYPES.map((v) => {
          const x = DEPT[v.id];
          const people = members.filter((u) => u.teams.includes(v.id) && !u.inactive);
          const active = d.cases.filter((c) => c.visa === v.id && c.status === "active").length;
          const on = filter === v.id;
          return (
            <button key={v.id} type="button" aria-pressed={on} onClick={() => { setFilter(on ? "" : v.id); setPage(1); }}
              className={`flex flex-col gap-3 rounded-xl border bg-white p-4 text-left transition-colors hover:bg-brand-tint ${on ? `border-transparent ring-2 ${x.ring}` : "border-line"}`}>
              <div className="flex items-center gap-3"><DeptIcon team={v.id} /><div><p className="text-base font-bold">{x.label}</p><p className="text-sm text-ink-muted">{x.blurb}</p></div></div>
              <div className="flex gap-6 text-sm"><span><strong className="block text-xl tabular-nums">{people.length}</strong><span className="text-ink-muted">{people.length === 1 ? "member" : "members"}</span></span><span><strong className="block text-xl tabular-nums">{active}</strong><span className="text-ink-muted">active cases</span></span></div>
              <p className="min-h-5 truncate text-sm text-ink-muted">{people.map((p) => p.name.split(" ")[0]).join(", ") || "No one assigned yet"}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-3">
            <div className="sm:col-span-1"><label htmlFor="tm-q" className="mb-1 block text-sm font-semibold">Search</label><input id="tm-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name or email" /></div>
            <div><label htmlFor="tm-dept" className="mb-1 block text-sm font-semibold">Department</label><select id="tm-dept" className={field} value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setPage(1); }}><option value="">All departments</option>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}<option value="leadership">Administrators and managers</option></select></div>
            <div><label htmlFor="tm-role" className="mb-1 block text-sm font-semibold">Role</label><select id="tm-role" className={field} value={role} onChange={(e) => { setRole(e.target.value as "" | Role); setPage(1); }}><option value="">All roles</option>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
          </form>

          <Panel flush title={`Members (${rows.length})`}>
            {pageRows.length === 0 ? (
              <EmptyState title="No one matches" body="Try a different department or clear the filters."><button type="button" className={btn.secondary} onClick={() => { setFilter(""); setRole(""); setQ(""); }}>Clear filters</button></EmptyState>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[15px]">
                    <caption className="sr-only">Team members and their departments</caption>
                    <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Person</th><th scope="col" className={th}>Department</th><th scope="col" className={th}>Role</th><th scope="col" className={th}>Active cases</th><th scope="col" className={th}>Status</th><th scope="col" className={th}><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((u) => (
                        <tr key={u.id} className={u.id === sel?.id ? "bg-brand-tint" : "hover:bg-brand-tint/50"}>
                          <td className={td}>
                            <button type="button" onClick={() => setSelected(u.id)} className="flex items-center gap-3 text-left" aria-label={`View access for ${u.name}`}>
                              <Avatar name={u.name} /><span><span className="block font-semibold">{u.name}</span><span className="block text-sm text-ink-muted">{u.email}</span></span>
                            </button>
                          </td>
                          <td className={td}>
                            <div className="flex flex-wrap gap-1.5">
                              {u.role === "consultant" ? (u.teams.length ? u.teams.map((t) => <DeptChip key={t} team={t} />) : <span className="text-ink-muted">None assigned</span>) : <Pill tone="info">All departments</Pill>}
                            </div>
                          </td>
                          <td className={td}>{ROLE_LABEL[u.role]}</td>
                          <td className={`${td} tabular-nums`}>{u.role === "consultant" ? casesOf(u.id) : "—"}</td>
                          <td className={td}><Pill tone={u.inactive ? "neutral" : "success"}>{u.inactive ? "Inactive" : "Active"}</Pill></td>
                          <td className={`${td} text-right`}><button type="button" className={`${btn.secondary} !min-h-10 text-sm`} onClick={() => setEditing(u)}>Edit access</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager page={safe} pageSize={size} total={rows.length} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[10, 25]} />
              </>
            )}
          </Panel>
          <p className="mt-3 text-sm text-ink-muted">{members.length} team members · {leaders.length} administrators and managers</p>
        </div>

        {sel && (
          <Panel title={sel.name} description={`${ROLE_LABEL[sel.role]} · last seen ${fmtDate(sel.lastSeen)}`} className="self-start">
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-ink-muted">Department</p>
              <div className="flex flex-wrap gap-2">{sel.role === "consultant" ? (sel.teams.length ? sel.teams.map((t) => <DeptChip key={t} team={t} large />) : <span className="text-sm text-ink-muted">No department assigned</span>) : <Pill tone="info">All departments</Pill>}</div>
            </div>
            <div className="space-y-5">
              {access(sel).map((g) => (
                <div key={g.group}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{g.group}</h3>
                  <ul className="mt-1 divide-y divide-line">
                    {g.items.map((i) => (
                      <li key={i.label} className="flex items-start justify-between gap-3 py-2.5"><div><p className="text-[15px]">{i.label}</p>{i.note && <p className="text-xs text-ink-muted">{i.note}</p>}</div><Pill tone={i.on ? "success" : "neutral"}>{i.on ? "Yes" : "No"}</Pill></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted"><ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-deep" /> Permissions are enforced on the server, not only in the screens.</p>
            <div className="mt-4"><Button variant="secondary" onClick={() => setEditing(sel)}>Edit access</Button></div>
          </Panel>
        )}
      </div>

      {adding && <AddUserDialog onClose={() => setAdding(false)} />}
      {editing && <AccessDialog user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
