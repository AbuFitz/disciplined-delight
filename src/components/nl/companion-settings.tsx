import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button, Field, Select, Switch, TextInput } from "./ui";
import { getCompanionConfig, saveCompanionConfig } from "@/data/companion";
import { DEFAULT_COMPANION, type CompanionConfig } from "@/domain/companion";
import type { AppModule } from "@/data/types";
import { cn } from "@/lib/utils";

function Preview({ value }: { value: CompanionConfig }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/60 p-4"
      aria-label={`Preview of ${value.name}`}
    >
      <span
        className={cn(
          "grid size-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg",
          value.form === "totem" && "rounded-2xl",
          value.form === "spark" && "rotate-45 rounded-2xl [&>svg]:-rotate-45",
          value.palette === "amber" && "bg-amber-300 text-stone-950",
          value.palette === "violet" && "bg-violet-300 text-violet-950",
          value.motion !== "off" && "motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        )}
      >
        <Sparkles
          className={cn(
            "size-7",
            value.expression === "bright" && "scale-110",
            value.expression === "focused" && "scale-90",
          )}
        />
      </span>
      <div>
        <p className="font-display text-xl font-semibold">{value.name || "Buddy"}</p>
        <p className="text-sm text-muted-foreground">
          {value.tone === "direct"
            ? "Your next step is ready."
            : value.tone === "quiet"
              ? "Here when you need it."
              : "One useful step at a time."}
        </p>
      </div>
    </div>
  );
}

export function CompanionSettings() {
  const [value, setValue] = useState<CompanionConfig>(DEFAULT_COMPANION);
  useEffect(() => {
    void getCompanionConfig().then(setValue);
  }, []);
  const modules: [AppModule, string][] = [
    ["training", "Training"],
    ["nutrition", "Nutrition"],
    ["mind", "Mind"],
    ["routines", "Routines"],
    ["community", "Community"],
  ];
  return (
    <div className="grid gap-4">
      <Switch
        label="Enable companion"
        hint="Off by default. It reacts only to status signals, never private entry text."
        checked={value.enabled}
        onChange={(enabled) => setValue({ ...value, enabled })}
      />
      <Preview value={value} />
      <Field label="Name">
        <TextInput
          maxLength={24}
          value={value.name}
          onChange={(event) => setValue({ ...value, name: event.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Base form">
          <Select
            value={value.form}
            onChange={(event) =>
              setValue({ ...value, form: event.target.value as CompanionConfig["form"] })
            }
          >
            <option value="orb">Orb</option>
            <option value="totem">Totem</option>
            <option value="spark">Spark</option>
          </Select>
        </Field>
        <Field label="Colour palette">
          <Select
            value={value.palette}
            onChange={(event) =>
              setValue({ ...value, palette: event.target.value as CompanionConfig["palette"] })
            }
          >
            <option value="mint">Mint</option>
            <option value="amber">Amber</option>
            <option value="violet">Violet</option>
          </Select>
        </Field>
        <Field label="Expression">
          <Select
            value={value.expression}
            onChange={(event) =>
              setValue({
                ...value,
                expression: event.target.value as CompanionConfig["expression"],
              })
            }
          >
            <option value="calm">Calm</option>
            <option value="bright">Bright</option>
            <option value="focused">Focused</option>
          </Select>
        </Field>
        <Field label="Coaching tone">
          <Select
            value={value.tone}
            onChange={(event) =>
              setValue({ ...value, tone: event.target.value as CompanionConfig["tone"] })
            }
          >
            <option value="quiet">Quiet</option>
            <option value="direct">Direct</option>
            <option value="warm">Warm</option>
          </Select>
        </Field>
        <Field label="Energy">
          <Select
            value={value.energy}
            onChange={(event) =>
              setValue({ ...value, energy: event.target.value as CompanionConfig["energy"] })
            }
          >
            <option value="low">Low-key</option>
            <option value="medium">Balanced</option>
            <option value="high">High energy</option>
          </Select>
        </Field>
        <Field label="Intervention frequency">
          <Select
            value={value.frequency}
            onChange={(event) =>
              setValue({ ...value, frequency: event.target.value as CompanionConfig["frequency"] })
            }
          >
            <option value="minimal">Minimal</option>
            <option value="balanced">Balanced</option>
            <option value="active">Active</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Motion">
          <Select
            value={value.motion}
            onChange={(event) =>
              setValue({ ...value, motion: event.target.value as CompanionConfig["motion"] })
            }
          >
            <option value="off">Off</option>
            <option value="gentle">Gentle</option>
            <option value="full">Full</option>
          </Select>
        </Field>
        <Field label="Celebrations">
          <Select
            value={value.celebration}
            onChange={(event) =>
              setValue({
                ...value,
                celebration: event.target.value as CompanionConfig["celebration"],
              })
            }
          >
            <option value="off">Off</option>
            <option value="subtle">Subtle</option>
            <option value="full">Full</option>
          </Select>
        </Field>
        <Field label="Placement">
          <Select
            value={value.placement}
            onChange={(event) =>
              setValue({ ...value, placement: event.target.value as CompanionConfig["placement"] })
            }
          >
            <option value="setup">Setup guide only</option>
            <option value="dashboard">Dashboard resident</option>
            <option value="on_demand">On demand only</option>
          </Select>
        </Field>
      </div>
      <Switch
        label="Use quiet hours"
        checked={value.quiet.enabled}
        onChange={(enabled) => setValue({ ...value, quiet: { ...value.quiet, enabled } })}
      />
      {value.quiet.enabled && (
        <div className="flex gap-2">
          <TextInput
            aria-label="Companion quiet hours start"
            type="time"
            value={value.quiet.start}
            onChange={(event) =>
              setValue({ ...value, quiet: { ...value.quiet, start: event.target.value } })
            }
          />
          <TextInput
            aria-label="Companion quiet hours end"
            type="time"
            value={value.quiet.end}
            onChange={(event) =>
              setValue({ ...value, quiet: { ...value.quiet, end: event.target.value } })
            }
          />
        </div>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Allowed topics</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {modules.map(([id, label]) => (
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
      <p className="text-xs text-muted-foreground">
        Privacy: status only. The companion cannot read journal text, prayer history, health notes,
        account secrets or workout notes. Faith is never inferred or discussed.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!value.name.trim()}
          onClick={() =>
            void saveCompanionConfig({ ...value, name: value.name.trim() }).then(() =>
              toast.success("Companion settings saved"),
            )
          }
        >
          Save companion
        </Button>
        <Button variant="ghost" onClick={() => setValue(DEFAULT_COMPANION)}>
          Reset defaults
        </Button>
      </div>
    </div>
  );
}
