import type { CSSProperties, ReactNode } from "react";
import { COPY, NODE_FOR_SCENE, type SceneId } from "./model";
import type { ProtoProps } from "./types";
import "./proto-c.css";

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
      className={`xc-pane xc-${id}`}
      data-active={active}
      inert={!active}
      aria-hidden={!active}
    >
      {children}
    </section>
  );
}

/** C: warm editorial sanctuary. Calm light on paper, generous space, a human voice, a living texture. */
export function ProtoC({ s, act, reduced, mode, low }: ProtoProps) {
  const node = NODE_FOR_SCENE[s.scene];
  const note = COPY.ready.find((r) => r.id === s.ready)?.note;
  const readyLabel = COPY.ready.find((r) => r.id === s.ready)?.label;
  return (
    <div
      className="xc"
      data-scene={s.scene}
      data-mode={mode}
      data-reduced={reduced}
      data-low={low}
      data-gym={PANE.gym!.includes(s.scene)}
      data-set-done={s.setDone}
      data-rest-done={s.restDone}
      data-applied={s.applied}
      style={{ "--node": node } as CSSProperties}
    >
      <div className="xc-paper" aria-hidden />
      <div className="xc-sun" aria-hidden />

      <header className="xc-day">
        <p className="xc-date">{COPY.date}</p>
        <ol className="xc-line" aria-label="Your day">
          {COPY.dayline.map((n, i) => (
            <li
              key={n.id}
              data-state={i < node ? "done" : i === node ? "current" : "next"}
              aria-current={i === node ? "step" : undefined}
            >
              <span className="xc-dot" aria-hidden />
              <span className="xc-lab">{n.label}</span>
              <span className="xc-val">
                {n.id === "readiness"
                  ? (readyLabel ?? "")
                  : n.id === "plan"
                    ? node >= 1 && s.scene !== "readiness"
                      ? COPY.planTitle
                      : ""
                    : n.id === "now"
                      ? node >= 2
                        ? COPY.begin
                        : ""
                      : COPY.recovery}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <main className="xc-stage">
        <Pane id="arrive" scene={s.scene}>
          <h2 className="xc-hero">
            <span style={{ "--i": 0 } as CSSProperties}>Good morning,</span>
            <span style={{ "--i": 1 } as CSSProperties}>Sam.</span>
          </h2>
        </Pane>

        <Pane id="ready" scene={s.scene}>
          <h2 className="xc-ask">{COPY.question}</h2>
          <div className="xc-words" role="radiogroup" aria-label={COPY.question}>
            {COPY.ready.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={s.ready === r.id}
                data-on={s.ready === r.id}
                onClick={() => act({ type: "choose", ready: r.id })}
              >
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </Pane>

        <Pane id="adapt" scene={s.scene}>
          <p className="xc-note">{note}</p>
          <h2 className="xc-title">{COPY.planTitle}</h2>
          <p className="xc-meta" data-applied={s.applied}>
            <span className="xc-old">{COPY.meta45}</span>
            <span className="xc-new">{COPY.meta35}</span>
          </p>
          <div className="xc-margin">
            <button
              type="button"
              className="xc-pen"
              aria-label={`Ask Buddy: ${COPY.hint}`}
              onClick={() => act({ type: "preview", open: true })}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 20c4-1 7-4 10-9l4-5 2 2-5 4c-5 3-8 6-9 10Z" />
              </svg>
            </button>
            <p className="xc-ruled" aria-live="polite">
              {s.typed > 0 ? COPY.command.slice(0, s.typed) : <span>{COPY.hint}</span>}
            </p>
            <button
              type="button"
              className="xc-link xc-muted"
              onClick={() => act({ type: "scene", scene: "now" })}
            >
              Skip
            </button>
          </div>
          <div
            className="xc-slip"
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
            <div className="xc-slip-actions">
              <button type="button" className="xc-ink" onClick={() => act({ type: "confirm" })}>
                {COPY.preview.confirm}
              </button>
              <button
                type="button"
                className="xc-link xc-muted"
                onClick={() => act({ type: "preview", open: false })}
              >
                {COPY.preview.cancel}
              </button>
            </div>
          </div>
        </Pane>

        <Pane id="now" scene={s.scene}>
          <p className="xc-note">Now</p>
          <h2 className="xc-title">{COPY.planTitle}</h2>
          <p className="xc-meta" data-applied="true">
            <span className="xc-new">{COPY.meta35}</span>
          </p>
          <button type="button" className="xc-begin" onClick={() => act({ type: "begin" })}>
            <span>{COPY.begin}</span>
            <svg viewBox="0 0 24 12" aria-hidden>
              <path d="M1 6h20M16 1l5 5-5 5" />
            </svg>
          </button>
        </Pane>

        <Pane id="gym" scene={s.scene}>
          <div className="xc-gym-head">
            <p className="xc-note">{COPY.gym.set}</p>
            <h2 className="xc-title">{COPY.gym.exercise}</h2>
          </div>
          <div className="xc-figures" data-rest={s.scene === "rest"}>
            <p>
              <span className="xc-num">{COPY.gym.load}</span>
              <span className="xc-unit">{COPY.gym.unit}</span>
            </p>
            <p>
              <span className="xc-num">{COPY.gym.reps}</span>
              <span className="xc-unit">{COPY.gym.repsUnit}</span>
            </p>
          </div>
          <p className="xc-cue" data-rest={s.scene === "rest"}>
            {COPY.gym.cue}
          </p>
          <button
            type="button"
            className="xc-done"
            data-done={s.setDone}
            disabled={s.scene !== "set" || s.setDone}
            onClick={() => act({ type: "doneSet" })}
          >
            <span>{COPY.gym.done}</span>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </button>
          <div
            className="xc-rest"
            data-on={s.scene === "rest"}
            data-done={s.restDone}
            role="status"
          >
            <span className="xc-bloom" aria-hidden />
            <div className="xc-rest-text">
              <span className="xc-note">{COPY.rest.label}</span>
              <span className="xc-rest-count" aria-label={`${COPY.rest.seconds} seconds`} />
              <span className="xc-rest-msg">{s.restDone ? COPY.rest.logged : COPY.rest.next}</span>
            </div>
          </div>
        </Pane>
      </main>

      <div className="xc-undo" data-open={s.undoOpen} role="status" inert={!s.undoOpen}>
        <span>{COPY.applied}</span>
        <button type="button" onClick={() => act({ type: "undo" })}>
          {COPY.undo}
        </button>
      </div>
    </div>
  );
}
