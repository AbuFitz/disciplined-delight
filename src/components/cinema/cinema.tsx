import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from "react";
import { useHaptics } from "@/components/buddy/useHaptics";
import {
  CHARGE,
  COPY,
  NODES,
  NODE_FOR_SCENE,
  PATH_D,
  type Action,
  type Ready,
  type Scene,
  type State,
} from "./model";
import { SignalGlyph } from "./glyph";
import "./cinema.css";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";
export type CinemaProps = {
  s: State;
  act: (a: Action) => void;
  reduced: boolean;
  mode: "dark" | "light";
  low: boolean;
  time: TimeOfDay;
  world: string;
};

const PANES: Record<string, Scene[]> = { arrive: ["arrive"], ready: ["ready"], now: ["now"] };
const GYM: Scene[] = ["enter", "gym", "rest"];
const PROGRESS: Record<Scene, number> = {
  arrive: 0.03,
  ready: 0.03,
  now: 0.68,
  enter: 0.68,
  gym: 0.68,
  rest: 0.68,
  story: 0.98,
};

function Pane({ id, scene, children }: { id: string; scene: Scene; children: ReactNode }) {
  const active = PANES[id]!.includes(scene);
  return (
    <section
      className={`cn-pane cn-${id}`}
      data-active={active}
      inert={!active}
      aria-hidden={!active}
    >
      {children}
    </section>
  );
}

const ORDER: Ready[] = ["tired", "okay", "fresh"];
const POS: Record<Ready, number> = { tired: 0.14, okay: 0.5, fresh: 0.86 };

