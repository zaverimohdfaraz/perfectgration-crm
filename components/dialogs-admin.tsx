"use client";

import { useState, type ReactNode } from "react";
import { Modal, ModalActions } from "./modal";
import { Field, Toggle } from "./form";
import { btn, field, area } from "@/lib/styles";
import { useDemo } from "@/lib/store";
import { VISA_TYPES, ROLE_LABEL, type Agent, type Role, type TeamId, type TeamNote, type Template, type User } from "@/lib/demo-data";
import { fromDateInput } from "@/lib/forms";

/* ─── Partner task ──────────────────────────────────────── */
export function TaskDialog({ onClose }: { onClose: () => void }) {
  const d = useDemo();
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState("");
  const [partner, setPartner] = useState("University");
  const [assignee, setAssignee] = useState(d.user.role === "consultant" ? d.user.id : "");
  const [deadline, setDeadline] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const staff = d.users.filter((u) => u.role === "consultant" && !u.inactive);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Enter a task title.";
    if (!caseId) e.caseId = "Choose the related case.";
    if (!assignee) e.assignee = "Choose who is responsible.";
    if (!deadline) e.deadline = "A deadline is required.";
    setErrors(e);
    if (Object.keys(e).length) return;
    d.addTask({ title: title.trim(), caseId, partner, assigneeId: assignee, deadline: fromDateInput(deadline) });
    d.toast("Partner task added. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title="New partner task" description="Track work you are waiting on from a partner." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
        <Field label="Task" htmlFor="tk-title" required error={errors.title}><input id="tk-title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example, Obtain enrolment letter" /></Field>
        <Field label="Related case" htmlFor="tk-case" required error={errors.caseId}>
          <select id="tk-case" className={field} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Select a case</option>
            {d.visible.filter((c) => c.status === "active").map((c) => <option key={c.id} value={c.id}>{d.clients.find((x) => x.id === c.clientId)?.name} · {c.ref}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Partner" htmlFor="tk-partner"><select id="tk-partner" className={field} value={partner} onChange={(e) => setPartner(e.target.value)}>{["University", "Employer", "VFS Global", "Embassy", "Other"].map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Responsible" htmlFor="tk-who" required error={errors.assignee}><select id="tk-who" className={field} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={d.user.role === "consultant"}><option value="">Select</option>{staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Deadline" htmlFor="tk-dl" required error={errors.deadline}><input id="tk-dl" type="date" className={field} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        </div>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Add task</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Team note ─────────────────────────────────────────── */
export function TeamNoteDialog({ note, onClose }: { note?: TeamNote; onClose: () => void }) {
  const d = useDemo();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [category, setCategory] = useState(note?.category ?? "Process");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Add a title.";
    if (!content.trim()) e.content = "Write the note.";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (note) d.updateTeamNote(note.id, { title: title.trim(), content: content.trim(), category, pinned });
    else d.addTeamNote({ title: title.trim(), content: content.trim(), category, pinned });
    d.toast(note ? "Note updated. (Demo: not saved.)" : "Note added to the team notepad. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title={note ? "Edit note" : "New team note"} description="Internal only. Never shown to clients." onClose={onClose}>
      <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
        <Field label="Title" htmlFor="tn-title" required error={errors.title}><input id="tn-title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Category" htmlFor="tn-cat"><select id="tn-cat" className={field} value={category} onChange={(e) => setCategory(e.target.value)}>{["Process", "Documents", "Operations", "Reminder"].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Note" htmlFor="tn-body" required error={errors.content}><textarea id="tn-body" className={`${area} min-h-32`} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
        <Toggle checked={pinned} onChange={setPinned} label="Pin to the top" description="Pinned notes also appear on the dashboard." />
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>{note ? "Save note" : "Add note"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Add team member ───────────────────────────────────── */
function TeamPicker({ teams, onChange }: { teams: TeamId[]; onChange: (t: TeamId[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Visa teams</legend>
      <div className="flex flex-wrap gap-2">
        {VISA_TYPES.map((v) => {
          const on = teams.includes(v.id);
          return (
            <label key={v.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[15px] ${on ? "border-brand bg-brand-soft font-semibold" : "border-line"}`}>
              <input type="checkbox" className="h-4 w-4 accent-[#009FE3]" checked={on} onChange={() => onChange(on ? teams.filter((t) => t !== v.id) : [...teams, v.id])} /> {v.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AddUserDialog({ onClose }: { onClose: () => void }) {
  const d = useDemo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("consultant");
  const [teams, setTeams] = useState<TeamId[]>([]);
  const [canAdd, setCanAdd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ name: string; email: string; pw: string } | null>(null);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Enter the person's name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address.";
    else if (d.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) e.email = "An account with this email already exists.";
    if (role === "consultant" && teams.length === 0) e.teams = "Choose at least one visa team.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = d.addUser({ name, email, role, teams: role === "consultant" ? teams : [], title: role === "admin" ? "Administrator" : role === "manager" ? "Manager" : "Visa Consultant", canAdd });
    setCreated({ name: r.user.name, email: r.user.email, pw: r.tempPassword });
  };

  if (created) {
    return (
      <Modal title="Account created" onClose={onClose}>
        <p className="text-[15px]"><strong>{created.name}</strong> can now sign in with this email. Share the temporary password privately. They will be asked to change it at first sign-in.</p>
        <dl className="mt-4 space-y-3 rounded-lg bg-brand-tint p-4">
          <div><dt className="text-sm text-ink-muted">Email</dt><dd className="font-semibold">{created.email}</dd></div>
          <div><dt className="text-sm text-ink-muted">Temporary password</dt><dd className="font-mono text-lg font-bold">{created.pw}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-ink-muted">Demo only: no account is really created.</p>
        <ModalActions><button type="button" className={btn.primary} onClick={onClose}>Done</button></ModalActions>
      </Modal>
    );
  }

  return (
    <Modal title="Add team member" description="Accounts are created by an administrator. There is no public sign-up." onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="au-name" required error={errors.name}><input id="au-name" className={field} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Work email" htmlFor="au-email" required error={errors.email}><input id="au-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role" htmlFor="au-role" hint={role === "manager" ? "Managers see all cases but cannot edit them." : role === "admin" ? "Administrators have full access." : "Team members see only their visa teams."}>
            <select id="au-role" className={field} value={role} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          </Field>
        </div>
        {role === "consultant" && (<><TeamPicker teams={teams} onChange={setTeams} />{errors.teams && <p role="alert" className="text-sm font-medium text-red-800">{errors.teams}</p>}<Toggle checked={canAdd} onChange={setCanAdd} label="Can add new cases" description="Useful for social media staff who capture leads." /></>)}
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Create account</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Edit access ───────────────────────────────────────── */
export function AccessDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const d = useDemo();
  const self = user.id === d.user.id;
  const [role, setRole] = useState<Role>(user.role);
  const [teams, setTeams] = useState<TeamId[]>(user.teams);
  const [canAdd, setCanAdd] = useState(!!user.canAdd);
  const [active, setActive] = useState(!user.inactive);
  const [pw, setPw] = useState("");

  return (
    <Modal title={`Access for ${user.name}`} description={user.email} onClose={onClose} size="lg">
      <div className="space-y-5">
        <Field label="Role" htmlFor="ac-role" hint={self ? "You cannot change your own role." : undefined}>
          <select id="ac-role" className={field} value={role} disabled={self} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        </Field>
        {role === "consultant" && <TeamPicker teams={teams} onChange={setTeams} />}
        <div className="divide-y divide-line rounded-lg border border-line px-4">
          <Toggle checked={role === "admin" || canAdd} onChange={setCanAdd} disabled={role === "admin"} label="Can add new cases" description="Lets this person capture new leads and open cases." />
          <Toggle checked={active} onChange={setActive} disabled={self} label="Account is active" description="Inactive accounts cannot sign in." />
        </div>
        <ul className="space-y-1 rounded-lg bg-brand-tint p-4 text-sm text-ink-muted">
          <li>{role === "admin" ? "Can see everything, including commission and outcomes." : role === "manager" ? "Can see all cases (read only) and reports. Cannot see commission or outcomes." : `Can see ${teams.length ? teams.map((t) => VISA_TYPES.find((v) => v.id === t)?.label).join(", ") : "no"} cases only.`}</li>
          <li>Permissions are enforced on the server, not only in the screens.</li>
        </ul>
        <div>
          <button type="button" className={btn.secondary} onClick={() => setPw(d.resetPassword(user.id))}>Reset password</button>
          {pw && <p className="mt-2 text-sm">New temporary password: <span className="font-mono font-bold">{pw}</span> <span className="text-ink-muted">(demo)</span></p>}
        </div>
      </div>
      <ModalActions>
        <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={btn.primary} onClick={() => { d.updateUser(user.id, { role, teams: role === "consultant" ? teams : [], canAdd, inactive: !active }); d.toast("Access updated. (Demo: not saved.)"); onClose(); }}>Save access</button>
      </ModalActions>
    </Modal>
  );
}

/* ─── Agent ─────────────────────────────────────────────── */
export function AgentDialog({ agent, onClose }: { agent?: Agent; onClose: () => void }) {
  const d = useDemo();
  const [name, setName] = useState(agent?.name ?? "");
  const [city, setCity] = useState(agent?.city ?? "");
  const [phone, setPhone] = useState(agent?.phone ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [type, setType] = useState<Agent["commissionType"]>(agent?.commissionType ?? "flat");
  const [amount, setAmount] = useState(String(agent?.amount ?? ""));
  const [notes, setNotes] = useState(agent?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Enter the agent's name.";
    if (!amount || Number(amount) <= 0) e.amount = "Enter the commission amount.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { name: name.trim(), city, phone, email, commissionType: type, amount: Number(amount), notes };
    if (agent) d.updateAgent(agent.id, data); else d.addAgent(data);
    d.toast(agent ? "Agent updated. (Demo: not saved.)" : "Agent added. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title={agent ? "Edit agent" : "Add agent"} onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Agent or company name" htmlFor="ag-name" required error={errors.name}><input id="ag-name" className={field} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
          <Field label="City" htmlFor="ag-city"><input id="ag-city" className={field} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="Phone" htmlFor="ag-phone"><input id="ag-phone" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
          <div className="sm:col-span-2"><Field label="Email" htmlFor="ag-email"><input id="ag-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
          <Field label="Commission type" htmlFor="ag-type"><select id="ag-type" className={field} value={type} onChange={(e) => setType(e.target.value as Agent["commissionType"])}><option value="flat">Flat amount (SAR)</option><option value="percent">Percent of fee</option></select></Field>
          <Field label={type === "flat" ? "Amount (SAR)" : "Percent"} htmlFor="ag-amt" required error={errors.amount}><input id="ag-amt" type="number" min="0" className={field} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Notes" htmlFor="ag-notes"><textarea id="ag-notes" className={area} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </div>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>{agent ? "Save agent" : "Add agent"}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Message template ──────────────────────────────────── */
export function TemplateDialog({ t, onClose }: { t: Template; onClose: () => void }) {
  const d = useDemo();
  const [body, setBody] = useState(t.body);
  return (
    <Modal title={t.name} description={`${t.channel} message sent at the ${t.stage} stage`} onClose={onClose} size="lg">
      <Field label="Message" htmlFor="tp-body" hint="Placeholders such as [Client Name], [Consultant Name], [Visa Type] and [Reference] fill in automatically."><textarea id="tp-body" className={`${area} min-h-48`} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      <ModalActions>
        <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={btn.primary} onClick={() => { d.setTemplates(d.templates.map((x) => (x.id === t.id ? { ...x, body } : x))); d.toast("Template saved. (Demo: not saved.)"); onClose(); }}>Save template</button>
      </ModalActions>
    </Modal>
  );
}

/* ─── Printable report preview ──────────────────────────── */
export function ReportPreview({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal title="Report preview" description="Use Print, then choose Save as PDF." onClose={onClose} size="xl">
      <div className="print-area rounded-lg border border-line p-6 text-[14px]">
        <div className="mb-4 flex items-end justify-between border-b-2 border-brand pb-3">
          <img src="/brand/logo.png" alt="Perfectgration" className="h-10 w-auto" width={681} height={151} />
          <div className="text-right"><p className="text-lg font-bold">{title}</p><p className="text-ink-muted">{subtitle}</p></div>
        </div>
        {children}
        <p className="mt-6 text-xs text-ink-muted">Confidential. Contains personal information. Preview generated from demo data.</p>
      </div>
      <ModalActions>
        <button type="button" className={btn.secondary} onClick={onClose}>Close</button>
        <button type="button" className={btn.primary} onClick={() => window.print()}>Print or save as PDF</button>
      </ModalActions>
    </Modal>
  );
}
