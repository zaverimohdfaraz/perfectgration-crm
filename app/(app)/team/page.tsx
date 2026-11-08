"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "@/components/icons";
import { PageHeader, Panel, Avatar, Button, EmptyState, Tabs } from "@/components/ui";
import { Kpi } from "@/components/hub";
import { Pager } from "@/components/pagination";
import { Pill } from "@/components/status";
import { DEPT, DeptChip, DeptIcon, TeamChip, TeamIcon } from "@/components/department";
import { AccessDialog, AddUserDialog } from "@/components/dialogs-admin";
import { useDemo } from "@/lib/store";
import { OWNER_LABEL, ROLE_LABEL, STAGE_OWNER, VISA_TYPES, type Role, type StageOwner, type TeamId, type User } from "@/lib/demo-data";
import { TODAY, fmtDate } from "@/lib/dates";
import { openIssues } from "@/lib/case-logic";
import { claimable } from "@/lib/permissions";
import { isOnline } from "@/lib/lead-share";
import { btn, field, td, th } from "@/lib/styles";

type Filter = "" | TeamId | StageOwner;

function access(u: User) {
  const admin = u.role === "admin";
  const manager = u.role === "manager";
  const social = u.workTeam === "social";
  return [
    { group: "Cases", items: [
      { label: admin || manager ? "Sees cases from every team and department" : social ? "Sees the leads they created, until someone in Sales accepts them" : "Sees only cases passed to their team and visa department, and the ones they accepted", on: true },
      { label: "Capture leads and add new cases", on: admin || !!u.canAdd || social, note: social ? "Part of the Social Media Team role" : "Can be granted to a person" },
      { label: "Works on cases at the stages their team owns", on: !admin && !manager, note: u.workTeam ? OWNER_LABEL[u.workTeam] + " stages only" : undefined },
    ]},
    { group: "Review and outcome", items: [
      { label: "Approve the review before submission", on: admin || manager },
      { label: "Record the result", on: admin || manager || u.workTeam === "case", note: u.workTeam === "case" ? "Only on cases they accepted" : undefined },
      { label: "Accept a lead or case passed to their team", on: !admin && !manager },
      { label: "Change the assigned sales member or case manager", on: admin, note: "Administrators only" },
      { label: "See commission", on: admin, note: "Administrators only" },
      { label: "Reports and exports", on: admin || manager },
    ]},
    { group: "Administration", items: [
      { label: "Manage people, teams and permissions", on: admin },
      { label: "Agents, workflow setup and settings", on: admin },
      { label: "Reactivate ended cases", on: admin },
      { label: "See and manage everyone's to-do list", on: admin, note: "Everyone else manages only their own" },
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
  const [panel, setPanel] = useState("work");
  const monthStart = Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1) - 3 * 3_600_000;
  const overdue = (c: (typeof d.cases)[number]) => c.status === "active" && !!c.deadline && Date.parse(c.deadline) < TODAY.getTime();
  /** What one person is carrying right now, and what they moved forward this month. */
  const work = (u: User) => {
    const held = d.cases.filter((c) => c.consultantId === u.id && !c.route && c.status === "active");
    return {
      held: held.length,
      overdue: held.filter(overdue).length,
      onHold: d.cases.filter((c) => c.consultantId === u.id && c.status === "on_hold").length,
      problems: held.reduce((n, c) => n + openIssues(c).length, 0),
      waiting: u.role === "consultant" ? claimable(u, d.cases).length : 0,
      moved: d.cases.reduce((n, c) => n + c.history.filter((h) => h.actor === u.name && Date.parse(h.at) >= monthStart && h.from !== h.to && h.kind !== "assign").length, 0),
      accepted: d.cases.reduce((n, c) => n + c.history.filter((h) => h.kind === "claim" && h.actor === u.name && Date.parse(h.at) >= monthStart).length, 0),
      todos: d.todos.filter((t) => t.ownerId === u.id && !t.done).length,
      list: held,
    };
  };
  const activePeople = d.users.filter((u) => !u.inactive);
  const pooled = d.cases.filter((c) => c.status === "active" && c.route).length;
  const allOverdue = d.cases.filter(overdue).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return d.users.filter((u) => {
      if (filter === "leadership" && u.role === "consultant") return false;
      if ((filter === "social" || filter === "sales" || filter === "case") && !(u.role === "consultant" && u.workTeam === filter)) return false;
      if (filter && !["leadership", "social", "sales", "case"].includes(filter) && !(u.role === "consultant" && u.teams.includes(filter as TeamId))) return false;
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active people" value={activePeople.length} hint={`${d.users.length - activePeople.length} inactive`} />
        <Kpi label="Team members" value={members.filter((u) => !u.inactive).length} hint={`${leaders.filter((u) => !u.inactive).length} admins and managers`} />
        <Kpi label="Waiting to be accepted" value={pooled} hint="Passed to a team, nobody has accepted yet" />
        <Kpi label="Overdue cases" value={allOverdue} hint="Past the step deadline" />
      </div>

      <h2 className="mb-1 text-lg font-semibold">Teams</h2>
      <p className="mb-3 text-sm text-ink-muted">Who owns which part of a case. Responsibility moves between teams at each handoff.</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["social", "sales", "case", "leadership"] as StageOwner[]).map((t) => {
          const people = d.users.filter((u) => !u.inactive && (t === "leadership" ? u.role !== "consultant" : u.role === "consultant" && u.workTeam === t));
          const stages = Object.entries(STAGE_OWNER).filter(([, o]) => o === t).length;
          const active = d.cases.filter((c) => c.status === "active" && STAGE_OWNER[c.stage] === t).length;
          const on = filter === t;
          return (
            <button key={t} type="button" aria-pressed={on} onClick={() => { setFilter(on ? "" : t); setPage(1); }}
              className={`flex flex-col gap-3 rounded-xl border bg-white p-4 text-left transition-colors hover:bg-brand-tint ${on ? "border-transparent ring-2 ring-brand" : "border-line"}`}>
              <div className="flex items-center gap-3"><TeamIcon team={t} /><div><p className="text-base font-bold">{OWNER_LABEL[t]}</p><p className="text-sm text-ink-muted">{stages === 1 ? "1 stage" : `${stages} stages`}</p></div></div>
              <div className="flex gap-6 text-sm"><span><strong className="block text-xl tabular-nums">{people.length}</strong><span className="text-ink-muted">{people.length === 1 ? "member" : "members"}</span></span><span><strong className="block text-xl tabular-nums">{active}</strong><span className="text-ink-muted">cases with this team</span></span></div>
              <p className="min-h-5 truncate text-sm text-ink-muted">{people.map((p) => p.name.split(" ")[0]).join(", ") || "No one assigned yet"}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Departments (visa types)</h2>
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

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-3">
            <div className="sm:col-span-1"><label htmlFor="tm-q" className="mb-1 block text-sm font-semibold">Search</label><input id="tm-q" className={field} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name or email" /></div>
            <div><label htmlFor="tm-dept" className="mb-1 block text-sm font-semibold">Team or department</label><select id="tm-dept" className={field} value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setPage(1); }}><option value="">Everyone</option>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}<option value="social">Social Media Team</option><option value="sales">Sales Team</option><option value="case">Case Manager</option><option value="leadership">Admin / Manager</option></select></div>
            <div><label htmlFor="tm-role" className="mb-1 block text-sm font-semibold">Role</label><select id="tm-role" className={field} value={role} onChange={(e) => { setRole(e.target.value as "" | Role); setPage(1); }}><option value="">All roles</option>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
          </form>

          <Panel flush title={`Members (${rows.length})`}>
            {pageRows.length === 0 ? (
              <EmptyState title="No one matches" body="Try a different department or clear the filters."><button type="button" className={btn.secondary} onClick={() => { setFilter(""); setRole(""); setQ(""); }}>Clear filters</button></EmptyState>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-[0.9375rem]">
                    <caption className="sr-only">Team members and their departments</caption>
                    <thead className="border-b border-line bg-brand-tint"><tr><th scope="col" className={th}>Person</th><th scope="col" className={th}>Team</th><th scope="col" className={th}>Department</th><th scope="col" className={th}>Role</th><th scope="col" className={th}>Holding</th><th scope="col" className={th}>Overdue</th><th scope="col" className={th}>Status</th><th scope="col" className={th}><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((u) => (
                        <tr key={u.id} className={u.id === sel?.id ? "bg-brand-tint" : "hover:bg-brand-tint/50"}>
                          <td className={td}>
                            <button type="button" onClick={() => setSelected(u.id)} className="flex items-center gap-3 text-left" aria-label={`View access for ${u.name}`}>
                              <Avatar name={u.name} /><span><span className="block font-semibold">{u.name}{isOnline(u, TODAY.getTime(), d.settings.onlineMinutes) && <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-semibold text-green-800"><span aria-hidden className="h-2 w-2 rounded-full bg-green-600" />Online</span>}</span><span className="block text-sm text-ink-muted">{u.email}</span></span>
                            </button>
                          </td>
                          <td className={td}>{u.role === "consultant" ? (u.workTeam ? <TeamChip team={u.workTeam} /> : <span className="text-ink-muted">Not set</span>) : <TeamChip team="leadership" />}</td>
                          <td className={td}>
                            <div className="flex flex-wrap gap-1.5">
                              {u.role === "consultant" ? (u.teams.length ? u.teams.map((t) => <DeptChip key={t} team={t} />) : <span className="text-ink-muted">None assigned</span>) : <Pill tone="info">All departments</Pill>}
                            </div>
                          </td>
                          <td className={td}>{ROLE_LABEL[u.role]}</td>
                          <td className={`${td} tabular-nums`}>{u.role === "consultant" ? casesOf(u.id) : "—"}</td>
                          <td className={`${td} tabular-nums`}>{u.role === "consultant" ? (() => { const n = work(u).overdue; return n ? <span className="font-semibold text-red-800">{n}</span> : 0; })() : "—"}</td>
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
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-ink-muted">Team</p>
              <div className="flex flex-wrap gap-2">{sel.role === "consultant" ? (sel.workTeam ? <TeamChip team={sel.workTeam} /> : <span className="text-sm text-ink-muted">Not set</span>) : <TeamChip team="leadership" />}</div>
            </div>
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-ink-muted">Department</p>
              <div className="flex flex-wrap gap-2">{sel.role === "consultant" ? (sel.teams.length ? sel.teams.map((t) => <DeptChip key={t} team={t} large />) : <span className="text-sm text-ink-muted">No department assigned</span>) : <Pill tone="info">All departments</Pill>}</div>
            </div>
            <Tabs tabs={[{ id: "work", label: "Work" }, { id: "access", label: "Access" }]} value={panel} onChange={setPanel} />
            <div className="mt-4" role="tabpanel" id={`panel-${panel}`} aria-labelledby={`tab-${panel}`}>
            {panel === "work" && (() => {
              const w = work(sel);
              return (
                <div>
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      ["Holding now", w.held], ["Overdue", w.overdue], ["Open problems", w.problems], ["On hold", w.onHold],
                      ["Steps moved this month", w.moved], ["Accepted this month", w.accepted], ["Waiting for them to accept", w.waiting], ["Open to-dos", w.todos],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-line p-3"><dt className="text-sm text-ink-muted">{k}</dt><dd className="mt-1 text-xl font-bold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-ink-muted">Cases they hold</h3>
                  {w.list.length === 0 ? <p className="text-sm text-ink-muted">None right now.</p> : (
                    <ul className="divide-y divide-line">
                      {w.list.slice(0, 8).map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[0.9375rem]">
                          <Link href={`/cases/${c.id}`} className="min-w-0 truncate font-medium text-brand-deep hover:underline">{c.ref} · {d.clients.find((x) => x.id === c.clientId)?.name}</Link>
                          {overdue(c) ? <Pill tone="danger">Overdue</Pill> : openIssues(c).length ? <Pill tone="warning">Problem</Pill> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {w.list.length > 8 && <p className="mt-2 text-sm text-ink-muted">and {w.list.length - 8} more</p>}
                </div>
              );
            })()}
            {panel === "access" && (
            <div className="space-y-5">
              {access(sel).map((g) => (
                <div key={g.group}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{g.group}</h3>
                  <ul className="mt-1 divide-y divide-line">
                    {g.items.map((i) => (
                      <li key={i.label} className="flex items-start justify-between gap-3 py-2.5"><div><p className="text-[0.9375rem]">{i.label}</p>{i.note && <p className="text-xs text-ink-muted">{i.note}</p>}</div><Pill tone={i.on ? "success" : "neutral"}>{i.on ? "Yes" : "No"}</Pill></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            )}
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted"><ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-deep" /> Permissions are enforced on the server, not only in the screens.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(sel)}>Edit access</Button>
              {sel.id !== d.user.id && (
                <button type="button" className={btn.ghost} onClick={() => { d.updateUser(sel.id, { inactive: !sel.inactive }); d.toast(sel.inactive ? `${sel.name} can sign in again. (Demo: not saved.)` : `${sel.name} can no longer sign in. Their cases stay as they are. (Demo: not saved.)`); }}>
                  {sel.inactive ? "Reactivate account" : "Deactivate account"}
                </button>
              )}
            </div>
          </Panel>
        )}
      </div>

      {adding && <AddUserDialog onClose={() => setAdding(false)} />}
      {editing && <AccessDialog user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
