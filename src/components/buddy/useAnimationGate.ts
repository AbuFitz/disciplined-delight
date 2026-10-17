import { useEffect, useRef, useState } from "react";

/** Pause animation while off-screen or in a background tab so it never costs battery. */
export function useAnimationGate() {
  const ref = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let visible = true;
    let tab = !document.hidden;
    const update = () => setLive(visible && tab);
    const onVisibility = () => {
      tab = !document.hidden;
      update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        update();
      });
      observer.observe(node);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);
  return { ref, live };
}
