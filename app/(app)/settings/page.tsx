"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { PageHeader, Panel, Button } from "@/components/ui";
import { Pill } from "@/components/status";
import { DeptChip } from "@/components/department";
import { Field } from "@/components/form";
import { useDemo, type Settings } from "@/lib/store";
import { VISA_TYPES } from "@/lib/demo-data";
import { btn, field } from "@/lib/styles";

const SECTIONS = [{ id: "company", label: "Company profile" }, { id: "branding", label: "Branding" }, { id: "regional", label: "Regional" }, { id: "teams", label: "Departments" }, { id: "email", label: "Email reminders" }];

export default function SettingsPage() {
  const d = useDemo();
  const [s, setS] = useState<Settings>(d.settings);
  const dirty = JSON.stringify(s) !== JSON.stringify(d.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Settings" description="Company-wide settings. Only administrators can change these."
        actions={<><Button variant="secondary" disabled={!dirty} onClick={() => setS(d.settings)}>Discard</Button><Button disabled={!dirty} onClick={() => { d.saveSettings(s); d.toast("Settings saved. (Demo: not saved.)"); }}>Save settings</Button></>} />

      <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">{SECTIONS.map((x) => <li key={x.id}><a href={`#${x.id}`} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-medium hover:bg-brand-tint">{x.label}</a></li>)}</ul>
        </nav>

        <div className="space-y-6">
          <Panel id="company" title="Company profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trading name" htmlFor="st-name"><input id="st-name" className={field} value={s.tradingName} onChange={(e) => set("tradingName", e.target.value)} /></Field>
              <Field label="Legal name" htmlFor="st-legal" hint="Used on invoices"><input id="st-legal" className={field} value={s.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="To be confirmed" /></Field>
              <Field label="Public email" htmlFor="st-email"><input id="st-email" type="email" className={field} value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone" htmlFor="st-phone"><input id="st-phone" className={field} value={s.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+966" inputMode="tel" /></Field>
              <Field label="Country" htmlFor="st-country"><input id="st-country" className={field} value={s.country} onChange={(e) => set("country", e.target.value)} /></Field>
              <Field label="City" htmlFor="st-city"><input id="st-city" className={field} value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="Riyadh, Jeddah…" /></Field>
            </div>
          </Panel>

          <Panel id="branding" title="Branding" description="The supplied logo is used exactly as provided.">
            <div className="flex flex-wrap items-center gap-6"><img src="/brand/logo.png" alt="Perfectgration logo" className="h-14 w-auto" width={681} height={151} /><img src="/brand/mark.png" alt="Perfectgration icon" className="h-14 w-14 rounded-lg border border-line" width={150} height={151} /></div>
            <p className="mt-4 text-sm text-ink-muted">Logo replacement is handled with the backend, so every document and email picks up the new file.</p>
          </Panel>

          <Panel id="regional" title="Regional preferences">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Interface language" htmlFor="st-lang" hint="Arabic and right-to-left layout are planned."><select id="st-lang" className={field} value={s.language} onChange={(e) => set("language", e.target.value)}><option>English</option><option disabled>Arabic (coming soon)</option></select></Field>
              <Field label="Currency" htmlFor="st-cur"><select id="st-cur" className={field} value={s.currency} onChange={(e) => set("currency", e.target.value)}><option>SAR</option><option>USD</option><option>AED</option></select></Field>
              <Field label="Date format" htmlFor="st-date"><select id="st-date" className={field} value={s.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option></select></Field>
              <Field label="Time zone" htmlFor="st-tz"><select id="st-tz" className={field} value={s.timezone} onChange={(e) => set("timezone", e.target.value)}><option>Asia/Riyadh (UTC+3)</option><option>Asia/Dubai (UTC+4)</option></select></Field>
              <Field label="Working days" htmlFor="st-week" hint="Used for deadline calculations"><select id="st-week" className={field} value={s.workweek} onChange={(e) => set("workweek", e.target.value)}><option>Sunday to Thursday</option><option>Monday to Friday</option></select></Field>
            </div>
          </Panel>

          <Panel id="teams" title="Departments" description="Five departments. A team member can belong to more than one. Manage people on the Team page.">
            <ul className="flex flex-wrap gap-2">{VISA_TYPES.map((v) => <li key={v.id}><DeptChip team={v.id} large /></li>)}</ul>
          </Panel>

          <Panel id="email" title="Email reminders" description="Sent through EmailJS (Professional plan).">
            <div className="flex flex-wrap items-center gap-3"><span className="text-[15px]">Status:</span><Pill tone={s.emailConnected ? "success" : "warning"}>{s.emailConnected ? "Connected" : "Not connected yet"}</Pill></div>
            <p className="mt-3 text-sm text-ink-muted">Keys live in server environment variables and are never shown in the browser.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btn.secondary} onClick={() => { d.saveSettings({ emailConnected: true }); setS({ ...s, emailConnected: true }); d.toast(`Test email sent to ${s.email || "the company address"}. (Demo: no email was sent.)`); }}><Mail size={18} aria-hidden /> Send test email</button>
              {s.emailConnected && <button type="button" className={btn.ghost} onClick={() => { d.saveSettings({ emailConnected: false }); setS({ ...s, emailConnected: false }); d.toast("Email reminders disconnected. (Demo.)", "info"); }}>Disconnect</button>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
