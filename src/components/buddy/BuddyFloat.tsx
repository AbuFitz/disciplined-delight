import "./buddy.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { STATE_META } from "@/domain/buddy/state";
import { BuddyCharacter } from "./BuddyCharacter";
import { useBuddyDock } from "./buddy-context";

type Anchor = { side: "left" | "right"; lift: number };
const KEY = "vayvor:buddy:anchor";
const LIFTS = [0, 76, 152, 228];
const INTERACTIVE =
  "button, a[href], input, select, textarea, summary, label, [role=button], [role=tab], [role=switch], [role=radio], [role=checkbox]";

const load = (): Anchor => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Anchor | null;
    if (v && (v.side === "left" || v.side === "right") && Number.isFinite(v.lift))
      return { side: v.side, lift: Math.max(0, Math.min(LIFTS.at(-1)!, v.lift)) };
  } catch {
    /* ignore */
  }
  return { side: "right", lift: 0 };
};

/** Text, media and charts count as content the companion must not sit on. */
function carriesContent(el: Element) {
  if (/^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/i.test(el.tagName) || el.closest("svg")) return true;
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
}

/** True when an interactive control sits under this rectangle (the companion itself is ignored). */
function blockedAt(rect: { left: number; top: number; right: number; bottom: number }) {
  const cols = 4;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < cols; j++) {
      const x = rect.left + ((rect.right - rect.left) * (i + 0.5)) / cols;
      const y = rect.top + ((rect.bottom - rect.top) * (j + 0.5)) / cols;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const top = document.elementsFromPoint(x, y).find((el) => !el.closest("[data-buddy]"));
      if (!top || top.closest("[data-buddy]") || top === document.body) continue;
      if (top.closest(INTERACTIVE) || carriesContent(top)) return true;
    }
  return false;
}

/**
 * The standalone companion: a free-standing character in the corner, not part of the navigation.
 * Tap it (a delighted reaction, a haptic if the person opted in) to open its panel. Drag it, or use
 * the arrow keys while it is focused, to move it; the position is remembered. It steps out of the way
 * of buttons and fields (another corner, higher, or tucked to the edge), fades while you scroll, and
 * its speech bubble only appears where it would not sit on a control.
 */
