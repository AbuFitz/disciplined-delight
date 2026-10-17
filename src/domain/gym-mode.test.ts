import { describe, expect, it } from "vitest";
import { distanceMetres, livePulse, nearbyGym, validateMusicUrl } from "./gym-mode";

describe("gym mode privacy helpers", () => {
  it("accepts only supported playlist providers", () => {
    expect(validateMusicUrl("https://open.spotify.com/playlist/abc123")?.provider).toBe("spotify");
    expect(validateMusicUrl("https://music.apple.com/gb/playlist/test/pl.u-123")?.provider).toBe(
      "apple",
    );
    expect(validateMusicUrl("https://example.com/playlist/abc")).toBeNull();
    expect(validateMusicUrl("javascript:alert(1)")).toBeNull();
  });
  it("uses an explicit radius for foreground arrival checks", () => {
    const gym = { enabled: true, latitude: 51.5, longitude: -0.1, radiusM: 150 };
    expect(distanceMetres(gym, { latitude: 51.5005, longitude: -0.1 })).toBeLessThan(150);
    expect(nearbyGym({ latitude: 51.5005, longitude: -0.1 }, [gym])).toBe(gym);
    expect(nearbyGym({ latitude: 51.51, longitude: -0.1 }, [gym])).toBeNull();
  });
  it("counts only unexpired anonymous heartbeats", () => {
    expect(
      livePulse(
        [
          { scope: "global", expiresAt: 20 },
          { scope: "friends", expiresAt: 5 },
        ],
        10,
      ),
    ).toEqual({ global: 1, community: 0, friends: 0 });
  });
});
