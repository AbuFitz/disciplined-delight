import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { COPY, NODE_FOR_SCENE, type SceneId } from "./model";
import type { ProtoProps } from "./types";
import "./proto-a.css";

const PANE: Record<string, SceneId[]> = {
  arrive: ["arrive"],
  ready: ["readiness"],
  adapt: ["adapt"],
  now: ["now"],
  gym: ["enter", "set", "rest"],
};

function Pane({
  id,
  scene,
  className,
  children,
}: {
  id: string;
  scene: SceneId;
  className?: string;
  children: ReactNode;
}) {
  const active = PANE[id]!.includes(scene);
  return (
    <section
      className={`xa-pane xa-${id} ${className ?? ""}`}
      data-active={active}
      inert={!active}
      aria-hidden={!active}
    >
      {children}
    </section>
  );
}

/** A: atmospheric spatial calm. A layered environment; the Dayline is a luminous journey; one decision at a time. */
export function ProtoA({ s, act, reduced, mode, low }: ProtoProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const node = NODE_FOR_SCENE[s.scene];
  const onMove = (e: PointerEvent) => {
    if (reduced || low || e.pointerType === "touch") return;
    const el = root.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
      el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
    });
  };
  const gym = PANE.gym!.includes(s.scene);
  const shortened = s.applied;
  const readyLabel = COPY.ready.find((r) => r.id === s.ready)?.label;
  return (
    <div
      ref={root}
      className="xa"
      data-scene={s.scene}
      data-ready={s.ready ?? "none"}
      data-mode={mode}
      data-reduced={reduced}
      data-low={low}
      data-gym={gym}
      data-rest-done={s.restDone}
      data-set-done={s.setDone}
      onPointerMove={onMove}
      style={{ "--node": node } as CSSProperties}
    >
      <div className="xa-layer xa-sky" aria-hidden />
      <div className="xa-layer xa-far" aria-hidden />
      <div className="xa-layer xa-mid" aria-hidden />
      <div className="xa-layer xa-near" aria-hidden />
      <div className="xa-bloom" aria-hidden />

      <header className="xa-day">
        <div className="xa-rail" aria-hidden>
          <span className="xa-rail-fill" />
          <span className="xa-traveller" />
        </div>
        <ol className="xa-nodes" aria-label="Your day">
          {COPY.dayline.map((n, i) => (
            <li
              key={n.id}
              data-state={i < node ? "done" : i === node ? "current" : "next"}
              aria-current={i === node ? "step" : undefined}
            >
              <span className="xa-node-label">{n.label}</span>
              <span className="xa-node-value">
                {n.id === "readiness"
                  ? (readyLabel ?? "·")
                  : n.id === "plan"
                    ? s.scene === "arrive" || s.scene === "readiness"
                      ? "·"
                      : COPY.planTitle
                    : n.id === "now"
                      ? node >= 2
                        ? COPY.begin
                        : "·"
                      : COPY.recovery}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <main className="xa-stage">
        <Pane id="arrive" scene={s.scene}>
          <p className="xa-kicker">{COPY.date}</p>
          <h2 className="xa-hero">
            <span style={{ "--i": 0 } as CSSProperties}>Good morning,</span>
            <span style={{ "--i": 1 } as CSSProperties}>Sam.</span>
          </h2>
        </Pane>

        <Pane id="ready" scene={s.scene}>
          <h2 className="xa-ask">{COPY.question}</h2>
          <div className="xa-horizon" role="radiogroup" aria-label={COPY.question}>
            {COPY.ready.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={s.ready === r.id}
                className="xa-pt"
                data-on={s.ready === r.id}
                style={{ "--i": i } as CSSProperties}
                onClick={() => act({ type: "choose", ready: r.id })}
              >
                <span className="xa-pt-dot" aria-hidden />
                <span className="xa-pt-label">{r.label}</span>
              </button>
            ))}
          </div>
        </Pane>

        <Pane id="adapt" scene={s.scene}>
          <p className="xa-kicker">{COPY.ready.find((r) => r.id === s.ready)?.note ?? " "}</p>
          <h2 className="xa-title">{COPY.planTitle}</h2>
          <p className="xa-meta" data-applied={shortened}>
            <span className="xa-meta-a">{COPY.meta45}</span>
            <span className="xa-meta-b">{COPY.meta35}</span>
          </p>
          <div className="xa-buddy">
            <button
              type="button"
              className="xa-orb"
              aria-label={`Ask Buddy: ${COPY.hint}`}
              data-asking={s.typed > 0}
              onClick={() => act({ type: "preview", open: true })}
            >
              <span className="xa-orb-core" aria-hidden />
              <span className="xa-orb-ring" aria-hidden />
            </button>
            <p className="xa-cmd" aria-live="polite">
              {s.typed > 0 ? (
                <>
                  <span className="xa-cmd-text">{COPY.command.slice(0, s.typed)}</span>
                </>
              ) : (
                <span className="xa-cmd-hint">{COPY.hint}</span>
              )}
            </p>
            <button
              type="button"
              className="xa-skip"
              onClick={() => act({ type: "scene", scene: "now" })}
            >
              Skip
            </button>
          </div>
          <div
            className="xa-preview"
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
            <div className="xa-preview-actions">
              <button
                type="button"
                className="xa-btn xa-btn-primary"
                onClick={() => act({ type: "confirm" })}
              >
                {COPY.preview.confirm}
              </button>
              <button
                type="button"
                className="xa-btn"
                onClick={() => act({ type: "preview", open: false })}
              >
                {COPY.preview.cancel}
              </button>
            </div>
          </div>
        </Pane>

        <Pane id="now" scene={s.scene}>
          <p className="xa-kicker">Now</p>
          <h2 className="xa-title">{COPY.planTitle}</h2>
          <p className="xa-meta" data-applied={shortened}>
            <span className="xa-meta-a">{COPY.meta45}</span>
            <span className="xa-meta-b">{COPY.meta35}</span>
          </p>
          <button type="button" className="xa-begin" onClick={() => act({ type: "begin" })}>
            <span className="xa-begin-ring" aria-hidden />
            <span>{COPY.begin}</span>
          </button>
        </Pane>

        <Pane id="gym" scene={s.scene}>
          <div className="xa-gym-head">
            <p className="xa-kicker">{COPY.gym.set}</p>
            <h2 className="xa-title">{COPY.gym.exercise}</h2>
          </div>
          <div className="xa-figures" data-rest={s.scene === "rest"}>
            <p>
              <span className="xa-num">{COPY.gym.load}</span>
              <span className="xa-unit">{COPY.gym.unit}</span>
            </p>
            <p>
              <span className="xa-num">{COPY.gym.reps}</span>
              <span className="xa-unit">{COPY.gym.repsUnit}</span>
            </p>
          </div>
          <p className="xa-cue">{COPY.gym.cue}</p>
          <button
            type="button"
            className="xa-done"
            data-done={s.setDone}
            disabled={s.scene !== "set" || s.setDone}
            onClick={() => act({ type: "doneSet" })}
            aria-label={COPY.gym.done}
          >
            <span className="xa-done-ring" aria-hidden />
            <span className="xa-done-label">{s.setDone ? "✓" : COPY.gym.done}</span>
          </button>
          <div
            className="xa-rest"
            data-on={s.scene === "rest"}
            data-done={s.restDone}
            role="status"
          >
            <svg viewBox="0 0 100 100" aria-hidden>
              <circle className="xa-rest-track" cx="50" cy="50" r="44" />
              <circle className="xa-rest-arc" cx="50" cy="50" r="44" pathLength="100" />
            </svg>
            <div className="xa-rest-text">
              <span className="xa-kicker">{COPY.rest.label}</span>
              <span className="xa-rest-count" aria-label={`${COPY.rest.seconds} seconds`} />
              <span className="xa-rest-msg">{s.restDone ? COPY.rest.logged : COPY.rest.next}</span>
            </div>
          </div>
        </Pane>
      </main>

      <div className="xa-undo" data-open={s.undoOpen} role="status" inert={!s.undoOpen}>
        <span>{COPY.applied}</span>
        <button type="button" onClick={() => act({ type: "undo" })}>
          {COPY.undo}
        </button>
      </div>
    </div>
  );
}
