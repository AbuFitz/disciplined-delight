import { useEffect, useState } from "react";
import { PROVIDERS, STATUS_COPY, providerStatus, type Facts } from "@/domain/integrations";
import { useOnline } from "@/components/buddy/useBuddy";

const ENV: Record<string, string | undefined> = {
  VITE_SPOTIFY_CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  VITE_APPLE_MUSIC_DEVELOPER_TOKEN: import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN,
  VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
};

/** Reports what each optional provider needs. It never starts a connection or asks for permission. */
export function IntegrationsPanel() {
  const online = useOnline();
  const [device, setDevice] = useState<Pick<Facts, "geolocation" | "notifications" | "bluetooth">>({
    bluetooth: false,
  });
  useEffect(() => {
    let live = true;
    const read = async () => {
      let geolocation: Facts["geolocation"] = "geolocation" in navigator ? "prompt" : "unsupported";
      try {
        const q = await navigator.permissions?.query({ name: "geolocation" });
        if (q && geolocation !== "unsupported") geolocation = q.state;
      } catch {
        /* Permissions API unavailable: leave as prompt. */
      }
      const notifications: Facts["notifications"] =
        typeof Notification === "undefined" ? "unsupported" : Notification.permission;
      if (live) setDevice({ geolocation, notifications, bluetooth: "bluetooth" in navigator });
    };
    void read();
    return () => {
      live = false;
    };
  }, []);
  const facts: Facts = {
    online,
    configured: Object.entries(ENV)
      .filter(([, v]) => !!v)
      .map(([k]) => k),
    ...device,
  };
  return (
    <div className="grid gap-0" data-testid="integrations">
      <p className="mb-2 text-sm text-muted-foreground">
        Optional connections. None is active unless it says so, and none asks for anything until you
        choose it.
      </p>
      {PROVIDERS.map((p) => {
        const status = providerStatus(p.id, facts);
        const copy = STATUS_COPY[status];
        return (
          <section key={p.id} className="border-t border-line py-3" aria-label={p.name}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h4 className="font-display text-base font-semibold">{p.name}</h4>
              <span className="eyebrow" data-status={status}>
                {copy.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.what}</p>
            <p className="mt-1 text-sm">{copy.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Needs: {p.needs.join(" · ")}. Setup: {p.docs}
            </p>
          </section>
        );
      })}
    </div>
  );
}
