import { Check, LockKeyhole } from "lucide-react";
import { Group, Section } from "./ui";
import { nextMilestone, type Milestone } from "@/domain/milestones";
import { cn } from "@/lib/utils";

export function MilestoneLedger({ milestones }: { milestones: Milestone[] }) {
  const earned = milestones.filter((milestone) => milestone.earned).length;
  const next = nextMilestone(milestones);

  return (
    <Section
      title="Milestones"
      action={
        <p
          className="tnum text-sm text-muted-foreground"
          aria-label={`${earned} of ${milestones.length} earned`}
        >
          <strong className="text-base text-foreground">{earned}</strong> / {milestones.length}
        </p>
      }
    >
      <div aria-labelledby="milestone-title">
        <p id="milestone-title" className="sr-only">
          Private milestone ledger
        </p>
        <p className="mb-3 px-1 text-sm text-muted-foreground">
          Private, from records on this account. Nothing is posted to Circle, and missing days never
          become failures.
        </p>

        {next && (
          <div className="mb-3 rounded-3xl bg-primary/15 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">Next up</p>
                <p className="text-lg font-bold leading-tight tracking-tight">{next.title}</p>
              </div>
              <p className="tnum text-sm text-muted-foreground">{next.progressLabel}</p>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-foreground/10"
              role="progressbar"
              aria-label={`${next.title}: ${next.progressLabel}`}
              aria-valuenow={Math.min(next.current, next.target)}
              aria-valuemin={0}
              aria-valuemax={next.target}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (next.current / next.target) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <Group
          as="ul"
          className="md:grid md:grid-cols-2 md:[&>*+*]:border-t-0 md:[&>*]:border-t md:[&>*:nth-child(-n+2)]:border-t-0"
        >
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3",
                !milestone.earned && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                  milestone.earned ? "bg-primary text-primary-foreground" : "bg-foreground/10",
                )}
              >
                {milestone.earned ? (
                  <Check className="size-5" aria-label="Earned" />
                ) : (
                  <LockKeyhole className="size-4" aria-label="Not earned yet" />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{milestone.title}</p>
                <p className="text-sm">{milestone.body}</p>
                {!milestone.earned && (
                  <p className="tnum mt-1 text-xs">{milestone.progressLabel}</p>
                )}
              </div>
            </li>
          ))}
        </Group>
      </div>
    </Section>
  );
}
