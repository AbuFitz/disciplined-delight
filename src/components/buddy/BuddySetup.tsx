import "./buddy.css";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Switch, TextInput } from "@/components/nl/ui";
import { WORLDS } from "@/lib/colour-worlds";
import type { CompanionConfig } from "@/domain/companion";
import { VARIANTS, VARIANT_IDS } from "@/domain/buddy/variants";
import { getArtPack } from "@/domain/buddy/art";
import { webHaptics } from "@/lib/haptics";
import { STATE_META, effectiveMotion, type BuddyState } from "@/domain/buddy/state";
import { canSpeak } from "@/lib/buddy-audio";
import { useReducedMotionPref } from "@/lib/media-prefs";
import { cn } from "@/lib/utils";
import { BuddyCharacter } from "./BuddyCharacter";

type Opt<T extends string> = { value: T; label: string; hint?: string };

function Options<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Opt<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className="opts">
      <legend className="eyebrow mb-1">{legend}</legend>
      <div className="opts-row">
        {options.map((o) => (
          <label key={o.value} className={cn("opt", value === o.value && "is-on")}>
            <input
              type="radio"
              className="sr-only"
              name={`${id}-${name}`}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="opt-mark" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const TRY: { state: BuddyState; label: string }[] = [
  { state: "enter", label: "Hello" },
  { state: "point", label: "Point" },
  { state: "think", label: "Think" },
  { state: "encourage", label: "Cheer on" },
  { state: "celebrate", label: "Celebrate" },
  { state: "breathe", label: "Breathe" },
  { state: "rest", label: "Sleep" },
  { state: "error", label: "Help" },
  { state: "recover", label: "Welcome back" },
  { state: "exit", label: "Wave off" },
];

const sample = (v: CompanionConfig) =>
  v.tone === "direct"
    ? "Next set is ready. Go when you are."
    : v.tone === "quiet"
      ? "Here when you need me."
      : "One useful step at a time. I've got your back.";

function Preview({ value }: { value: CompanionConfig }) {
  const [demo, setDemo] = useState<BuddyState>("idle");
  const reduced = useReducedMotionPref();
  const motion = effectiveMotion(value.motion, reduced);
  useEffect(() => {
    const hold = STATE_META[demo].hold;
    if (!hold) return;
    const id = setTimeout(() => setDemo("idle"), hold + 200);
    return () => clearTimeout(id);
  }, [demo]);
  return (
    <div data-testid="buddy-preview">
      <div className="buddy-stage">
        <BuddyCharacter
          variant={value.variant}
          state={demo}
          motion={motion}
          palette={value.palette}
          expression={value.expression}
          size={116}
          name={value.name || "Buddy"}
        />
        <div className="min-w-0 pb-2">
          <p className="font-display text-xl font-semibold">{value.name || "Buddy"}</p>
          <p className="text-sm text-muted-foreground">{sample(value)}</p>
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
            {STATE_META[demo].label}
            {reduced ? " · reduced motion: still poses" : ""}
          </p>
        </div>
      </div>
      <div className="buddy-try" role="group" aria-label="Try Buddy's moods">
        {TRY.map((t) => (
          <button
            key={t.state}
            type="button"
            aria-pressed={demo === t.state}
            onClick={() => setDemo(t.state)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Group({
  title,
  children,
  open,
  forceOpen,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  forceOpen?: boolean;
}) {
  if (forceOpen)
    return (
      <section className="grid gap-4 border-t border-line pt-4" aria-label={title}>
        <h4 className="font-display text-base font-semibold">{title}</h4>
        {children}
      </section>
    );
  return (
    <details open={open} className="border-t border-line pt-1">
      <summary className="flex min-h-11 cursor-pointer items-center font-display text-base font-semibold">
        {title}
      </summary>
      <div className="grid gap-4 pb-3 pt-2">{children}</div>
    </details>
  );
}

/**
 * Guided Buddy setup. Everything is optional: opt out, name, form, colour, voice, rhythm,
 * motion, sound and placement. `progressive` keeps the later groups collapsed for onboarding.
 */
export function BuddySetup({
  value,
  onChange,
  progressive = false,
}: {
  value: CompanionConfig;
  onChange: (next: CompanionConfig) => void;
  progressive?: boolean;
}) {
  const set = <K extends keyof CompanionConfig>(key: K, v: CompanionConfig[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="grid gap-4" data-testid="buddy-setup">
      <Switch
        label="Show Buddy"
        hint="A small companion that guides you on each screen. It only reads status, never what you write. You can turn it off any time."
        checked={value.enabled}
        onChange={(enabled) => set("enabled", enabled)}
      />
      {!value.enabled ? (
        <p className="text-sm text-muted-foreground">
          No problem. Buddy stays out of the way, and you can switch it on later in Settings.
        </p>
      ) : (
        <>
          <Preview value={value} />
          <fieldset className="opts">
            <legend className="eyebrow mb-1">Who joins you</legend>
            <div className="form-pick">
              {VARIANT_IDS.map((id) => {
                const v = VARIANTS[id];
                return (
                  <label key={id} className={cn("form-tile", value.variant === id && "is-on")}>
                    <input
                      type="radio"
                      className="sr-only"
                      name="buddy-variant"
                      checked={value.variant === id}
                      onChange={() =>
                        onChange({
                          ...value,
                          variant: id,
                          // Follow the default name only while the name is still some variant's default.
                          name: VARIANT_IDS.some((o) => VARIANTS[o].defaultName === value.name)
                            ? v.defaultName
                            : value.name,
                          expression: v.defaultExpression,
                        })
                      }
                    />
                    <BuddyCharacter
                      variant={id}
                      state="idle"
                      motion="off"
                      palette={value.palette}
                      expression={value.expression}
                      size={56}
                      decorative
                    />
                    <span className="text-sm font-semibold">{v.label}</span>
                    <span className="text-xs text-muted-foreground">{v.tagline}</span>
                  </label>
                );
              })}
            </div>
            {getArtPack().provisional && (
              <p className="mt-2 text-xs text-muted-foreground" data-testid="art-provisional">
                Provisional shapes: the final character art is still being made. Names, colours,
                motion and settings carry over when it arrives.
              </p>
            )}
          </fieldset>
          <label className="grid gap-1 text-sm font-semibold">
            Name
            <TextInput
              maxLength={24}
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <fieldset className="opts">
            <legend className="eyebrow mb-1">Buddy's colour</legend>
            <div className="opts-row">
              <label className={cn("opt", value.palette === "world" && "is-on")}>
                <input
                  type="radio"
                  className="sr-only"
                  name="buddy-palette"
                  checked={value.palette === "world"}
                  onChange={() => set("palette", "world")}
                />
                <span className="opt-mark" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">Match my colour world</span>
                  <span className="block text-xs text-muted-foreground">
                    Follows the colour you choose for the app
                  </span>
                </span>
              </label>
              {WORLDS.map((w) => (
                <label key={w.id} className={cn("opt", value.palette === w.id && "is-on")}>
                  <input
                    type="radio"
                    className="sr-only"
                    name="buddy-palette"
                    checked={value.palette === w.id}
                    onChange={() => set("palette", w.id)}
                  />
                  <span className="opt-mark" aria-hidden />
                  <span className="block text-sm font-semibold">{w.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Group title="Personality and voice" open={!progressive} forceOpen={!progressive}>
            <Options
              legend="Expression"
              name="expression"
              value={value.expression}
              onChange={(v) => set("expression", v)}
              options={[
                { value: "calm", label: "Calm", hint: "Soft eyes" },
                { value: "bright", label: "Bright", hint: "Rosy cheeks" },
                { value: "focused", label: "Focused", hint: "Steady brows" },
              ]}
            />
            <Options
              legend="Personality"
              name="personality"
              value={value.personality}
              onChange={(v) => set("personality", v)}
              options={[
                { value: "steady", label: "Steady", hint: "Plain and clear" },
                { value: "playful", label: "Playful", hint: "A little wit" },
                { value: "dry", label: "Dry", hint: "Understated" },
              ]}
            />
            <Options
              legend="Coaching tone"
              name="tone"
              value={value.tone}
              onChange={(v) => set("tone", v)}
              options={[
                { value: "quiet", label: "Quiet", hint: "Few words" },
                { value: "direct", label: "Direct", hint: "Short instructions" },
                { value: "warm", label: "Warm", hint: "Encouraging" },
              ]}
            />
            <Options
              legend="Intensity"
              name="energy"
              value={value.energy}
              onChange={(v) => set("energy", v)}
              options={[
                { value: "low", label: "Gentle", hint: "Low pressure" },
                { value: "medium", label: "Steady", hint: "Balanced" },
                { value: "high", label: "Driven", hint: "Pushes a little" },
              ]}
            />
          </Group>

          <Group title="How often and how lively" forceOpen={!progressive}>
            <Options
              legend="How often I speak up"
              name="frequency"
              value={value.frequency}
              onChange={(v) => set("frequency", v)}
              options={[
                { value: "minimal", label: "Rarely", hint: "Only important moments" },
                { value: "balanced", label: "Sometimes", hint: "Useful prompts" },
                { value: "active", label: "Often", hint: "Frequent guidance" },
              ]}
            />
            <Options
              legend="Movement"
              name="motion"
              value={value.motion}
              onChange={(v) => set("motion", v)}
              options={[
                { value: "off", label: "Still", hint: "Poses only" },
                { value: "gentle", label: "Gentle", hint: "Breathing and blinks" },
                { value: "full", label: "Lively", hint: "Full animation" },
              ]}
            />
            <Options
              legend="Celebrations"
              name="celebration"
              value={value.celebration}
              onChange={(v) => set("celebration", v)}
              options={[
                { value: "off", label: "Off" },
                { value: "subtle", label: "Subtle", hint: "A small tally mark" },
                { value: "full", label: "Full", hint: "Jump and confetti" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Your device's reduced-motion setting always wins and shows still poses.
            </p>
          </Group>

          <Group title="Sound and place" forceOpen={!progressive}>
            <Options
              legend="Sound"
              name="sound"
              value={value.sound}
              onChange={(v) => set("sound", v)}
              options={[
                { value: "off", label: "Silent", hint: "Default" },
                { value: "chime", label: "Soft chime", hint: "For wins and welcome-backs" },
                {
                  value: "voice",
                  label: "Voice",
                  hint: canSpeak()
                    ? "Reads lines with your device voice"
                    : "Not available on this device",
                },
              ]}
            />
            <Switch
              label="Haptic feedback"
              hint={
                webHaptics.capability() === "none"
                  ? "This device or browser can't vibrate (iOS Safari can't). You'll get the visual and sound feedback instead."
                  : "A short tick when you log a set, finish a rest or hit a personal best. Never for coaching tips. Separate from reduced motion."
              }
              checked={value.haptics}
              onChange={(haptics) => {
                set("haptics", haptics);
                if (haptics)
                  webHaptics.play("acknowledge", {
                    enabled: true,
                    muted: false,
                    quietHours: false,
                  });
              }}
            />
            <Options
              legend="Where Buddy lives"
              name="placement"
              value={value.placement}
              onChange={(v) => set("placement", v)}
              options={[
                { value: "dock_right", label: "Bottom right", hint: "Stays with you" },
                { value: "dock_left", label: "Bottom left", hint: "Stays with you" },
                { value: "inline", label: "In context", hint: "Only inside workouts and setup" },
                { value: "on_demand", label: "Only when tapped", hint: "A small tab, no prompts" },
              ]}
            />
          </Group>
        </>
      )}
    </div>
  );
}
