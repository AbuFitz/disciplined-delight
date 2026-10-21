import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { COPY, NODE_FOR_SCENE, type Ready, type SceneId } from "./model";
import type { ProtoProps } from "./types";
import "./proto-b.css";

const PANE: Record<string, SceneId[]> = {
  arrive: ["arrive"],
  ready: ["readiness"],
  adapt: ["adapt"],
  now: ["now"],
  gym: ["enter", "set", "rest"],
};
function Pane({ id, scene, children }: { id: string; scene: SceneId; children: ReactNode }) {
  const active = PANE[id]!.includes(scene);
  return (
    <section
      className={`xb-pane xb-${id}`}
      data-active={active}
      inert={!active}
      aria-hidden={!active}
    >
      {children}
    </section>
  );
}

/** One rolling digit: a strip of 0 to 9 behind a window. */
function Digit({ d }: { d: number }) {
  return (
    <span className="xb-digit" aria-hidden>
      <span className="xb-strip" style={{ "--d": d } as CSSProperties}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </span>
    </span>
  );
}
function Roll({ value, label }: { value: string; label: string }) {
  return (
    <span className="xb-roll" role="text" aria-label={label}>
      {[...value].map((c, i) =>
        /\d/.test(c) ? (
          <Digit key={i} d={Number(c)} />
        ) : (
          <span key={i} className="xb-sep" aria-hidden>
            {c}
          </span>
        ),
      )}
    </span>
  );
}

const DETENT: Record<Ready, number> = { fresh: -52, okay: 0, tired: 52 };
const nearest = (deg: number): Ready =>
  (Object.entries(DETENT) as [Ready, number][]).sort(
    (a, b) => Math.abs(a[1] - deg) - Math.abs(b[1] - deg),
  )[0]![0];

