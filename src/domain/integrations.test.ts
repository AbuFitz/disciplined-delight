import { describe, expect, it } from "vitest";
import { PROVIDERS, STATUS_COPY, providerStatus, type Facts } from "./integrations";

const base: Facts = { online: true, configured: [], bluetooth: false };

describe("integration providers are honest", () => {
  it("never reports a provider as connected", () => {
    const all = Object.keys(STATUS_COPY);
    expect(all).not.toContain("connected");
    for (const p of PROVIDERS)
      expect(["link_only", "unsupported", "credentials_missing", "needs_permission"]).toContain(
        providerStatus(p.id, base),
      );
  });
  it("falls back to link-only music when credentials are missing", () => {
    expect(providerStatus("spotify", base)).toBe("link_only");
    expect(providerStatus("apple_music", base)).toBe("link_only");
  });
  it("needs permission, not a fake connection, even with credentials", () => {
    const facts = { ...base, configured: ["VITE_SPOTIFY_CLIENT_ID"] };
    expect(providerStatus("spotify", facts)).toBe("needs_permission");
    expect(providerStatus("spotify", { ...facts, online: false })).toBe("offline");
  });
  it("maps device permission states", () => {
    expect(providerStatus("location", { ...base, geolocation: "prompt" })).toBe("needs_permission");
    expect(providerStatus("location", { ...base, geolocation: "denied" })).toBe("denied");
    expect(providerStatus("notifications", { ...base, notifications: "granted" })).toBe("granted");
    expect(providerStatus("notifications", base)).toBe("unsupported");
  });
  it("names missing credentials by name only", () => {
    for (const p of PROVIDERS) expect(p.needs.join(" ")).not.toMatch(/[A-Za-z0-9]{32,}/);
  });
});
