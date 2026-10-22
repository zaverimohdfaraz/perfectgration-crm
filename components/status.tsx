import type { ReactNode } from "react";
import { STAGES, stageNumber, type CaseStatus, type StageId, type TeamId } from "@/lib/demo-data";
import { DeptChip } from "./department";
import { deadlineState, deadlineText, fmtDate, stageTone } from "@/lib/dates";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-200",
  info: "bg-brand-soft text-ink ring-1 ring-inset ring-brand/30",
  success: "bg-green-100 text-green-900 ring-1 ring-inset ring-green-300",
  warning: "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300",
  danger: "bg-red-100 text-red-900 ring-1 ring-inset ring-red-300",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-sm font-medium ${TONE[tone]}`}>{children}</span>;
}

export function StageBadge({ stage }: { stage: StageId }) {
  const label = STAGES.find((s) => s.id === stage)?.label ?? stage;
  return <Pill tone="info">{stageNumber(stage)}/{STAGES.length} · {label}</Pill>;
}

const DAYS = { ontrack: { tone: "neutral", label: "On track" }, followup: { tone: "warning", label: "Follow up" }, urgent: { tone: "danger", label: "Urgent" } } as const;

export function DaysBadge({ days }: { days: number }) {
  const m = DAYS[stageTone(days)];
  return <Pill tone={m.tone}>{days} {days === 1 ? "day" : "days"} · {m.label}</Pill>;
}

const DL = { overdue: "danger", d1: "warning", d3: "warning", d7: "neutral", later: "neutral", none: "neutral" } as const;

export function DeadlineBadge({ iso }: { iso: string | null }) {
  const state = deadlineState(iso);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Pill tone={DL[state]}>{deadlineText(iso)}</Pill>
      {iso && <span className="text-xs text-ink-muted">{fmtDate(iso)}</span>}
    </span>
  );
}

const STATUS: Record<CaseStatus, Tone> = { active: "info", on_hold: "warning", returned: "warning", withdrawn: "neutral", refused: "danger", approved: "success" };

export function StatusBadge({ status, label, restricted = false }: { status: CaseStatus; label: string; restricted?: boolean }) {
  return <Pill tone={restricted ? "neutral" : STATUS[status]}>{label}</Pill>;
}

export function VisaBadge({ visa }: { visa: TeamId }) {
  return <DeptChip team={visa} />;
}