/** B: tactile instrument. Soft depth, detents, keys and rolling readouts; direct manipulation. */
export function ProtoB({ s, act, reduced, mode, low }: ProtoProps) {
  const node = NODE_FOR_SCENE[s.scene];
  const dial = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const angle = drag ?? (s.ready ? DETENT[s.ready] : 0);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    move(e);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.type === "pointermove") return;
    const r = dial.current!.getBoundingClientRect();
    const a =
      (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) *
        180) /
      Math.PI;
    setDrag(Math.max(-60, Math.min(60, a)));
  };
  const up = () => {
    if (drag === null) return;
    const r = nearest(drag);
    setDrag(null);
    act({ type: "choose", ready: r });
  };
  const sets = [0, 1, 2];
  return (
    <div
      className="xb"
      data-scene={s.scene}
      data-ready={s.ready ?? "none"}
      data-mode={mode}
      data-reduced={reduced}
      data-low={low}
      data-gym={PANE.gym!.includes(s.scene)}
      data-set-done={s.setDone}
      data-rest-done={s.restDone}
      data-dragging={drag !== null}
      style={{ "--node": node } as CSSProperties}
    >
      <div className="xb-grain" aria-hidden />

      <header className="xb-top">
        <span className="xb-read">{COPY.date}</span>
        <span className="xb-lamps" aria-hidden>
          {sets.map((i) => (
            <i
              key={i}
              data-on={
                (s.setDone && i === 0) ||
                (s.scene === "set" || s.scene === "rest" ? i === 0 && s.setDone : false)
              }
              data-live={PANE.gym!.includes(s.scene) && i === 0}
            />
          ))}
        </span>
      </header>

      <div className="xb-day">
        <ol className="xb-labels" aria-label="Your day">
          {COPY.dayline.map((n, i) => (
            <li key={n.id} aria-current={i === node ? "step" : undefined} data-on={i === node}>
              {n.label}
            </li>
          ))}
        </ol>
        <div className="xb-track" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} />
          ))}
          <span className="xb-thumb" />
        </div>
      </div>

      <main className="xb-stage">
        <Pane id="arrive" scene={s.scene}>
          <h2 className="xb-hero">{COPY.greeting}</h2>
        </Pane>

        <Pane id="ready" scene={s.scene}>
          <h2 className="xb-ask">{COPY.question}</h2>
          <div className="xb-dial-wrap">
            <div
              ref={dial}
              className="xb-dial"
              role="slider"
              tabIndex={0}
              aria-label={COPY.question}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={s.ready ? COPY.ready.findIndex((r) => r.id === s.ready) : 1}
              aria-valuetext={COPY.ready.find((r) => r.id === s.ready)?.label ?? "Not set"}
              onPointerDown={onDown}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => {
                const order: Ready[] = ["fresh", "okay", "tired"];
                const i = order.indexOf(s.ready ?? "okay");
                if (e.key === "ArrowRight" || e.key === "ArrowUp")
                  act({ type: "choose", ready: order[Math.min(2, i + 1)]! });
                if (e.key === "ArrowLeft" || e.key === "ArrowDown")
                  act({ type: "choose", ready: order[Math.max(0, i - 1)]! });
              }}
            >
              <svg viewBox="0 0 200 200" aria-hidden>
                {Array.from({ length: 21 }, (_, i) => {
                  const a = -60 + i * 6;
                  const major = i % 10 === 0 || i === 5 || i === 15;
                  return (
                    <line
                      key={i}
                      x1="100"
                      y1={major ? 8 : 12}
                      x2="100"
                      y2="20"
                      transform={`rotate(${a} 100 100)`}
                      className="xb-tick"
                      data-major={major}
                    />
                  );
                })}
              </svg>
              <div className="xb-knob" style={{ transform: `rotate(${angle}deg)` }}>
                <i />
              </div>
            </div>
            <div className="xb-detents" role="radiogroup" aria-label={COPY.question}>
              {COPY.ready.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={s.ready === r.id}
                  data-on={s.ready === r.id}
                  onClick={() => act({ type: "choose", ready: r.id })}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </Pane>

        <Pane id="adapt" scene={s.scene}>
          <h2 className="xb-title">{COPY.planTitle}</h2>
          <p className="xb-meta">
            <Roll value={s.applied ? "4" : "5"} label={s.applied ? "4" : "5"} /> exercises · about{" "}
            <Roll value={s.applied ? "35" : "45"} label={s.applied ? "35" : "45"} /> min
          </p>
          <div className="xb-buddy">
            <span className="xb-led" data-asking={s.typed > 0} aria-hidden />
            <div className="xb-window" aria-live="polite">
              {s.typed > 0 ? COPY.command.slice(0, s.typed) : <span>{COPY.hint}</span>}
            </div>
            <button
              type="button"
              className="xb-keysm"
              aria-label={`Ask Buddy: ${COPY.hint}`}
              onClick={() => act({ type: "preview", open: true })}
            >
              Ask
            </button>
            <button
              type="button"
              className="xb-skip"
              onClick={() => act({ type: "scene", scene: "now" })}
            >
              Skip
            </button>
          </div>
          <div
            className="xb-drawer"
            data-open={s.preview}
            role="dialog"
            aria-label={COPY.preview.title}
            inert={!s.preview}
          >
            <h3>{COPY.preview.title}</h3>
            <ul>
              {COPY.preview.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="xb-drawer-actions">
              <button
                type="button"
                role="switch"
                aria-checked={s.applied}
                className="xb-switch"
                onClick={() => act({ type: "confirm" })}
              >
                <span className="xb-switch-knob" aria-hidden />
                <span className="xb-switch-label">{COPY.preview.confirm}</span>
              </button>
              <button
                type="button"
                className="xb-skip"
                onClick={() => act({ type: "preview", open: false })}
              >
                {COPY.preview.cancel}
              </button>
            </div>
          </div>
        </Pane>

        <Pane id="now" scene={s.scene}>
          <h2 className="xb-title">{COPY.planTitle}</h2>
          <p className="xb-meta">
            <Roll value="4" label="4" /> exercises · about <Roll value="35" label="35" /> min
          </p>
          <button type="button" className="xb-key xb-begin" onClick={() => act({ type: "begin" })}>
            <span>{COPY.begin}</span>
          </button>
        </Pane>

        <Pane id="gym" scene={s.scene}>
          <div className="xb-gym-head">
            <span className="xb-read">{COPY.gym.set}</span>
            <h2 className="xb-title">{COPY.gym.exercise}</h2>
          </div>
          <div className="xb-wheels" data-rest={s.scene === "rest"}>
            <div className="xb-wheel">
              <Roll value={COPY.gym.load} label={`${COPY.gym.load} ${COPY.gym.unit}`} />
              <span className="xb-unit">{COPY.gym.unit}</span>
            </div>
            <div className="xb-wheel">
              <Roll value={COPY.gym.reps} label={`${COPY.gym.reps} ${COPY.gym.repsUnit}`} />
              <span className="xb-unit">{COPY.gym.repsUnit}</span>
            </div>
          </div>
          <p className="xb-cue">{COPY.gym.cue}</p>
          <button
            type="button"
            className="xb-key xb-done"
            data-down={s.setDone}
            disabled={s.scene !== "set" || s.setDone}
            onClick={() => act({ type: "doneSet" })}
          >
            <span>{s.setDone ? "✓" : COPY.gym.done}</span>
          </button>
          <div
            className="xb-rest"
            data-on={s.scene === "rest"}
            data-done={s.restDone}
            role="status"
          >
            <svg viewBox="0 0 200 200" aria-hidden>
              {Array.from({ length: 60 }, (_, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="10"
                  x2="100"
                  y2={i % 5 === 0 ? 26 : 20}
                  transform={`rotate(${i * 6} 100 100)`}
                  className="xb-rtick"
                  style={{ "--i": i } as CSSProperties}
                />
              ))}
            </svg>
            <div className="xb-rest-text">
              <span className="xb-read">{COPY.rest.label}</span>
              <span className="xb-rest-count" aria-label={`${COPY.rest.seconds} seconds`} />
              <span className="xb-rest-msg">{s.restDone ? COPY.rest.logged : COPY.rest.next}</span>
            </div>
          </div>
        </Pane>
      </main>

      <div className="xb-undo" data-open={s.undoOpen} role="status" inert={!s.undoOpen}>
        <span>{COPY.applied}</span>
        <button type="button" onClick={() => act({ type: "undo" })}>
          {COPY.undo}
        </button>
      </div>
    </div>
  );
}
