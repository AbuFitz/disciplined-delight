import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Moon,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader, Sheet } from "@/components/sunrise/ui";
import { formatStepTime, useScheduleState, type ScheduleStep } from "@/hooks/use-schedule-state";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const schedule = useScheduleState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingStep = schedule.steps.find((s) => s.id === editingId) ?? null;

  return (
    <AppShell>
      <PageHeader title="Schedule" note="Tap any step to change its time or details." />

      <div className="px-5">
        {schedule.steps.map((s, i) => (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center pt-4">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.highlight ? "bg-primary" : "bg-border"}`}
              />
              {i !== schedule.steps.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
            </div>
            <button
              onClick={() => setEditingId(s.id)}
              className={`mb-3 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border p-3.5 text-left shadow-soft transition-colors active:border-primary/50 ${
                s.highlight ? "border-primary/25 bg-accent/40" : "border-border bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-semibold text-primary">
                  {formatStepTime(s)}
                </div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                {s.detail && (
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {s.detail}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        ))}

        <button
          onClick={() => setEditingId(schedule.addStep())}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-xs font-semibold text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add step
        </button>
      </div>

      <div className="mx-5 mt-5 space-y-3">
        <Callout icon={Info}>
          <span className="font-semibold text-foreground">~7.5 hrs sleep,</span> even with the Fajr
          wake-up — because you go straight back down after prayer instead of scrolling.
        </Callout>

        <Callout icon={Moon}>
          <span className="font-semibold text-foreground">
            The phone rule matters more than the gym plan.
          </span>{" "}
          Charging it outside the room removes the decision entirely — you can't doomscroll
          something you can't reach.
        </Callout>
      </div>

      <Sheet open={!!editingStep} onClose={() => setEditingId(null)}>
        {editingStep && (
          <StepEditor
            step={editingStep}
            index={schedule.steps.findIndex((s) => s.id === editingStep.id)}
            count={schedule.steps.length}
            onChange={(patch) => schedule.updateStep(editingStep.id, patch)}
            onMove={(dir) => schedule.moveStep(editingStep.id, dir)}
            onDelete={() => {
              schedule.removeStep(editingStep.id);
              setEditingId(null);
            }}
          />
        )}
      </Sheet>
    </AppShell>
  );
}

function StepEditor({
  step,
  index,
  count,
  onChange,
  onMove,
  onDelete,
}: {
  step: ScheduleStep;
  index: number;
  count: number;
  onChange: (patch: Partial<ScheduleStep>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-5 pb-2 pt-2">
      <input
        value={step.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="What happens"
        className="w-full rounded-lg border-none bg-transparent font-display text-xl font-bold text-foreground focus:outline-none"
      />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Time
          </label>
          <input
            type="time"
            value={step.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-base font-semibold text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        {step.endTime !== undefined && (
          <div className="flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Until
            </label>
            <input
              type="time"
              value={step.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-base font-semibold text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() =>
            onChange({ endTime: step.endTime === undefined ? step.startTime : undefined })
          }
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            step.endTime !== undefined
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          {step.endTime !== undefined ? "Remove end time" : "+ End time"}
        </button>
        <button
          onClick={() => onChange({ approx: !step.approx })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            step.approx
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          ~ Approximate
        </button>
        <button
          onClick={() => onChange({ highlight: !step.highlight })}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            step.highlight
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          <Star className="h-3 w-3" fill={step.highlight ? "currentColor" : "none"} />
          Highlight
        </button>
      </div>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Note (optional)
      </label>
      <textarea
        value={step.detail}
        onChange={(e) => onChange({ detail: e.target.value })}
        placeholder="Add a short note"
        rows={2}
        className="mt-1 w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs font-semibold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete step
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
            className="rounded-lg border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move down"
            className="rounded-lg border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {step.key && (
        <div className="mt-3">
          <Callout icon={Sparkles} className="border-none bg-secondary">
            This is a key time — you can also change it quickly from Settings.
          </Callout>
        </div>
      )}
    </div>
  );
}
