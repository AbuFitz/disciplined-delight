import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout } from "@/components/sunrise/ui";
import { useScheduleState } from "@/hooks/use-schedule-state";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  const [editing, setEditing] = useState(false);
  const { steps, updateStep, addStep, removeStep, moveStep, resetToDefault } = useScheduleState();

  return (
    <AppShell>
      <div className="flex items-start justify-between px-5 pb-5 pt-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Schedule
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {editing
              ? "Edit any step — times shift with Fajr through the seasons."
              : "The weekday timeline — Fajr wake-up, gym, work, wind-down."}
          </p>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
            editing
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-secondary text-foreground"
          }`}
        >
          {editing ? (
            <>
              <X className="h-3.5 w-3.5" />
              Done
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </>
          )}
        </button>
      </div>

      {!editing && (
        <div className="px-5">
          {steps.map((s, i) => (
            <div key={s.id} className="flex gap-3.5">
              <div className="flex flex-col items-center pt-1.5">
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.highlight ? "bg-primary" : "bg-border"}`}
                />
                {i !== steps.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className={`min-w-0 flex-1 ${i === steps.length - 1 ? "" : "pb-5"}`}>
                <div className="text-[11px] font-mono font-semibold text-primary">{s.time}</div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                {s.detail && (
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {s.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-3 px-5">
          {steps.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-border bg-white p-3.5 shadow-soft">
              <div className="flex items-center gap-2">
                <input
                  value={s.time}
                  onChange={(e) => updateStep(s.id, { time: e.target.value })}
                  placeholder="Time"
                  className="w-28 rounded-lg border border-border bg-secondary px-2.5 py-1.5 font-mono text-xs font-semibold text-primary focus:border-primary focus:outline-none"
                />
                <input
                  value={s.label}
                  onChange={(e) => updateStep(s.id, { label: e.target.value })}
                  placeholder="What happens"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-sm font-semibold focus:border-primary focus:outline-none"
                />
              </div>
              <textarea
                value={s.detail}
                onChange={(e) => updateStep(s.id, { detail: e.target.value })}
                placeholder="Optional detail"
                rows={1}
                className="mt-2 w-full resize-none rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => updateStep(s.id, { highlight: !s.highlight })}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    s.highlight
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  <Star className="h-3 w-3" fill={s.highlight ? "currentColor" : "none"} />
                  Highlight
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveStep(s.id, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-lg p-1.5 text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveStep(s.id, 1)}
                    disabled={i === steps.length - 1}
                    aria-label="Move down"
                    className="rounded-lg p-1.5 text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeStep(s.id)}
                    aria-label="Remove step"
                    className="rounded-lg p-1.5 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              onClick={addStep}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </button>
            <button
              onClick={() => {
                if (confirm("Reset schedule to the default timeline?")) resetToDefault();
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-border px-4 py-3 text-xs font-semibold text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}

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
    </AppShell>
  );
}
