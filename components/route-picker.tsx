"use client";

import { Field } from "./form";
import { field } from "@/lib/styles";
import { useDemo, type PassTarget } from "@/lib/store";
import { OWNER_LABEL, VISA_TYPES, type TeamId } from "@/lib/demo-data";

/** Choose who receives a handoff: one person, a visa team, or the whole next team when unsure. */
export function RoutePicker({ to, value, onChange, defaultVisa, error }: { to: "sales" | "case"; value: PassTarget; onChange: (v: PassTarget) => void; defaultVisa: TeamId; error?: string }) {
  const d = useDemo();
  const team = OWNER_LABEL[to];
  const people = d.users.filter((u) => u.role === "consultant" && !u.inactive && u.workTeam === to);
  const options: { id: PassTarget["kind"]; label: string; help: string }[] = [
    { id: "team", label: `The whole ${team}`, help: "Every member sees it. The first person to accept it gets the case." },
    { id: "visa", label: "Only one visa team (optional)", help: `Only ${team} members on that visa team see it. The first one to accept gets it.` },
    { id: "person", label: "A specific person (optional)", help: "Goes straight to them. No one else sees it." },
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Pass to the {team}</legend>
      {options.map((o) => (
        <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${value.kind === o.id ? "border-brand bg-brand-tint" : "border-line"}`}>
          <input type="radio" name={`route-${to}`} checked={value.kind === o.id} onChange={() => onChange({ kind: o.id, visa: o.id === "visa" ? value.visa ?? defaultVisa : undefined, userId: o.id === "person" ? value.userId ?? people[0]?.id : undefined })} className="mt-1 h-4 w-4 accent-[#009FE3]" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{o.label}</span>
            <span className="text-sm text-ink-muted">{o.help}</span>
            {value.kind === o.id && o.id === "visa" && (
              <span className="mt-2 block"><select aria-label="Visa team" className={field} value={value.visa ?? defaultVisa} onChange={(e) => onChange({ ...value, visa: e.target.value as TeamId })}>{VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></span>
            )}
            {value.kind === o.id && o.id === "person" && (
              <span className="mt-2 block"><select aria-label="Person" className={field} value={value.userId ?? ""} onChange={(e) => onChange({ ...value, userId: e.target.value })}>{people.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.teams.map((t) => VISA_TYPES.find((v) => v.id === t)?.label).join(", ")}</option>)}</select></span>
            )}
          </span>
        </label>
      ))}
      {error && <p role="alert" className="text-sm font-medium text-red-800">{error}</p>}
    </fieldset>
  );
}
