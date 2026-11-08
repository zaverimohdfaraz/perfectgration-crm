"use client";

import { useMemo, useState } from "react";
import { Pin, PinOff, Plus } from "@/components/icons";
import { PageHeader, Panel, EmptyState, Button, Avatar } from "@/components/ui";
import { Pill } from "@/components/status";
import { DeptChip, TeamChip } from "@/components/department";
import { Modal, ModalActions, ConfirmDialog } from "@/components/modal";
import { Field } from "@/components/form";
import { useDemo } from "@/lib/store";
import { ROLE_LABEL, VISA_TYPES, WORK_TEAM_LABEL, type Message, type TeamId, type User, type WorkTeam } from "@/lib/demo-data";
import { canDeleteMessage, canPinMessage, canSendMessage, isAdmin, visibleMessages } from "@/lib/permissions";
import { fmtDateTime } from "@/lib/dates";
import { area, btn, field } from "@/lib/styles";

type Box = "inbox" | "sent" | "all";

export default function NotepadPage() {
  const d = useDemo();
  const admin = isAdmin(d.user);
  const [box, setBox] = useState<Box>("inbox");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ replyTo?: Message } | null>(null);
  const [del, setDel] = useState<Message | null>(null);

  const mine = visibleMessages(d.user, d.messages);
  const isIncoming = (m: Message) => m.fromId !== d.user.id;
  const unread = mine.filter((m) => isIncoming(m) && !m.readBy.includes(d.user.id)).length;
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => mine
    .filter((m) => (box === "inbox" ? isIncoming(m) : box === "sent" ? !isIncoming(m) : true))
    .filter((m) => !needle || `${m.subject} ${m.body} ${nameOf(d.users, m.fromId)}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mine, box, needle]);
  const current = list.find((m) => m.id === openId) ?? null;

  const open = (m: Message) => { setOpenId(m.id); d.markRead(m.id); };
  const boxes: { id: Box; label: string; count?: number }[] = [
    { id: "inbox", label: "Inbox", count: unread || undefined },
    { id: "sent", label: "Sent" },
    ...(admin ? [{ id: "all" as Box, label: "All messages" }] : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Internal"
        title="Team Notepad"
        description={admin ? "Send messages to everyone, a team, a visa department or chosen people. Team members can only reply to you." : "Messages from the administrator. You can write to the administrator; team members cannot message each other."}
        actions={<Button onClick={() => setCompose({})}><Plus size={18} aria-hidden /> {admin ? "New message" : "Message the administrator"}</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Panel flush>
          <div className="border-b border-line p-3">
            <div role="tablist" aria-label="Folders" className="mb-3 flex gap-1">
              {boxes.map((b) => (
                <button key={b.id} role="tab" type="button" aria-selected={box === b.id} onClick={() => { setBox(b.id); setOpenId(null); }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${box === b.id ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-brand-tint"}`}>
                  {b.label}{b.count ? <span className="rounded-full bg-brand px-1.5 text-xs text-ink-on">{b.count}</span> : null}
                </button>
              ))}
            </div>
            <label htmlFor="msg-q" className="sr-only">Search messages</label>
            <input id="msg-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" />
          </div>
          {list.length === 0 ? (
            <EmptyState title="No messages here" body={box === "inbox" ? "Messages addressed to you will appear here." : "Messages you send will appear here."} />
          ) : (
            <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto">
              {list.map((m) => {
                const unreadMsg = isIncoming(m) && !m.readBy.includes(d.user.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => open(m)} aria-current={current?.id === m.id ? "true" : undefined}
                      className={`flex w-full items-start gap-3 p-4 text-left hover:bg-brand-tint ${current?.id === m.id ? "bg-brand-tint" : ""}`}>
                      <Avatar name={nameOf(d.users, m.fromId)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-sm ${unreadMsg ? "font-bold" : "font-medium"}`}>{m.fromId === d.user.id ? `To: ${audienceText(m, d.users)}` : nameOf(d.users, m.fromId)}</span>
                          {m.pinned && <Pin size={14} aria-label="Pinned" className="shrink-0 text-brand-deep" />}
                          {unreadMsg && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                        </span>
                        <span className={`block truncate text-[0.9375rem] ${unreadMsg ? "font-semibold" : ""}`}>{m.subject}</span>
                        <span className="block truncate text-sm text-ink-muted">{m.body}</span>
                        <span className="mt-1 block text-xs text-ink-muted">{fmtDateTime(m.at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          {!current ? (
            <EmptyState title="Select a message" body="Choose a message on the left to read it." />
          ) : (
            <article>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold">{current.subject}</h2>
                  <p className="mt-1 text-sm text-ink-muted">From <strong className="text-ink">{nameOf(d.users, current.fromId)}</strong> · {fmtDateTime(current.at)}</p>
                </div>
                {current.pinned && <Pill tone="info">Pinned</Pill>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Sent to">
                <span className="text-sm font-medium text-ink-muted">To:</span>
                <AudienceChips m={current} users={d.users} />
              </div>
              <p className="mt-5 max-w-prose whitespace-pre-line break-words text-[0.9375rem] leading-relaxed">{current.body}</p>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
                {current.fromId !== d.user.id && <button type="button" className={btn.primary} onClick={() => setCompose({ replyTo: current })}>Reply</button>}
                {canPinMessage(d.user) && <button type="button" className={btn.secondary} onClick={() => d.pinMessage(current.id, !current.pinned)}>{current.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}{current.pinned ? "Unpin" : "Pin"}</button>}
                {canDeleteMessage(d.user) && <button type="button" className={`${btn.ghost} !text-red-800 hover:!bg-red-50`} onClick={() => setDel(current)}>Delete</button>}
              </div>
            </article>
          )}
        </Panel>
      </div>

      {compose && <ComposeDialog replyTo={compose.replyTo} onClose={() => setCompose(null)} />}
      {del && <ConfirmDialog title="Delete this message?" body={`“${del.subject}” will be removed for everyone it was sent to.`} confirmLabel="Delete message" danger onConfirm={() => { d.deleteMessage(del.id); setOpenId(null); d.toast("Message deleted. (Demo: not saved.)"); }} onClose={() => setDel(null)} />}
    </div>
  );
}

const nameOf = (users: User[], id: string) => users.find((u) => u.id === id)?.name ?? "Former member";

function audienceText(m: Message, users: User[]): string {
  if (m.toAll) return "Everyone";
  const parts = [
    ...m.toTeams.map((t) => WORK_TEAM_LABEL[t]),
    ...m.toDepartments.map((t) => `${VISA_TYPES.find((v) => v.id === t)?.label} department`),
    ...m.toUserIds.map((id) => nameOf(users, id)),
  ];
  return parts.join(", ") || "Nobody";
}

function AudienceChips({ m, users }: { m: Message; users: User[] }) {
  if (m.toAll) return <Pill tone="neutral">Everyone</Pill>;
  return (
    <>
      {m.toTeams.map((t) => <TeamChip key={t} team={t} />)}
      {m.toDepartments.map((t) => <DeptChip key={t} team={t} />)}
      {m.toUserIds.map((id) => <Pill key={id} tone="neutral">{nameOf(users, id)}</Pill>)}
    </>
  );
}

function ComposeDialog({ replyTo, onClose }: { replyTo?: Message; onClose: () => void }) {
  const d = useDemo();
  const admin = isAdmin(d.user);
  const admins = d.users.filter((u) => u.role === "admin" && !u.inactive);
  const replyTarget = replyTo ? [replyTo.fromId] : [];
  const [mode, setMode] = useState<"all" | "groups">(replyTo ? "groups" : "all");
  const [teams, setTeams] = useState<WorkTeam[]>([]);
  const [depts, setDepts] = useState<TeamId[]>([]);
  const [people, setPeople] = useState<string[]>(admin ? replyTarget : admins.map((a) => a.id));
  const [find, setFind] = useState("");
  const [subject, setSubject] = useState(replyTo ? (replyTo.subject.startsWith("Re: ") ? replyTo.subject : `Re: ${replyTo.subject}`) : "");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const candidates = d.users.filter((u) => !u.inactive && u.id !== d.user.id && `${u.name} ${u.email}`.toLowerCase().includes(find.trim().toLowerCase()));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const send = () => {
    const msg = admin
      ? { toAll: mode === "all", toTeams: mode === "all" ? [] : teams, toDepartments: mode === "all" ? [] : depts, toUserIds: mode === "all" ? [] : people }
      : { toAll: false, toTeams: [] as WorkTeam[], toDepartments: [] as TeamId[], toUserIds: admins.map((a) => a.id) };
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = "Add a subject.";
    if (!body.trim()) e.body = "Write the message.";
    if (!canSendMessage(d.user, msg, d.users)) e.to = admin ? "Choose who should receive this message." : "There is no active administrator to send to.";
    setErrors(e);
    if (Object.keys(e).length) return;
    d.sendMessage({ ...msg, subject: subject.trim(), body: body.trim(), replyToId: replyTo?.id });
    d.toast("Message sent. (Demo: not saved.)");
    onClose();
  };

  return (
    <Modal title={replyTo ? "Reply" : admin ? "New message" : "Message the administrator"} description={admin ? "Only administrators can send messages to the team." : "Your message goes to the administrator only."} onClose={onClose} size="lg">
      <form onSubmit={(ev) => { ev.preventDefault(); send(); }} noValidate className="space-y-4">
        {admin ? (
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">Send to</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex min-h-11 items-center gap-2 text-[0.9375rem]"><input type="radio" name="aud" checked={mode === "all"} onChange={() => setMode("all")} className="h-4 w-4 accent-[#009FE3]" /> Everyone</label>
              <label className="flex min-h-11 items-center gap-2 text-[0.9375rem]"><input type="radio" name="aud" checked={mode === "groups"} onChange={() => setMode("groups")} className="h-4 w-4 accent-[#009FE3]" /> Teams, departments or people</label>
            </div>
            {mode === "groups" && (
              <div className="mt-3 space-y-4 border-t border-line pt-4">
                <div>
                  <p className="mb-2 text-sm font-semibold">Teams</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(WORK_TEAM_LABEL) as WorkTeam[]).map((t) => (
                      <Check key={t} on={teams.includes(t)} onChange={() => setTeams(toggle(teams, t))} label={WORK_TEAM_LABEL[t]} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Visa departments</p>
                  <div className="flex flex-wrap gap-2">
                    {VISA_TYPES.map((v) => <Check key={v.id} on={depts.includes(v.id)} onChange={() => setDepts(toggle(depts, v.id))} label={v.label} />)}
                  </div>
                </div>
                <div>
                  <label htmlFor="cm-find" className="mb-2 block text-sm font-semibold">People</label>
                  <input id="cm-find" className={field} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search by name" />
                  <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                    {candidates.map((u) => (
                      <li key={u.id}>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-brand-tint">
                          <input type="checkbox" className="h-4 w-4 accent-[#009FE3]" checked={people.includes(u.id)} onChange={() => setPeople(toggle(people, u.id))} />
                          <span className="min-w-0"><span className="block truncate text-[0.9375rem] font-medium">{u.name}</span><span className="block truncate text-sm text-ink-muted">{u.workTeam ? WORK_TEAM_LABEL[u.workTeam] : ROLE_LABEL[u.role]}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {errors.to && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{errors.to}</p>}
          </fieldset>
        ) : (
          <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm">To: <strong>{admins.map((a) => a.name).join(", ") || "Administrator"}</strong>{errors.to && <span role="alert" className="block font-medium text-red-800">{errors.to}</span>}</p>
        )}
        <Field label="Subject" htmlFor="cm-subject" required error={errors.subject}><input id="cm-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message" htmlFor="cm-body" required error={errors.body}><textarea id="cm-body" className={`${area} min-h-36`} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <ModalActions>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btn.primary}>Send</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function Check({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[0.9375rem] ${on ? "border-brand bg-brand-soft font-semibold" : "border-line"}`}>
      <input type="checkbox" className="h-4 w-4 accent-[#009FE3]" checked={on} onChange={onChange} /> {label}
    </label>
  );
}
