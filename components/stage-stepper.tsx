import { Check } from "@/components/icons";
import { STAGES, type StageId, type TeamId } from "@/lib/demo-data";

type StepState = "done" | "current" | "future" | "skipped";

const CIRCLE: Record<StepState, string> = {
  done: "bg-brand text-ink-on",
  current: "bg-white text-ink ring-4 ring-brand/40 border-2 border-brand",
  future: "bg-slate-100 text-ink-muted ring-1 ring-inset ring-slate-200",
  skipped: "border border-dashed border-slate-300 bg-white text-ink-muted",
};

export function StageStepper({ current, visa }: { current: StageId; visa: TeamId }) {
  const idx = STAGES.findIndex((s) => s.id === current);
  const steps = STAGES.map((s, i) => {
    const skipped = visa === "visit" && s.id === "assessment";
    const state: StepState = skipped ? "skipped" : i < idx ? "done" : i === idx ? "current" : "future";
    return { ...s, state, n: i + 1 };
  });
  const pct = Math.round((idx / (STAGES.length - 1)) * 100);

  return (
    <div>
      <div className="xl:hidden">
        <p className="text-sm font-semibold">Stage {idx + 1} of {STAGES.length}: {STAGES[idx].label}</p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-soft" aria-hidden>
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol aria-label="Case stages" className="hidden gap-2 xl:grid xl:grid-cols-9">
        {steps.map((s) => (
          <li key={s.id} aria-current={s.state === "current" ? "step" : undefined} className="min-w-0">
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${CIRCLE[s.state]}`}>
              {s.state === "done" ? <Check size={18} aria-label="Completed" /> : s.n}
            </div>
            <p className={`text-[13px] leading-snug ${s.state === "current" ? "font-bold text-ink" : "text-ink-muted"}`}>
              {s.label}
              {s.state === "skipped" && <span className="block text-xs">Skipped for Visit</span>}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
