import { useEffect, useState } from "react";
import { getAccentWorld, setAccentWorld, type AccentWorld } from "@/lib/theme";
import { WORLDS } from "@/lib/colour-worlds";
import { cn } from "@/lib/utils";

/** Colour worlds drive the accent and action roles across the app, Buddy included. */
export function ColourWorldPicker({ onChange }: { onChange?: (world: AccentWorld) => void }) {
  const [world, setWorld] = useState<AccentWorld>("cobalt");
  useEffect(() => setWorld(getAccentWorld()), []);
  return (
    <fieldset className="world-picker">
      <legend className="eyebrow mb-2">Colour world</legend>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
        {WORLDS.map((w) => (
          <label key={w.id} className={cn("world-opt", world === w.id && "is-on")}>
            <input
              type="radio"
              name="colour-world"
              className="sr-only"
              checked={world === w.id}
              onChange={() => {
                setWorld(w.id);
                setAccentWorld(w.id);
                onChange?.(w.id);
              }}
            />
            <span className="world-chip" aria-hidden>
              <i style={{ background: w.swatch[0] }} />
              <i style={{ background: w.swatch[1] }} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{w.name}</span>
              <span className="block text-xs text-muted-foreground">{w.note}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