/** Ambient Athletic Cinema: a responsive environment, not a dashboard. */
export function Cinema({ s, act, reduced, mode, low, time, world }: CinemaProps) {
  const uid = useId().replace(/:/g, "");
  const haptic = useHaptics();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [live, setLive] = useState<number | null>(null);
  const lastBand = useRef(-1);
  const node = NODE_FOR_SCENE[s.scene];
  const gym = GYM.includes(s.scene);
  const charge = live !== null ? 0.2 + live * 0.8 : s.ready ? CHARGE[s.ready] : 0.3;
  const readyLabel = COPY.ready.find((r) => r.id === s.ready)?.label;
  const note = COPY.ready.find((r) => r.id === s.ready)?.note;
  const progress = PROGRESS[s.scene];
  const head = (() => {
    // the head sits on the node for the current moment
    const [x, y] = NODES[node]!;
    return { x, y };
  })();
  const C = COPY.assistant;

  const onMove = (e: RPointerEvent) => {
    if (reduced || low || e.pointerType === "touch") return;
    const el = root.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
      el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
    });
  };

  // Readiness: direct manipulation. The Dayline is charged live as the thumb moves.
  const setFromPointer = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setLive(v);
    const band = v < 0.33 ? 0 : v < 0.67 ? 1 : 2;
    if (band !== lastBand.current) {
      if (lastBand.current !== -1) haptic("selection");
      lastBand.current = band;
    }
  };
  const release = () => {
    if (live === null) return;
    const band = live < 0.33 ? 0 : live < 0.67 ? 1 : 2;
    setLive(null);
    lastBand.current = -1;
    act({ type: "choose", ready: ORDER[band]! });
  };

  useEffect(() => {
    if (s.assist === "preview")
      root.current?.querySelector<HTMLButtonElement>(".cn-confirm")?.focus({ preventScroll: true });
  }, [s.assist]);

  const swapped = s.applied;
  const planMeta = swapped ? COPY.meta30 : COPY.meta45;
  const announce =
    s.scene === "story"
      ? `${COPY.story.title}. ${COPY.story.recovery}`
      : s.assist === "preview"
        ? `${C.previewTitle}: ${C.summary}`
        : s.scene === "rest"
          ? `${COPY.rest.label}. ${s.restDone ? COPY.rest.logged : COPY.rest.next}`
          : s.undoOpen
            ? C.applied
            : "";

  return (
    <div
      ref={root}
      className="cn"
      data-scene={s.scene}
      data-mode={mode}
      data-time={time}
      data-world={world}
      data-ready={s.ready ?? "none"}
      data-assist={s.assist}
      data-gym={gym}
      data-applied={swapped}
      data-set-done={s.setDone}
      data-rest-done={s.restDone}
      data-reduced={reduced}
      data-low={low}
      data-dragging={live !== null}
      onPointerMove={onMove}
      style={
        { "--charge": charge.toFixed(3), "--progress": progress, "--node": node } as CSSProperties
      }
    >
      {/* Atmosphere: resolves first. Sky, aurora ribbons, volumetric rays, depth planes with lanes, grain. */}
      <div className="cn-atmos" aria-hidden>
        <div className="cn-sky" />
        <div className="cn-rib cn-rib-1" />
        <div className="cn-rib cn-rib-2" />
        <div className="cn-rib cn-rib-3" />
        <div className="cn-rays" />
        <svg className="cn-planes" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${uid}-far`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="cn-far-0" />
              <stop offset="1" className="cn-far-1" />
            </linearGradient>
            <linearGradient id={`${uid}-near`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="cn-near-0" />
              <stop offset="1" className="cn-near-1" />
            </linearGradient>
          </defs>
          <path
            className="cn-hill cn-hill-far"
            fill={`url(#${uid}-far)`}
            d="M0 66 C14 58 26 62 40 57 S66 52 80 58 S94 56 100 54 V100 H0Z"
          />
          <g className="cn-lanes">
            {[-46, -22, 0, 22, 46].map((d) => (
              <line key={d} x1={50 + d * 0.16} y1="62" x2={50 + d * 2.1} y2="100" />
            ))}
          </g>
          <path
            className="cn-hill cn-hill-near"
            fill={`url(#${uid}-near)`}
            d="M0 84 C18 78 34 86 52 81 S84 76 100 82 V100 H0Z"
          />
        </svg>
        <div className="cn-horizon" />
        <div className="cn-grain" />
        <div className="cn-bloom" />
      </div>
      <div className="cn-portal" aria-hidden />

      <header className="cn-top">
        <span className="cn-brand">VAYVOR</span>
        <span className="cn-date">{COPY.date}</span>
      </header>

      {/* Dayline: an energy path. Readiness charges it; the head sits on the current moment. */}
      <section className="cn-day" aria-label="Your day">
        <div className="cn-pathbox">
          <svg viewBox="0 0 100 34" className="cn-path" aria-hidden>
            <defs>
              <linearGradient id={`${uid}-e`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" className="cn-e-0" />
                <stop offset="0.55" className="cn-e-1" />
                <stop offset="1" className="cn-e-2" />
              </linearGradient>
            </defs>
            <path className="cn-lane" d={PATH_D} />
            <path className="cn-ahead cn-ahead-glow" d={PATH_D} />
            <path className="cn-ahead" d={PATH_D} />
            <path
              className="cn-behind cn-behind-glow"
              d={PATH_D}
              pathLength={100}
              stroke={`url(#${uid}-e)`}
            />
            <path className="cn-behind" d={PATH_D} pathLength={100} stroke={`url(#${uid}-e)`} />
            {s.pulse > 0 && !reduced && <circle key={s.pulse} className="cn-spark" r="1.5" />}
            {NODES.map(([x, y], i) => (
              <g
                key={i}
                className="cn-node"
                data-state={i < node ? "done" : i === node ? "current" : "next"}
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <circle className="cn-node-halo" r="3.4" />
                <circle className="cn-node-dot" r="1.5" />
              </g>
            ))}
            <g className="cn-head" style={{ transform: `translate(${head.x}px, ${head.y}px)` }}>
              <circle className="cn-head-halo" r="4.6" />
              <circle className="cn-head-core" r="1.9" />
            </g>
          </svg>
          <ol className="cn-labels" aria-label="Your day">
            {COPY.dayline.map((n, i) => (
              <li
                key={n.id}
                data-state={i < node ? "done" : i === node ? "current" : "next"}
                data-align={i === 0 ? "start" : i === 3 ? "end" : "mid"}
                style={{ left: `${NODES[i]![0]}%` }}
                aria-current={i === node ? "step" : undefined}
              >
                <span className="cn-lab">{n.label}</span>
                <span className="cn-val">
                  {n.id === "readiness"
                    ? (readyLabel ?? "")
                    : n.id === "plan"
                      ? s.ready
                        ? swapped
                          ? "30 min"
                          : COPY.planTitle
                        : ""
                      : n.id === "now"
                        ? node >= 2
                          ? COPY.begin
                          : ""
                        : s.scene === "story"
                          ? "Now"
                          : "Tonight"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <main className="cn-stage">
        <Pane id="arrive" scene={s.scene}>
          <h2 className="cn-hero">
            {COPY.greeting.map((w, i) => (
              <span key={w} style={{ "--i": i } as CSSProperties}>
                {w}
              </span>
            ))}
          </h2>
        </Pane>

        <Pane id="ready" scene={s.scene}>
          <h2 className="cn-ask">{COPY.question}</h2>
          <div className="cn-charge">
            <div
              ref={track}
              className="cn-track"
              role="slider"
              tabIndex={0}
              aria-label={COPY.question}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={s.ready ? ORDER.indexOf(s.ready) : 1}
              aria-valuetext={readyLabel ?? "Not set"}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setFromPointer(e.clientX);
              }}
              onPointerMove={(e) => e.buttons && setFromPointer(e.clientX)}
              onPointerUp={release}
              onPointerCancel={() => setLive(null)}
              onKeyDown={(e) => {
                const i = ORDER.indexOf(s.ready ?? "okay");
                if (e.key === "ArrowRight" || e.key === "ArrowUp")
                  act({ type: "choose", ready: ORDER[Math.min(2, i + 1)]! });
                if (e.key === "ArrowLeft" || e.key === "ArrowDown")
                  act({ type: "choose", ready: ORDER[Math.max(0, i - 1)]! });
              }}
            >
              <span className="cn-track-rail" aria-hidden />
              <span
                className="cn-track-fill"
                aria-hidden
                style={{ transform: `scaleX(${live ?? (s.ready ? POS[s.ready] : 0)})` }}
              />
              <span
                className="cn-thumb"
                aria-hidden
                style={{ left: `${(live ?? (s.ready ? POS[s.ready] : 0.5)) * 100}%` }}
              />
            </div>
            <div className="cn-detents" role="radiogroup" aria-label={COPY.question}>
              {ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={s.ready === id}
                  data-on={s.ready === id}
                  onClick={() => act({ type: "choose", ready: id })}
                >
                  {COPY.ready.find((r) => r.id === id)!.label}
                </button>
              ))}
            </div>
          </div>
        </Pane>

        <Pane id="now" scene={s.scene}>
          <p className="cn-kicker">{note}</p>
          <h2 className="cn-title">{COPY.planTitle}</h2>
          <p className="cn-meta">{planMeta}</p>
          <button type="button" className="cn-begin" onClick={() => act({ type: "begin" })}>
            <span className="cn-begin-glow" aria-hidden />
            <span>{COPY.begin}</span>
          </button>
        </Pane>
      </main>

      {/* Gym Mode: edge to edge, low attention. The numbers are the interface. */}
      <section
        className="cn-gym"
        data-active={gym}
        inert={!gym}
        aria-hidden={!gym}
        data-hold={s.assist !== "closed"}
      >
        <div className="cn-edge" aria-hidden>
          <span className="cn-edge-rail" />
          <span
            className="cn-edge-fill"
            style={{ transform: `scaleX(${s.setDone ? 0.34 : 0.04})` }}
          />
          {s.pulse > 0 && !reduced && <span key={s.pulse} className="cn-edge-pulse" />}
          {[0, 1, 2].map((i) => (
            <i key={i} data-on={s.setDone && i === 0} />
          ))}
        </div>
        <div className="cn-gym-head">
          <p className="cn-kicker">{COPY.gym.set}</p>
          <h2 className="cn-title cn-swap" data-applied={swapped}>
            <span className="cn-old">{COPY.gym.exercise}</span>
            <span className="cn-new">{COPY.gym.swapped}</span>
          </h2>
        </div>
        <div className="cn-figs" data-rest={s.scene === "rest"}>
          <p>
            <span className="cn-num cn-swap" data-applied={swapped}>
              <span className="cn-old">{COPY.gym.load}</span>
              <span className="cn-new">{COPY.gym.swappedLoad}</span>
            </span>
            <span className="cn-unit">{COPY.gym.unit}</span>
          </p>
          <p>
            <span className="cn-num cn-swap" data-applied={swapped}>
              <span className="cn-old">{COPY.gym.reps}</span>
              <span className="cn-new">{COPY.gym.swappedReps}</span>
            </span>
            <span className="cn-unit">{COPY.gym.repsUnit}</span>
          </p>
        </div>
        <p className="cn-cue cn-swap" data-applied={swapped} data-rest={s.scene === "rest"}>
          <span className="cn-old">{COPY.gym.cue}</span>
          <span className="cn-new">{COPY.gym.swappedCue}</span>
        </p>
        <button
          type="button"
          className="cn-done"
          data-done={s.setDone}
          disabled={s.scene !== "gym" || s.setDone || s.assist !== "closed"}
          onClick={() => act({ type: "doneSet" })}
          aria-label={COPY.gym.done}
        >
          <span className="cn-done-edge" aria-hidden />
          <span className="cn-done-label">{s.setDone ? "✓" : COPY.gym.done}</span>
        </button>

        <div className="cn-rest" data-on={s.scene === "rest"} data-done={s.restDone} role="status">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle className="cn-rest-halo" cx="50" cy="50" r="46" />
            <circle className="cn-rest-track" cx="50" cy="50" r="42" />
            <circle className="cn-rest-arc" cx="50" cy="50" r="42" pathLength={100} />
          </svg>
          <div className="cn-rest-text">
            <span className="cn-kicker">{COPY.rest.label}</span>
            <span className="cn-rest-count" aria-label={`${COPY.rest.seconds} seconds`} />
            <span className="cn-rest-msg">{s.restDone ? COPY.rest.logged : COPY.rest.next}</span>
            <button
              type="button"
              className="cn-finish"
              data-show={s.restDone}
              tabIndex={s.restDone ? 0 : -1}
              onClick={() => act({ type: "finish" })}
            >
              {COPY.finish}
            </button>
          </div>
        </div>
      </section>

      {/* Assistant signal: appears in Gym Mode, expands into a command surface, previews, confirms, disappears. */}
      <button
        type="button"
        className="cn-signal"
        data-show={s.scene === "gym" && s.assist === "closed" && !s.setDone}
        tabIndex={s.scene === "gym" && s.assist === "closed" && !s.setDone ? 0 : -1}
        aria-label={`${C.name}: ${C.invoke}`}
        onClick={() => act({ type: "invoke" })}
      >
        <span className="cn-signal-halo" aria-hidden />
        <SignalGlyph size={30} />
      </button>

      <div
        className="cn-assist"
        data-open={s.assist !== "closed"}
        data-phase={s.assist}
        role="dialog"
        aria-label={C.name}
        inert={s.assist === "closed"}
      >
        <span className="cn-assist-edge" aria-hidden />
        <div className="cn-assist-head">
          <span className="cn-assist-glyph" data-phase={s.assist}>
            <SignalGlyph size={26} />
            <span className="cn-wave" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} style={{ "--i": i } as CSSProperties} />
              ))}
            </span>
          </span>
          <p className="cn-assist-status" aria-live="polite">
            {s.assist === "listening"
              ? s.typed > 0
                ? "Heard you"
                : C.listening
              : s.assist === "preview"
                ? "Here is the change"
                : s.assist === "applied"
                  ? "Done"
                  : ""}
          </p>
        </div>
        <p className="cn-say" aria-label="Command">
          {s.typed > 0 ? C.command.slice(0, s.typed) : <span>{C.placeholder}</span>}
        </p>
        <ul
          className="cn-diff"
          data-show={s.assist === "preview" || s.assist === "applied"}
          aria-label={C.previewTitle}
        >
          {C.rows.map((r, i) => (
            <li
              key={r.id}
              data-kind={r.kind}
              data-applied={swapped}
              style={{ "--i": i } as CSSProperties}
            >
              <span className="cn-diff-tag">
                {r.kind === "swap" ? "Swap" : r.kind === "drop" ? "Remove" : "Keep"}
              </span>
              <span className="cn-diff-text">
                <span className="cn-diff-from">{r.from}</span>
                {r.kind === "swap" && <span className="cn-diff-to">{r.to}</span>}
              </span>
              <span className="cn-diff-why">{r.why}</span>
            </li>
          ))}
          <li className="cn-diff-total">
            <span>{C.summary}</span>
            <span className="cn-diff-note">Machine busy · 30 minutes</span>
          </li>
        </ul>
        <div className="cn-assist-actions" data-show={s.assist === "preview"}>
          <button
            type="button"
            className="cn-confirm"
            onClick={() => act({ type: "confirm" })}
            tabIndex={s.assist === "preview" ? 0 : -1}
          >
            {C.confirm}
          </button>
          <button
            type="button"
            className="cn-ghost"
            onClick={() => act({ type: "cancel" })}
            tabIndex={s.assist === "preview" ? 0 : -1}
          >
            {C.cancel}
          </button>
        </div>
        {s.assist === "listening" && (
          <div className="cn-assist-actions" data-show="true">
            <button type="button" className="cn-ghost" onClick={() => act({ type: "preview" })}>
              Use this example
            </button>
            <button type="button" className="cn-ghost" onClick={() => act({ type: "cancel" })}>
              {C.cancel}
            </button>
          </div>
        )}
      </div>

      <div className="cn-undo" data-open={s.undoOpen} role="status" inert={!s.undoOpen}>
        <span>{C.applied}</span>
        <button type="button" onClick={() => act({ type: "undo" })}>
          {C.undo}
        </button>
      </div>

      <section
        className="cn-story"
        data-active={s.scene === "story"}
        inert={s.scene !== "story"}
        aria-hidden={s.scene !== "story"}
      >
        <p className="cn-kicker">{COPY.date}</p>
        <h2 className="cn-hero cn-story-title">{COPY.story.title}</h2>
        <dl className="cn-metrics">
          {COPY.story.metrics.map((m) => (
            <div key={m.label}>
              <dd>
                <span>{m.value}</span>
                {"unit" in m && <small>{m.unit}</small>}
              </dd>
              <dt>{m.label}</dt>
            </div>
          ))}
        </dl>
        <p className="cn-adapted">{COPY.story.adapted}</p>
        <p className="cn-recover">{COPY.story.recovery}</p>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
