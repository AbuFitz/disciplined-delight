import { createFileRoute } from "@tanstack/react-router";
import { Info, Moon } from "lucide-react";
import { AppShell } from "@/components/sunrise/AppShell";
import { Callout, PageHeader } from "@/components/sunrise/ui";
import { SKELETON } from "@/lib/sunrise-data";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

function SchedulePage() {
  return (
    <AppShell>
      <PageHeader
        title="Schedule"
        note="The weekday timeline — Fajr wake-up, gym, work, wind-down."
      />

      <div className="px-5">
        {SKELETON.map((s, i) => (
          <div key={s.time + i} className="flex gap-3.5">
            <div className="flex flex-col items-center pt-1.5">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.highlight ? "bg-primary" : "bg-border"}`}
              />
              {i !== SKELETON.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className={`min-w-0 flex-1 ${i === SKELETON.length - 1 ? "" : "pb-5"}`}>
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

      <div className="mx-5 mt-2 space-y-3">
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
