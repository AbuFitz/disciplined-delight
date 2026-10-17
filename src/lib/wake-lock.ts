import { useCallback, useEffect, useState } from "react";

/** Optional screen wake lock. Does nothing where unsupported; sessions work without it. */
export function useWakeLock(enabled: boolean) {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [status, setStatus] = useState<"off" | "active" | "unavailable" | "denied">(
    supported ? "off" : "unavailable",
  );
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled || !supported) {
      setStatus(supported ? "off" : "unavailable");
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (lock && !lock.released) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => {
          if (!cancelled) setStatus("off");
        });
        setStatus("active");
      } catch {
        setStatus("denied");
      }
      if (cancelled && lock && !lock.released) void lock.release();
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (lock && !lock.released) void lock.release();
    };
  }, [enabled, supported, attempt]);
  return { supported, status, retry };
}
