import { useEffect, useState, useSyncExternalStore } from "react";

type PwaState = { waiting: ServiceWorker | null; registered: boolean; offlineReady: boolean };
let state: PwaState = { waiting: null, registered: false, offlineReady: false };
const subs = new Set<() => void>();
const set = (p: Partial<PwaState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

/** Registers the service worker in production only. Updates are held until the user (or an idle moment) activates them. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !import.meta.env.PROD)
    return;
  const start = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        set({
          registered: true,
          offlineReady: !!navigator.serviceWorker.controller || !!reg.active,
        });
        if (reg.waiting && navigator.serviceWorker.controller) set({ waiting: reg.waiting });
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) set({ waiting: w });
            if (w.state === "activated") set({ offlineReady: true });
          });
        });
        // Check for a new version when the app is reopened.
        document.addEventListener(
          "visibilitychange",
          () => document.visibilityState === "visible" && void reg.update(),
        );
      })
      .catch(() => undefined);
  };
  // The effect that calls this usually runs after `load` has fired.
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

export const usePwa = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
    () => state,
  );

export function applyUpdate() {
  const w = state.waiting;
  if (!w) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  w.postMessage({ type: "SKIP_WAITING" });
}

/** Install prompt (Chromium) and iOS hint. */
export function useInstall() {
  const [evt, setEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(
      matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true,
    );
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as never);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { standalone, canPrompt: !!evt, prompt: () => evt?.prompt(), ios };
}
