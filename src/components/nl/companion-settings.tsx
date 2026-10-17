import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Switch, TextInput } from "./ui";
import { BuddySetup } from "@/components/buddy/BuddySetup";
import { getCompanionConfig, saveCompanionConfig } from "@/data/companion";
import { put } from "@/data/db";
import { useCollection } from "@/data/hooks";
import { COL, type AppModule } from "@/data/types";
import { DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
import type { BuddyGuidanceRecord } from "@/domain/companion-guidance";

const MODULES: [AppModule, string][] = [
  ["training", "Training"],
  ["nutrition", "Nutrition"],
  ["mind", "Mind"],
  ["routines", "Routines"],
  ["community", "Community"],
];

export function CompanionSettings() {
  const [value, setValue] = useState<CompanionConfig>(DEFAULT_COMPANION);
  const [loaded, setLoaded] = useState(false);
  const records = useCollection<BuddyGuidanceRecord>(COL.buddyGuidance).items;
  const dock = records.find((r) => r.id === "dock");
  const sleeping = !!dock && ((dock.snoozedUntil ?? 0) > Date.now() || !!dock.dismissedAt);
  useEffect(() => {
    void getCompanionConfig().then((config) => {
      setValue(config);
      setLoaded(true);
    });
  }, []);
  return (
    <div className="grid gap-5" aria-busy={!loaded}>
      <BuddySetup value={value} onChange={setValue} />
      {value.enabled && (
        <>
          <section
            className="grid gap-3 border-t border-line pt-4"
            aria-label="Quiet hours and topics"
          >
            <h4 className="font-display text-base font-semibold">Quiet hours and topics</h4>
            <Switch
              label="Rest during quiet hours"
              hint="Buddy sleeps and stays silent, except for sync problems."
              checked={value.quiet.enabled}
              onChange={(enabled) => setValue({ ...value, quiet: { ...value.quiet, enabled } })}
            />
            {value.quiet.enabled && (
              <div className="flex gap-2">
                <TextInput
                  aria-label="Buddy quiet hours start"
                  type="time"
                  value={value.quiet.start}
                  onChange={(e) =>
                    setValue({ ...value, quiet: { ...value.quiet, start: e.target.value } })
                  }
                />
                <TextInput
                  aria-label="Buddy quiet hours end"
                  type="time"
                  value={value.quiet.end}
                  onChange={(e) =>
                    setValue({ ...value, quiet: { ...value.quiet, end: e.target.value } })
                  }
                />
              </div>
            )}
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Buddy may guide me on</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {MODULES.map(([id, label]) => (
                  <Switch
                    key={id}
                    label={label}
                    checked={value.modules.includes(id)}
                    onChange={(on) =>
                      setValue({
                        ...value,
                        modules: on
                          ? [...value.modules, id]
                          : value.modules.filter((item) => item !== id),
                      })
                    }
                  />
                ))}
              </div>
            </fieldset>
            <Switch
              label="Mute Buddy"
              hint="No unprompted speech, sound or celebration. You can still tap Buddy to open it."
              checked={value.muted}
              onChange={(muted) => setValue({ ...value, muted })}
            />
            {sleeping && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Buddy is snoozed or hidden for today.</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void put(COL.buddyGuidance, "dock", { id: "dock" })}
                >
                  Wake {value.name || "Buddy"}
                </Button>
              </div>
            )}
          </section>
          <p className="text-xs text-muted-foreground">
            Privacy: Buddy reads status only, such as whether a workout is planned or running. It
            cannot read journal text, health notes, account secrets or workout notes. It never
            assumes a faith or belief, and it never compares you with anyone but your past self.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!value.name.trim()}
          onClick={() =>
            void saveCompanionConfig({ ...value, name: value.name.trim() }).then(() =>
              toast.success(value.enabled ? "Buddy saved" : "Buddy is off"),
            )
          }
        >
          Save Buddy
        </Button>
        <Button variant="ghost" onClick={() => setValue({ ...DEFAULT_COMPANION, setupDone: true })}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