export function BuddyFloat() {
  const b = useBuddyDock();
  const loc = useLocation();
  const [pref, setPref] = useState<Anchor>({ side: "right", lift: 0 });
  const [anchor, setAnchor] = useState<Anchor>({ side: "right", lift: 0 });
  const [tucked, setTucked] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [bubbleOk, setBubbleOk] = useState(false);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const size = typeof window !== "undefined" && innerWidth >= 1024 ? 92 : 72;

  useEffect(() => {
    const a = load();
    setPref(a);
    setAnchor(a);
  }, []);

  const bottomPx = useCallback((lift: number) => {
    const reserve =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--reserve-bottom")) ||
      0;
    return reserve + 12 + lift;
  }, []);
  const rightOffset = useCallback(
    () => (innerWidth >= 1024 && b?.open ? 20 * 16 + 12 : 12),
    [b?.open],
  );

  // Choose the first spot that does not sit on a control.
  const place = useCallback(() => {
    if (!b || b.mode === "none" || b.asleep) return;
    const s = size;
    const order: Anchor[] = [];
    const other = pref.side === "right" ? "left" : "right";
    for (const lift of LIFTS) order.push({ side: pref.side, lift: Math.max(lift, pref.lift) });
    for (const lift of LIFTS) order.push({ side: other, lift });
    for (const c of order) {
      const bottom = bottomPx(c.lift);
      const left = c.side === "left" ? 12 : innerWidth - s - rightOffset();
      const rect = {
        left,
        top: innerHeight - bottom - s,
        right: left + s,
        bottom: innerHeight - bottom,
      };
      if (!blockedAt(rect)) {
        setAnchor(c);
        setTucked(false);
        return;
      }
    }
    setAnchor({ side: pref.side, lift: 0 });
    setTucked(true);
  }, [b, pref, size, bottomPx, rightOffset]);

  useEffect(() => {
    if (!b) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = (ms = 260) => {
      clearTimeout(timer);
      timer = setTimeout(place, ms);
    };
    const onScroll = () => {
      setScrolling(true);
      soon(320);
    };
    soon(120);
    const mo = new MutationObserver(() => soon(400));
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", () => soon());
    return () => {
      clearTimeout(timer);
      mo.disconnect();
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.mode, b?.asleep, b?.open, pref, loc.pathname]);

  useEffect(() => {
    if (!scrolling) return;
    const t = setTimeout(() => setScrolling(false), 260);
    return () => clearTimeout(t);
  }, [scrolling]);

  // Speech bubble: only when the brief changes, frequency allows, and it would not cover a control.
  const key = b?.brief.key;
  const speaks =
    !!b && !b.config.muted && b.mode === "float" && b.line !== "Tap for help on this screen";
  useEffect(() => {
    setBubble(null);
    if (!b || !speaks || b.open || b.asleep || tucked) return;
    const t0 = setTimeout(() => {
      setBubble(b.line);
    }, 700);
    const t1 = setTimeout(() => setBubble(null), 7500);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, speaks, b?.open, b?.asleep, tucked]);

  // Measure the real bubble before showing it: it appears only where it covers no control or content.
  useLayoutEffect(() => {
    setBubbleOk(false);
    const el = bubbleRef.current;
    if (!bubble || !el) return;
    const r = el.getBoundingClientRect();
    if (blockedAt(r)) setBubble(null);
    else setBubbleOk(true);
  }, [bubble]);

  if (!b || b.mode === "none") return null;
  const { config } = b;

  const persist = (a: Anchor) => {
    setPref(a);
    setAnchor(a);
    try {
      localStorage.setItem(KEY, JSON.stringify(a));
    } catch {
      /* ignore */
    }
  };

  if (b.asleep)
    return (
      <div
        data-buddy
        className="buddy-peek-tab"
        data-side={anchor.side}
        style={{ bottom: `calc(var(--reserve-bottom, 0px) + 96px)` }}
      >
        <button type="button" onClick={b.wake} aria-label={`Wake ${config.name}`}>
          <BuddyCharacter
            variant={config.variant}
            state="rest"
            motion="off"
            palette={config.palette}
            size={34}
            decorative
          />
        </button>
      </div>
    );

  const demand = b.mode === "demand";
  const s = demand ? Math.round(size * 0.72) : size;
  const style: React.CSSProperties = drag
    ? { left: drag.x - s / 2, top: drag.y - s / 2, width: s }
    : {
        width: s,
        bottom: `calc(var(--reserve-bottom, 0px) + ${12 + anchor.lift}px)`,
        ...(anchor.side === "left" ? { left: 12 } : { right: `${rightOffset()}px` }),
      };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    moved.current = false;
    const sx = e.clientX;
    const sy = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!moved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      moved.current = true;
      setDrag({ x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved.current) {
        const side = ev.clientX < innerWidth / 2 ? "left" : "right";
        const fromBottom = innerHeight - ev.clientY - s / 2 - bottomPx(0) + 12;
        const lift = LIFTS.reduce(
          (best, l) => (Math.abs(l - fromBottom) < Math.abs(best - fromBottom) ? l : best),
          0,
        );
        persist({ side, lift });
        setDrag(null);
      } else {
        b.poke();
        b.setOpen(!b.open);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      b.poke();
      b.setOpen(!b.open);
      return;
    }
    const step = LIFTS[1]!;
    if (e.key === "ArrowLeft") persist({ ...anchor, side: "left" });
    else if (e.key === "ArrowRight") persist({ ...anchor, side: "right" });
    else if (e.key === "ArrowUp")
      persist({ ...anchor, lift: Math.min(LIFTS.at(-1)!, anchor.lift + step) });
    else if (e.key === "ArrowDown") persist({ ...anchor, lift: Math.max(0, anchor.lift - step) });
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={el}
      data-buddy
      className="buddy-float"
      data-side={anchor.side}
      data-scrolling={scrolling && !drag ? "true" : "false"}
      data-tucked={tucked ? "true" : "false"}
      data-dragging={drag ? "true" : "false"}
      style={style}
    >
      {bubble && !drag && (
        <button
          type="button"
          ref={bubbleRef}
          className="buddy-speech"
          style={bubbleOk ? undefined : { visibility: "hidden" }}
          data-side={anchor.side}
          onClick={() => {
            setBubble(null);
            b.poke();
            b.setOpen(true);
          }}
          aria-label={`${config.name} says: ${bubble}. Open details`}
        >
          <span aria-hidden>{bubble}</span>
        </button>
      )}
      <div
        className="sr-only"
        role="status"
        aria-live={b.brief.state === "error" ? "assertive" : "polite"}
      >
        {bubble ?? ""}
      </div>
      <button
        type="button"
        className="buddy-hit"
        data-haptic="off"
        aria-expanded={b.open}
        aria-label={`${config.name}: ${STATE_META[b.state].label}. ${b.open ? "Close" : "Open"} companion. Drag, or use arrow keys, to move.`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <BuddyCharacter
          variant={config.variant}
          state={b.state}
          motion={b.motion}
          palette={config.palette}
          expression={config.expression}
          size={s}
          decorative
        />
      </button>
    </div>
  );
}
