import { Briefcase, Flag, FolderOpen, GraduationCap, Megaphone, Phone, Plane, ShieldCheck, Wrench } from "@/components/icons";
import { OWNER_LABEL, type StageOwner, type TeamId, type WorkTeam } from "@/lib/demo-data";

/** One look per department, used on the Team page, case lists and the sidebar. Text always accompanies colour and icon. */
export const DEPT: Record<TeamId, { label: string; blurb: string; Icon: typeof Briefcase; chip: string; tile: string; ring: string }> = {
  study: { label: "Study", blurb: "Student visas", Icon: GraduationCap, chip: "bg-sky-100 text-sky-900 ring-sky-300", tile: "bg-sky-100 text-sky-800", ring: "ring-sky-400" },
  work: { label: "Work", blurb: "Work permit visas", Icon: Briefcase, chip: "bg-teal-100 text-teal-900 ring-teal-300", tile: "bg-teal-100 text-teal-800", ring: "ring-teal-400" },
  visit: { label: "Visit", blurb: "Tourist and visitor visas", Icon: Plane, chip: "bg-violet-100 text-violet-900 ring-violet-300", tile: "bg-violet-100 text-violet-800", ring: "ring-violet-400" },
  skilled: { label: "Skilled", blurb: "Skilled worker visas", Icon: Wrench, chip: "bg-indigo-100 text-indigo-900 ring-indigo-300", tile: "bg-indigo-100 text-indigo-800", ring: "ring-indigo-400" },
  eb2niw: { label: "EB2-NIW", blurb: "US national interest waiver", Icon: Flag, chip: "bg-slate-200 text-slate-900 ring-slate-400", tile: "bg-slate-200 text-slate-800", ring: "ring-slate-500" },
};

export function DeptChip({ team, large = false }: { team: TeamId; large?: boolean }) {
  const x = DEPT[team];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold ring-1 ring-inset ${x.chip} ${large ? "px-3 py-1.5 text-[0.9375rem]" : "px-2.5 py-1 text-sm"}`}>
      <x.Icon size={large ? 18 : 15} aria-hidden />
      {x.label}
    </span>
  );
}

export function DeptIcon({ team }: { team: TeamId }) {
  const x = DEPT[team];
  return <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${x.tile}`}><x.Icon size={22} /></span>;
}

/** The functional teams from the process: who owns which part of a case. Shown beside the visa departments. */
export const FUNCTION_TEAM: Record<StageOwner, { Icon: typeof Briefcase; chip: string; tile: string; ring: string }> = {
  social: { Icon: Megaphone, chip: "bg-brand-soft text-ink ring-brand/40", tile: "bg-brand-soft text-brand-deep", ring: "ring-brand" },
  sales: { Icon: Phone, chip: "bg-rose-100 text-rose-900 ring-rose-300", tile: "bg-rose-100 text-rose-800", ring: "ring-rose-400" },
  case: { Icon: FolderOpen, chip: "bg-amber-100 text-amber-900 ring-amber-300", tile: "bg-amber-100 text-amber-800", ring: "ring-amber-400" },
  leadership: { Icon: ShieldCheck, chip: "bg-green-100 text-green-900 ring-green-300", tile: "bg-green-100 text-green-800", ring: "ring-green-400" },
};

export function TeamChip({ team }: { team: WorkTeam | "leadership" }) {
  const x = FUNCTION_TEAM[team];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${x.chip}`}>
      <x.Icon size={15} aria-hidden />
      {OWNER_LABEL[team]}
    </span>
  );
}

export function TeamIcon({ team }: { team: StageOwner }) {
  const x = FUNCTION_TEAM[team];
  return <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${x.tile}`}><x.Icon size={22} /></span>;
}
