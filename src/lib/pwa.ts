import { useSyncExternalStore } from "react";

type InstallOutcome = "accepted" | "dismissed" | "unavailable";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = {
  waiting: ServiceWorker | null;
  registered: boolean;
  offlineReady: boolean;
  installPrompt: InstallPromptEvent | null;
  standalone: boolean;
};
let state: PwaState = {
  waiting: null,
  registered: false,
  offlineReady: false,
  installPrompt: null,
  standalone: false,
};
const subs = new Set<() => void>();
let watchingInstall = false;
const set = (p: Partial<PwaState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as { standalone?: boolean }).standalone === true;

/** Capture the one-shot browser prompt before the Settings route is opened. */
function watchInstallPrompt() {
  if (watchingInstall || typeof window === "undefined") return;
  watchingInstall = true;
  set({ standalone: installed() });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    set({ installPrompt: event as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ installPrompt: null, standalone: true }));
  const displayMode = matchMedia("(display-mode: standalone)");
  const onDisplayMode = () => set({ standalone: installed() });
  if (typeof displayMode.addEventListener === "function")
    displayMode.addEventListener("change", onDisplayMode);
  else
    (displayMode as MediaQueryList & { addListener: (listener: () => void) => void }).addListener(
      onDisplayMode,
    );
}

/** Registers the service worker in production only. Updates are held until the user (or an idle moment) activates them. */
export function registerServiceWorker() {
  watchInstallPrompt();
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

/** Install prompt (Chromium), installed state and iOS hint. */
export function useInstall() {
  const current = usePwa();
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const prompt = async (): Promise<InstallOutcome> => {
    const event = state.installPrompt;
    if (!event) return "unavailable";
    await event.prompt();
    const choice = await event.userChoice;
    set({ installPrompt: null });
    return choice.outcome;
  };
  return {
    standalone: current.standalone,
    canPrompt: !!current.installPrompt,
    offlineReady: current.offlineReady,
    registered: current.registered,
    prompt,
    ios,
  };
}
