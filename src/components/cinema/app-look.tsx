import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Atmosphere } from "./atmosphere";
import type { TimeOfDay } from "./cinema";
import "./cinema.css";
import "./app.css";

export type AppLook = {
  mode: "dark" | "light";
  world: string;
  time: TimeOfDay;
  reduced: boolean;
  low: boolean;
};

const timeOfDay = (h: number): TimeOfDay =>
  h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";

/** The real app's look: theme mode and colour world come from the person's settings; time of day from the clock. */
function useAppLook(): AppLook {
  const [look, setLook] = useState<AppLook>({
    mode: "dark",
    world: "cobalt",
    time: "dawn",
    reduced: false,
    low: false,
  });
  useEffect(() => {
    const root = document.documentElement;
    const mm = matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const read = () =>
      setLook({
        mode: root.dataset.theme === "light" ? "light" : "dark",
        world: root.dataset.accent || "cobalt",
        time: timeOfDay(new Date().getHours()),
        reduced: mm.matches,
        low: !!conn?.saveData,
      });
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
    mm.addEventListener("change", read);
    const timer = setInterval(read, 5 * 60_000);
    return () => {
      mo.disconnect();
      mm.removeEventListener("change", read);
      clearInterval(timer);
    };
  }, []);
  return look;
}

/**
 * Carries the cinema variables (colour world, light, glass, scrims) for everything inside it, and paints the
 * environment behind the app. The environment is fixed, ignores the pointer and never carries content.
 */
export function CinemaScope({ children, className }: { children: ReactNode; className?: string }) {
  const look = useAppLook();
  useEffect(() => {
    document.documentElement.dataset.atmos = "on";
    return () => {
      delete document.documentElement.dataset.atmos;
    };
  }, []);
  return (
    <div
      className={`cn cn-scope${className ? ` ${className}` : ""}`}
      data-scene="app"
      data-mode={look.mode}
      data-world={look.world}
      data-time={look.time}
      data-reduced={look.reduced}
      data-low={look.low}
      style={{ "--charge": 0.55 } as CSSProperties}
    >
      <div className="cn-app-bg" aria-hidden>
        <Atmosphere />
      </div>
      <div className="cn-app-content">{children}</div>
    </div>
  );
}
