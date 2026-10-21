import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const BOTTOM_SLOT_ID = "shell-bottom-slot";
export const SIDE_SLOT_ID = "shell-side-slot";

const desktop = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

/**
 * A screen that needs a persistent action bar (rest timer, finish) puts it in the shell's reserved
 * space instead of floating it over content: the bottom stack on small screens, the sidebar on
 * wide ones. The shell measures the reserved height, so the page scrolls above it.
 */
export function ShellBar({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const q = window.matchMedia("(min-width: 1024px)");
    const find = () =>
      setTarget(document.getElementById(q.matches || desktop() ? SIDE_SLOT_ID : BOTTOM_SLOT_ID));
    find();
    q.addEventListener("change", find);
    return () => q.removeEventListener("change", find);
  }, []);
  return target ? createPortal(children, target) : null;
}
