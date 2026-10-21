/**
 * Optional provider boundaries. Nothing here connects to anything: it reports, from
 * capability and configuration facts, what a provider would need before it could work.
 * A provider is never shown as connected unless a real adapter and credentials exist.
 */
export type ProviderId = "spotify" | "apple_music" | "wearables" | "location" | "notifications";

export type ProviderStatus =
  | "link_only" // opens the provider app from a saved link; no account connection
  | "credentials_missing" // adapter not configured with the provider's keys
  | "needs_permission" // device capability exists; the person has not been asked
  | "denied" // the person or browser refused permission
  | "granted" // permission granted; a feature may use it
  | "unsupported" // this browser or platform cannot do it
  | "offline"; // would need a connection

export type Facts = {
  online: boolean;
  /** Names of build-time variables that are present and non-empty. Values are never read here. */
  configured: string[];
  geolocation?: "granted" | "denied" | "prompt" | "unsupported";
  notifications?: "granted" | "denied" | "default" | "unsupported";
  bluetooth: boolean;
};

export type Provider = {
  id: ProviderId;
  name: string;
  what: string;
  /** What must exist before it can work, by name only. */
  needs: string[];
  docs: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "spotify",
    name: "Spotify",
    what: "Open your training playlist from Gym Mode. Account linking, playback control and now-playing need Spotify's Web API.",
    needs: ["VITE_SPOTIFY_CLIENT_ID (Spotify app registration)", "Your explicit consent to link"],
    docs: "docs/INTEGRATIONS.md#spotify",
  },
  {
    id: "apple_music",
    name: "Apple Music",
    what: "Open a training playlist in Apple Music. Playback control needs MusicKit and a developer token.",
    needs: [
      "VITE_APPLE_MUSIC_DEVELOPER_TOKEN (Apple developer account)",
      "Your explicit consent to link",
    ],
    docs: "docs/INTEGRATIONS.md#apple-music",
  },
  {
    id: "wearables",
    name: "Wearables and health data",
    what: "Heart rate and workout sync. Apple Health and Health Connect are native-only, so a web build cannot read them.",
    needs: [
      "A native wrapper with HealthKit / Health Connect entitlements",
      "Your explicit consent per data type",
    ],
    docs: "docs/INTEGRATIONS.md#wearables-and-health",
  },
  {
    id: "location",
    name: "Location and gym arrival",
    what: "Optionally suggest starting a session when you arrive. Browsers can only check location while the app is open.",
    needs: [
      "Browser location permission",
      "A saved gym place you choose",
      "Native geofencing for background arrival",
    ],
    docs: "docs/INTEGRATIONS.md#location",
  },
  {
    id: "notifications",
    name: "Notifications",
    what: "Reminders for planned sessions. Closed-app delivery needs a push service and a server key.",
    needs: [
      "Browser notification permission",
      "VITE_VAPID_PUBLIC_KEY and a push sender for closed-app delivery",
    ],
    docs: "docs/INTEGRATIONS.md#notifications",
  },
];

export function providerStatus(id: ProviderId, facts: Facts): ProviderStatus {
  const has = (name: string) => facts.configured.includes(name);
  switch (id) {
    case "spotify":
    case "apple_music": {
      const key = id === "spotify" ? "VITE_SPOTIFY_CLIENT_ID" : "VITE_APPLE_MUSIC_DEVELOPER_TOKEN";
      if (!has(key)) return "link_only";
      return facts.online ? "needs_permission" : "offline";
    }
    case "wearables":
      return facts.bluetooth ? "credentials_missing" : "unsupported";
    case "location":
      if (!facts.geolocation || facts.geolocation === "unsupported") return "unsupported";
      return facts.geolocation === "granted"
        ? "granted"
        : facts.geolocation === "denied"
          ? "denied"
          : "needs_permission";
    case "notifications":
      if (!facts.notifications || facts.notifications === "unsupported") return "unsupported";
      return facts.notifications === "granted"
        ? "granted"
        : facts.notifications === "denied"
          ? "denied"
          : "needs_permission";
  }
}

export const STATUS_COPY: Record<ProviderStatus, { label: string; detail: string }> = {
  link_only: {
    label: "Link only",
    detail: "Opens the app from a link you save. Not connected to your account.",
  },
  credentials_missing: {
    label: "Not set up",
    detail: "This build has no provider credentials, so it cannot connect.",
  },
  needs_permission: {
    label: "Needs your permission",
    detail: "Available on this device. Nothing is requested until you choose.",
  },
  denied: {
    label: "Permission denied",
    detail: "Blocked in your browser settings. Allow it there if you change your mind.",
  },
  granted: { label: "Allowed", detail: "Permission granted. Features use it only when you ask." },
  unsupported: {
    label: "Not available here",
    detail: "This browser or platform does not support it.",
  },
  offline: { label: "Offline", detail: "Needs a connection. Your choices are kept." },
};
