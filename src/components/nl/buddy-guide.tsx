import { useEffect, useMemo } from "react";
import { Button } from "./ui";
import { VIcon } from "./icon";
import { put } from "@/data/db";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL } from "@/data/types";
import {
  buddyGuidance,
  eventId,
  type BuddyEvent,
  type BuddyGuidanceRecord,
} from "@/domain/companion-guidance";
import { DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
import { localMinutes } from "@/domain/dates";
import { cn } from "@/lib/utils";

export function BuddyGuide({ event, compact = false }: { event: BuddyEvent; compact?: boolean }) {
  const configs = useCollection<CompanionConfig>(COL.companion);
  const records = useCollection<BuddyGuidanceRecord>(COL.buddyGuidance);
  const { profile } = useProfile();
  const now = useNow(60_000);
  const config = useMemo(
    () => ({ ...DEFAULT_COMPANION, ...configs.items.find((item) => item.id === "main") }),
    [configs.items],
  );
  const id = eventId(event);
  const record = records.items.find((item) => item.id === id);
  const guidance = buddyGuidance(
    config,
    event,
    record,
    now,
    localMinutes(now, profile?.timezone ?? "UTC"),
  );
  const visibleGuidanceId = guidance?.id;
  useEffect(() => {
    if (!visibleGuidanceId || record?.seenAt) return;
    return () => {
      void put(COL.buddyGuidance, id, {
        id,
        seenAt: Date.now(),
      } satisfies BuddyGuidanceRecord);
    };
  }, [visibleGuidanceId, record?.seenAt, id]);
  if (!guidance) return null;
  return (
    <aside
      className={cn("buddy-guide border-l-2 border-primary pl-4", compact ? "py-2" : "my-5 py-3")}
      aria-label={`${config.name} guidance`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-8 place-items-center bg-primary text-primary-foreground",
            config.form === "totem" && "rounded-sm",
            config.form === "spark" && "rotate-45 [&>svg]:-rotate-45",
            config.palette === "amber" && "bg-amber-300 text-stone-950",
            config.palette === "violet" && "bg-violet-300 text-violet-950",
            config.motion !== "off" &&
              "motion-safe:transition-transform motion-safe:hover:-translate-y-0.5",
          )}
        >
          <VIcon name="buddy" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{config.name} · context guide</p>
          <p className="mt-1 text-sm">{guidance.text}</p>
          <div className="mt-2 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void put(COL.buddyGuidance, id, {
                  id,
                  seenAt: record?.seenAt ?? now,
                  snoozedUntil: now + 4 * 60 * 60_000,
                })
              }
            >
              Snooze
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void put(COL.buddyGuidance, id, {
                  id,
                  seenAt: record?.seenAt ?? now,
                  dismissedAt: now,
                })
              }
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
