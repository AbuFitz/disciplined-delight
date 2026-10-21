/**
 * Experience lab (development only). Three prototypes of the same Today -> Gym transition driven by one shared
 * model, so the experience is compared, not the wording. URL params make every view reproducible for review:
 *   ?p=a|b|c|all  &w=320|390|desk  &theme=dark|light  &rm=1  &low=1  &seek=<ms>  &chrome=0  &autoplay=0|1  &loop=1
 */
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { COPY, DURATION, SCENES } from "./model";
import { ProtoA } from "./proto-a";
import { ProtoB } from "./proto-b";
import { ProtoC } from "./proto-c";
import type { ProtoProps } from "./types";
import { useExperience } from "./use-experience";
import { WORLDS } from "@/lib/colour-worlds";
import { setAccentWorld, type AccentWorld } from "@/lib/theme";
import "./lab.css";

const PROTOS: { id: "a" | "b" | "c"; name: string; line: string; C: ComponentType<ProtoProps> }[] =
  [
    {
      id: "a",
      name: "A · Atmospheric spatial calm",
      line: "A layered environment. The Dayline is a luminous journey; one decision at a time.",
      C: ProtoA,
    },
    {
      id: "b",
      name: "B · Tactile instrument",
      line: "Physical control feel: dial, detents, keys, rolling readouts. Direct manipulation.",
      C: ProtoB,
    },
    {
      id: "c",
      name: "C · Warm editorial sanctuary",
      line: "Calm light, generous space, human reflection, living paper texture.",
      C: ProtoC,
    },
  ];
const SIZES = {
  "320": { w: 320, h: 640, label: "320" },
  "390": { w: 390, h: 780, label: "390" },
  desk: { w: 1080, h: 640, label: "Desktop" },
} as const;
type SizeId = keyof typeof SIZES;

const param = (k: string) =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(k);

export default function ExperienceLab() {
  const seekParam = param("seek");
  const [which, setWhich] = useState<"a" | "b" | "c" | "all">((param("p") as never) ?? "all");
  const [size, setSize] = useState<SizeId>(
    ((param("w") as SizeId) in SIZES ? param("w") : "390") as SizeId,
  );
  const [mode, setMode] = useState<"dark" | "light">(param("theme") === "light" ? "light" : "dark");
  const sysReduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState(param("rm") === "1" || sysReduced);
  const [low, setLow] = useState(param("low") === "1");
  const chrome = param("chrome") !== "0";
  const x = useExperience({
    autoplay: param("autoplay") !== "0" && seekParam === null,
    seek: seekParam !== null ? Number(seekParam) : undefined,
    loop: param("loop") === "1",
  });
  const [world, setWorld] = useState<AccentWorld>("cobalt");
  useEffect(() => {
    setAccentWorld(world);
  }, [world]);

  const shown = which === "all" ? PROTOS : PROTOS.filter((p) => p.id === which);
  const dim = SIZES[size];
  const sceneIndex = useMemo(
    () => SCENES.findIndex((s) => s.id === x.state.scene),
    [x.state.scene],
  );

  return (
    <div
      className="xl"
      data-chrome={chrome}
      data-mode={mode}
      style={{ "--frame-w": `${dim.w}px` } as CSSProperties}
    >
      {chrome && (
        <header className="xl-head">
          <p className="xl-kicker">Development only · /dev/experience-lab</p>
          <h1>Experience lab: Today → Gym</h1>
          <p className="xl-lede">
            Three prototypes of the same sequence, same copy and content. Tap inside a prototype to
            take over (haptics fire only for real taps and only if enabled in Buddy settings). Not
            shipped: in production this route renders the 404 page.
          </p>

          <div className="xl-bar" role="group" aria-label="Sequence">
            <button
              type="button"
              onClick={() =>
                x.mode === "playing"
                  ? x.pause()
                  : x.state.restDone && x.elapsed >= DURATION
                    ? x.restart()
                    : x.play()
              }
            >
              {x.mode === "playing" ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={x.restart}>
              Restart
            </button>
            <label className="xl-scrub">
              <span className="sr-only">Scrub the sequence</span>
              <input
                type="range"
                min={0}
                max={DURATION}
                step={50}
                value={x.elapsed}
                onChange={(e) => x.seekTo(Number(e.target.value))}
                aria-valuetext={`${(x.elapsed / 1000).toFixed(1)} seconds, ${SCENES[sceneIndex]?.label}`}
              />
            </label>
            <output className="xl-time">
              {(x.elapsed / 1000).toFixed(1)}s / {(DURATION / 1000).toFixed(0)}s ·{" "}
              {SCENES[sceneIndex]?.label}
              {x.mode === "interactive" ? " · interactive" : ""}
            </output>
            <label className="xl-sel">
              Speed
              <select value={x.speed} onChange={(e) => x.setSpeed(Number(e.target.value))}>
                {[0.5, 1, 1.5, 2].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="xl-bar" role="group" aria-label="View">
            {(["all", "a", "b", "c"] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={which === id}
                onClick={() => setWhich(id)}
              >
                {id === "all" ? "Compare" : id.toUpperCase()}
              </button>
            ))}
            <span className="xl-sep" aria-hidden />
            {(Object.keys(SIZES) as SizeId[]).map((id) => (
              <button key={id} type="button" aria-pressed={size === id} onClick={() => setSize(id)}>
                {SIZES[id].label}
              </button>
            ))}
            <span className="xl-sep" aria-hidden />
            <button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}>
              Dark
            </button>
            <button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}>
              Light
            </button>
            <span className="xl-sep" aria-hidden />
            <button type="button" aria-pressed={reduced} onClick={() => setReduced(!reduced)}>
              Reduced motion
            </button>
            <button type="button" aria-pressed={low} onClick={() => setLow(!low)}>
              Low power
            </button>
          </div>
          <div className="xl-bar" role="radiogroup" aria-label="Accent world">
            {WORLDS.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={world === w.id}
                onClick={() => setWorld(w.id)}
              >
                {w.name}
              </button>
            ))}
          </div>
          <p className="xl-log" aria-live="off">
            Haptic events (
            {x.log.length ? "real taps buzz only on supporting devices when enabled" : "none yet"}):{" "}
            {x.log.map((l) => `${l.kind}${l.real ? "" : "*"}`).join(" · ")}{" "}
            <span>(* = autoplay, never vibrates)</span>
          </p>
        </header>
      )}

      <div className="xl-stage">
        {shown.map(({ id, name, line, C }) => (
          <figure key={id} className="xl-fig">
            {chrome && (
              <figcaption>
                <strong>{name}</strong>
                <span>{line}</span>
              </figcaption>
            )}
            <div className="xl-frame" data-size={size} style={{ width: dim.w, height: dim.h }}>
              <C s={x.state} act={x.act} reduced={reduced} mode={mode} low={low} />
            </div>
          </figure>
        ))}
      </div>
      <p className="sr-only">
        {COPY.greeting} {COPY.question}
      </p>
    </div>
  );
}
