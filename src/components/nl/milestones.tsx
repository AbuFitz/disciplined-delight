import { Check, LockKeyhole } from "lucide-react";
import { Eyebrow, Panel } from "./ui";
import { nextMilestone, type Milestone } from "@/domain/milestones";
import { cn } from "@/lib/utils";

export function MilestoneLedger({ milestones }: { milestones: Milestone[] }) {
  const earned = milestones.filter((milestone) => milestone.earned).length;
  const next = nextMilestone(milestones);

  return (
    <Panel tone="dusk" className="lg:col-span-2" aria-labelledby="milestone-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Private milestone ledger</Eyebrow>
          <h2 id="milestone-title" className="mt-1 font-display text-3xl font-semibold">
            The record, not the noise
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Calculated from records already on this account. Nothing here is posted to Circle, and
            missing days never become failures.
          </p>
        </div>
        <p className="font-mono text-sm" aria-label={`${earned} of ${milestones.length} earned`}>
          <strong className="text-3xl text-foreground">{earned}</strong> / {milestones.length}
        </p>
      </div>

      {next && (
        <div className="mt-6 border-y border-line py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Nearest marker
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{next.title}</p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{next.progressLabel}</p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-background/40"
            role="progressbar"
            aria-label={`${next.title}: ${next.progressLabel}`}
            aria-valuenow={Math.min(next.current, next.target)}
            aria-valuemin={0}
            aria-valuemax={next.target}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (next.current / next.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <ol className="mt-2 grid gap-x-8 sm:grid-cols-2">
        {milestones.map((milestone, index) => (
          <li
            key={milestone.id}
            className={cn(
              "grid grid-cols-[2rem_1fr_auto] gap-3 border-b border-line py-4",
              !milestone.earned && "text-muted-foreground",
            )}
          >
            <span className="font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <p className="font-semibold text-foreground">{milestone.title}</p>
              <p className="mt-1 text-sm">{milestone.body}</p>
              {!milestone.earned && (
                <p className="mt-2 font-mono text-xs">{milestone.progressLabel}</p>
              )}
            </div>
            {milestone.earned ? (
              <Check className="size-5 text-primary" aria-label="Earned" />
            ) : (
              <LockKeyhole className="size-4" aria-label="Not earned yet" />
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
