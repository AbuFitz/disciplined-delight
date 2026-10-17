import { useEffect, useMemo } from "react";
import { Button } from "./ui";
import { BuddyCharacter } from "@/components/buddy/BuddyCharacter";
import { useBuddyMotion } from "@/components/buddy/useBuddy";
import type { BuddyState } from "@/domain/buddy/state";
import { put } from "@/data/db";
import { useCollection, useNow, useProfile } from "@/data/hooks";
import { COL } from "@/data/types";
import {
  buddyGuidance,
  eventId,
  type BuddyEvent,
  type BuddyGuidanceRecord,
} from "@/domain/companion-guidance";
import { normaliseCompanion, type CompanionConfig } from "@/domain/companion";
import { localMinutes } from "@/domain/dates";
import { cn } from "@/lib/utils";

const STATE_FOR: Record<BuddyEvent["kind"], BuddyState> = {
  readiness: "listen",
  adaptation: "think",
  gym_start: "point",
  first_set: "encourage",
  rest: "breathe",
  return_after_gap: "recover",
  library_saved: "point",
  workout_complete: "celebrate",
  missed_session: "recover",
};

export function BuddyGuide({ event, compact = false }: { event: BuddyEvent; compact?: boolean }) {
  const configs = useCollection<CompanionConfig>(COL.companion);
  const records = useCollection<BuddyGuidanceRecord>(COL.buddyGuidance);
  const { profile } = useProfile();
  const now = useNow(60_000);
  const config = useMemo(
    () => normaliseCompanion(configs.items.find((item) => item.id === "main")),
    [configs.items],
  );
  const motion = useBuddyMotion(config);
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
        <BuddyCharacter
          form={config.form}
          state={STATE_FOR[event.kind]}
          motion={motion}
          palette={config.palette}
          expression={config.expression}
          size={compact ? 44 : 56}
          name={config.name}
        />
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
