import { useEffect, useRef } from "react";
import type { HapticKind } from "@/domain/haptics";
import { useHaptics } from "./useHaptics";

const TARGET =
  "[data-haptic], button, a[href], summary, [role=tab], [role=radio], [role=switch], [role=checkbox], label.jr-row, label.jr-chip, label.jr-day";
const PRIMARY = "button[type=submit], .bg-primary, .jr-btn-primary, [data-haptic=acknowledge]";

/**
 * One delegated listener gives every control a restrained haptic response: a light tick on
 * selecting or toggling, a firmer acknowledge on primary actions. It does nothing unless the
 * person has opted in (see useHaptics), never fires for disabled controls, and is rate limited
 * so a fast double tap is a single tick. Opt a region out with data-haptic="off".
 */
export function GlobalHaptics() {
  const haptic = useHaptics();
  const ref = useRef(haptic);
  ref.current = haptic;
  useEffect(() => {
    let last = 0;
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const el = target.closest(TARGET);
      if (!el || el.closest('[data-haptic="off"]')) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      const now = performance.now();
      if (now - last < 80) return;
      last = now;
      const declared = el.getAttribute("data-haptic");
      const kind: HapticKind =
        declared && declared !== "off"
          ? (declared as HapticKind)
          : el.matches(PRIMARY)
            ? "acknowledge"
            : "selection";
      ref.current(kind);
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);
  return null;
}
