/**
 * Ambient Athletic Cinema lab (development only). One high-fidelity prototype of Today -> Gym -> assistant adaptation.
 * URL parameters make every view reproducible for review:
 *   ?w=320|390|desk &theme=dark|light &time=dawn|day|dusk|night &world=cobalt|... &rm=1 &low=1 &seek=<ms> &chrome=0 &autoplay=0|1 &loop=1
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Cinema, type TimeOfDay } from "./cinema";
import { DURATION, SCENES } from "./model";
import { useCinema } from "./use-cinema";
import { WORLDS } from "@/lib/colour-worlds";
import { setAccentWorld, type AccentWorld } from "@/lib/theme";
import "./lab.css";

const SIZES = {
  "320": { w: 320, h: 640, label: "320" },
  "390": { w: 390, h: 780, label: "390" },
  desk: { w: 1080, h: 640, label: "Desktop" },
} as const;
type SizeId = keyof typeof SIZES;
const TIMES: TimeOfDay[] = ["dawn", "day", "dusk", "night"];
const CHAPTERS: [string, number][] = [
  ["Atmosphere", 2000],
  ["Readiness", 4000],
  ["Charged", 6100],
  ["Now", 7700],
  ["Portal", 9000],
  ["Gym", 10300],
  ["Ask", 12100],
  ["Preview", 14400],
  ["Rewritten", 16100],
  ["Updated", 17900],
  ["Pulse", 18500],
  ["Rest", 20200],
  ["Story", 25000],
];

const param = (k: string) =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(k);

export default function CinemaLab() {
  const seekParam = param("seek");
  const [size, setSize] = useState<SizeId>(
    ((param("w") as SizeId) in SIZES ? param("w") : "390") as SizeId,
  );
  const [mode, setMode] = useState<"dark" | "light">(param("theme") === "light" ? "light" : "dark");
  const [time, setTime] = useState<TimeOfDay>(
    TIMES.includes(param("time") as TimeOfDay) ? (param("time") as TimeOfDay) : "dawn",
  );
  const [world, setWorld] = useState<AccentWorld>(
    WORLDS.some((w) => w.id === param("world")) ? (param("world") as AccentWorld) : "cobalt",
  );
  const sysReduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState(param("rm") === "1" || sysReduced);
  const [low, setLow] = useState(param("low") === "1");
  const chrome = param("chrome") !== "0";
  const x = useCinema({
    autoplay: param("autoplay") !== "0" && seekParam === null,
    seek: seekParam !== null ? Number(seekParam) : undefined,
    loop: param("loop") === "1",
  });
  useEffect(() => {
    setAccentWorld(world);
  }, [world]);
  const dim = SIZES[size];
  const scene = useMemo(() => SCENES.find((s) => s.id === x.state.scene)?.label, [x.state.scene]);

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
          <h1>Ambient Athletic Cinema</h1>
          <p className="xl-lede">
            One prototype of Today → Gym Mode → assistant adaptation. Tap inside to take over from
            autoplay; haptics fire only for real taps and only if enabled in Buddy settings. Voice
            is shown as a demo (typed as if spoken); no microphone is used. Not shipped: in
            production this route renders the 404 page.
          </p>
          <div className="xl-bar" role="group" aria-label="Sequence">
            <button
              type="button"
              onClick={() =>
                x.mode === "playing" ? x.pause() : x.elapsed >= DURATION ? x.restart() : x.play()
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
                aria-valuetext={`${(x.elapsed / 1000).toFixed(1)} seconds, ${scene}`}
              />
            </label>
            <output className="xl-time">
              {(x.elapsed / 1000).toFixed(1)}s / {(DURATION / 1000).toFixed(1)}s · {scene}
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
          <div className="xl-bar" role="group" aria-label="Chapters">
            {CHAPTERS.map(([name, t]) => (
              <button key={name} type="button" onClick={() => x.seekTo(t)}>
                {name}
              </button>
            ))}
          </div>
          <div className="xl-bar" role="group" aria-label="View">
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
            {TIMES.map((t) => (
              <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)}>
                {t}
              </button>
            ))}
            <span className="xl-sep" aria-hidden />
            <button type="button" aria-pressed={reduced} onClick={() => setReduced(!reduced)}>
              Reduced motion
            </button>
            <button type="button" aria-pressed={low} onClick={() => setLow(!low)}>
              Low power
            </button>
          </div>
          <div className="xl-bar" role="radiogroup" aria-label="Colour world">
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
            Haptic events:{" "}
            {x.log.map((l) => `${l.kind}${l.real ? "" : "*"}`).join(" · ") || "none yet"}{" "}
            <span>(* = autoplay, never vibrates)</span>
          </p>
        </header>
      )}
      <div className="xl-stage">
        <figure className="xl-fig">
          <div className="xl-frame" data-size={size} style={{ width: dim.w, height: dim.h }}>
            <Cinema
              s={x.state}
              act={x.act}
              reduced={reduced}
              mode={mode}
              low={low}
              time={time}
              world={world}
            />
          </div>
        </figure>
      </div>
    </div>
  );
}
