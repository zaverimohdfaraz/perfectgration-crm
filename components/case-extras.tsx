"use client";

import { useState } from "react";
import { CheckCircle2, Plus } from "./icons";
import { Button, EmptyState, Panel } from "./ui";
import { Pill } from "./status";
import { Modal, ModalActions, ConfirmDialog } from "./modal";
import { Field } from "./form";
import { useDemo } from "@/lib/store";
import { ISSUE_LABEL, type Case, type IssueKind, type UploadLink } from "@/lib/demo-data";
import { canCreateUploadLink, canEditCase, canTerminateUploadLink, linkState } from "@/lib/permissions";
import { openIssues } from "@/lib/case-logic";
import { TODAY, fmtDateTime } from "@/lib/dates";
import { area, btn, field } from "@/lib/styles";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/forms";

/* ─── Problems and holds on a case ──────────────────────── */
export function ProblemsPanel({ c }: { c: Case }) {
  const d = useDemo();
  const [adding, setAdding] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const can = canEditCase(d.user, c) || d.user.role === "manager";
  const open = openIssues(c);
  const resolved = c.issues.filter((i) => i.resolvedAt);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Panel title="Open problems" description="What is stopping this case, why it is on hold or paused, and who has to act." flush
          action={can ? <Button onClick={() => setAdding(true)}><Plus size={18} aria-hidden /> Record a problem</Button> : undefined}>
          {open.length === 0 ? <EmptyState title="No open problems" body="If this case is stuck, record what the problem is so everyone can see it." /> : (
            <ul className="divide-y divide-line">
              {open.map((i) => (
                <li key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Pill tone="warning">{ISSUE_LABEL[i.kind]}</Pill>
                    <p className="mt-2 break-words text-[0.9375rem]">{i.text}</p>
                    <p className="mt-1 text-sm text-ink-muted">{i.by} · {fmtDateTime(i.at)} · open {Math.max(0, Math.floor((TODAY.getTime() - Date.parse(i.at)) / 86_400_000))} days</p>
                  </div>
                  {can && <button type="button" className={`${btn.secondary} !min-h-10 shrink-0 text-sm`} onClick={() => setResolving(i.id)}>Mark resolved</button>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {resolved.length > 0 && (
          <Panel title="Resolved" flush>
            <ul className="divide-y divide-line">
              {[...resolved].reverse().map((i) => (
                <li key={i.id} className="px-5 py-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={16} aria-hidden className="text-green-700" /> {ISSUE_LABEL[i.kind]}</p>
                  <p className="text-[0.9375rem]">{i.text}</p>
                  <p className="text-sm text-ink-muted">Recorded by {i.by} on {fmtDateTime(i.at)} · Resolved by {i.resolvedBy} on {fmtDateTime(i.resolvedAt!)}{i.resolution ? ` · ${i.resolution}` : ""}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
      <Panel title="Why this matters">
        <p className="text-sm text-ink-muted">Problems show on the team pages and in reports, so managers can see where a case is stuck and whether the delay is with the client, a third party, the authority or inside the team.</p>
        {c.status === "on_hold" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This case is on hold. Reason: {c.endReason}</p>}
      </Panel>
      {adding && <IssueDialog c={c} onClose={() => setAdding(false)} />}
      {resolving && <ResolveDialog c={c} issueId={resolving} onClose={() => setResolving(null)} />}
    </div>
  );
}

function IssueDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const [kind, setKind] = useState<IssueKind>("client");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal title="Record a problem" description="Explain what is stopping this case. It stays open until someone marks it resolved." onClose={onClose}>
      <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) { setErr("Describe the problem."); return; } if (d.addIssue(c.id, kind, text.trim())) { d.toast("Problem recorded. (Demo: not saved.)"); onClose(); } }}>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Who or what is it waiting on?</legend>
          {(Object.keys(ISSUE_LABEL) as IssueKind[]).map((k) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 ${kind === k ? "border-brand bg-brand-tint" : "border-line"}`}>
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} className="h-4 w-4 accent-[#009FE3]" /> {ISSUE_LABEL[k]}
            </label>
          ))}
        </fieldset>
        <Field label="What is the problem?" htmlFor="is-text" required error={err}><textarea id="is-text" className={`${area} min-h-28`} value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="For example, the bank has not issued the statement letter yet." /></Field>
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary}>Record problem</button></ModalActions>
      </form>
    </Modal>
  );
}

function ResolveDialog({ c, issueId, onClose }: { c: Case; issueId: string; onClose: () => void }) {
  const d = useDemo();
  const [text, setText] = useState("");
  return (
    <Modal title="Mark as resolved" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (d.resolveIssue(c.id, issueId, text)) { d.toast("Problem resolved. (Demo: not saved.)"); onClose(); } }}>
        <Field label="How was it resolved?" htmlFor="rs-text" hint="Optional."><textarea id="rs-text" className={area} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary}>Mark resolved</button></ModalActions>
      </form>
    </Modal>
  );
}

/* ─── Client upload links ───────────────────────────────── */
const STATE_TONE = { active: "success", expired: "neutral", terminated: "danger" } as const;
const STATE_LABEL = { active: "Active", expired: "Expired", terminated: "Ended" } as const;

export function UploadLinksPanel({ c }: { c: Case }) {
  const d = useDemo();
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState<UploadLink | null>(null);
  const links = d.uploadLinks.filter((l) => l.caseId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = TODAY.getTime();

  return (
    <Panel title="Ask the client to upload files" description="Send the client a secure link. They can upload files only until it expires, and you can end it at any time." flush
      action={canCreateUploadLink(d.user, c) ? <Button onClick={() => setCreating(true)}><Plus size={18} aria-hidden /> New upload link</Button> : undefined}>
      {links.length === 0 ? <EmptyState title="No links sent yet" body="Create a link, then share it with the client by WhatsApp or email." /> : (
        <ul className="divide-y divide-line">
          {links.map((l) => {
            const st = linkState(l, now);
            return (
              <li key={l.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={STATE_TONE[st]}>{STATE_LABEL[st]}</Pill>
                  <span className="text-sm text-ink-muted">Created by {d.users.find((u) => u.id === l.createdById)?.name ?? "—"} · {fmtDateTime(l.createdAt)}</span>
                </div>
                <p className="text-[0.9375rem]">Requested: {l.requested.length ? l.requested.join(", ") : "Any files"}</p>
                <p className="text-sm text-ink-muted">{st === "active" ? `Open until ${fmtDateTime(l.expiresAt)}` : st === "expired" ? `Expired on ${fmtDateTime(l.expiresAt)}` : `Ended on ${fmtDateTime(l.terminatedAt!)}`} · {l.uploads.length} {l.uploads.length === 1 ? "file" : "files"} received</p>
                {st === "active" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <CopyLink url={d.uploadLinkUrl(l)} />
                    <a className={`${btn.secondary} !min-h-10 text-sm`} href={`https://wa.me/?text=${encodeURIComponent(`Please upload your documents here: ${d.uploadLinkUrl(l)}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
                    <a className={`${btn.secondary} !min-h-10 text-sm`} href={`/u/${l.token}`} target="_blank" rel="noopener noreferrer">Preview</a>
                    {canTerminateUploadLink(d.user, l, c) && <button type="button" className={`${btn.ghost} !min-h-10 text-sm !text-red-800 hover:!bg-red-50`} onClick={() => setEnding(l)}>End link now</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {creating && <NewLinkDialog c={c} onClose={() => setCreating(false)} />}
      {ending && <ConfirmDialog title="End this link?" body="The client will not be able to upload anything more with it. Files already received are kept." confirmLabel="End link" danger onConfirm={() => { d.terminateUploadLink(ending.id); d.toast("Link ended. (Demo: not saved.)"); }} onClose={() => setEnding(null)} />}
    </Panel>
  );
}

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`${btn.primary} !min-h-10 text-sm`} onClick={() => { void navigator.clipboard?.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); }); }}>
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

const DURATIONS = [{ id: "24", label: "24 hours", hours: 24 }, { id: "72", label: "3 days", hours: 72 }, { id: "168", label: "7 days", hours: 168 }, { id: "custom", label: "Choose a date and time", hours: 0 }];

function NewLinkDialog({ c, onClose }: { c: Case; onClose: () => void }) {
  const d = useDemo();
  const pending = d.docs.filter((x) => x.caseId === c.id && x.status === "pending").map((x) => x.name);
  const [items, setItems] = useState<string[]>(pending);
  const [item, setItem] = useState("");
  const [message, setMessage] = useState("");
  const [dur, setDur] = useState("72");
  const [custom, setCustom] = useState(toDateTimeInput(new Date(TODAY.getTime() + 72 * 3_600_000).toISOString()));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<UploadLink | null>(null);
  const [err, setErr] = useState("");

  const submit = async () => {
    const hours = DURATIONS.find((x) => x.id === dur)?.hours ?? 0;
    const expiresAt = dur === "custom" ? fromDateTimeInput(custom) : new Date(TODAY.getTime() + hours * 3_600_000).toISOString();
    const ms = Date.parse(expiresAt) - TODAY.getTime();
    if (!(ms > 3_600_000) || ms > 30 * 86_400_000) { setErr("Choose an expiry between 1 hour and 30 days from now."); return; }
    setBusy(true);
    const link = await d.createUploadLink({ caseId: c.id, requested: items, message: message.trim() || undefined, expiresAt });
    setBusy(false);
    if (link) setCreated(link);
  };

  if (created) {
    const url = d.uploadLinkUrl(created);
    return (
      <Modal title="Link ready" description="Send this link to the client. Only files can be uploaded with it; nothing in the CRM can be seen." onClose={onClose}>
        <p className="break-all rounded-lg bg-brand-tint p-3 font-mono text-sm">{url}</p>
        <p className="mt-2 text-sm text-ink-muted">Open until {fmtDateTime(created.expiresAt)}.</p>
        <ModalActions>
          <a className={btn.secondary} href={`https://wa.me/?text=${encodeURIComponent(`Please upload your documents here: ${url}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          <CopyLink url={url} />
        </ModalActions>
      </Modal>
    );
  }

  return (
    <Modal title="New upload link" description="Choose what the client should upload and how long the link stays open." onClose={onClose} size="lg">
      <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div>
          <p className="mb-2 text-sm font-semibold">Files to request</p>
          {items.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {items.map((x) => <li key={x}><span className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-sm">{x}<button type="button" aria-label={`Remove ${x}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white" onClick={() => setItems(items.filter((y) => y !== x))}>×</button></span></li>)}
            </ul>
          )}
          <div className="flex gap-2">
            <label htmlFor="nl-item" className="sr-only">File name</label>
            <input id="nl-item" className={field} value={item} onChange={(e) => setItem(e.target.value)} placeholder="For example, Passport (all pages)" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (item.trim() && !items.includes(item.trim())) setItems([...items, item.trim()]); setItem(""); } }} />
            <button type="button" className={btn.secondary} onClick={() => { if (item.trim() && !items.includes(item.trim())) setItems([...items, item.trim()]); setItem(""); }}>Add</button>
          </div>
          <p className="mt-1 text-sm text-ink-muted">Leave empty to accept any files.</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Link expires after</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((x) => (
              <label key={x.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[0.9375rem] ${dur === x.id ? "border-brand bg-brand-soft font-semibold" : "border-line"}`}>
                <input type="radio" name="dur" checked={dur === x.id} onChange={() => { setDur(x.id); setErr(""); }} className="h-4 w-4 accent-[#009FE3]" /> {x.label}
              </label>
            ))}
          </div>
          {dur === "custom" && <input type="datetime-local" aria-label="Expiry date and time" className={`${field} mt-2 max-w-xs`} value={custom} onChange={(e) => { setCustom(e.target.value); setErr(""); }} />}
          {err && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{err}</p>}
        </fieldset>
        <Field label="Message to the client" htmlFor="nl-msg" hint="Optional. Shown on the upload page."><textarea id="nl-msg" className={area} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <ModalActions><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" className={btn.primary} disabled={busy}>{busy ? "Creating…" : "Create link"}</button></ModalActions>
      </form>
    </Modal>
  );
}
