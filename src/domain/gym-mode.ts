export function validateMusicUrl(
  value: string,
): { provider: "spotify" | "apple"; url: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (
      url.hostname === "open.spotify.com" &&
      /^\/(playlist|album)\/[A-Za-z0-9]+/.test(url.pathname)
    )
      return { provider: "spotify", url: url.toString() };
    if (
      (url.hostname === "music.apple.com" || url.hostname.endsWith(".music.apple.com")) &&
      /\/playlist\//.test(url.pathname)
    )
      return { provider: "apple", url: url.toString() };
    return null;
  } catch {
    return null;
  }
}

export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function nearbyGym<
  T extends { enabled: boolean; latitude: number; longitude: number; radiusM: number },
>(current: { latitude: number; longitude: number }, gyms: T[]): T | null {
  return gyms.find((gym) => gym.enabled && distanceMetres(current, gym) <= gym.radiusM) ?? null;
}

export type PresenceHeartbeat = { scope: "global" | "community" | "friends"; expiresAt: number };
/** Aggregates only non-expired anonymous heartbeat facts. Never accepts names or coordinates. */
export function livePulse(heartbeats: PresenceHeartbeat[], now: number) {
  const live = heartbeats.filter((heartbeat) => heartbeat.expiresAt > now);
  return {
    global: live.filter((heartbeat) => heartbeat.scope === "global").length,
    community: live.filter((heartbeat) => heartbeat.scope === "community").length,
    friends: live.filter((heartbeat) => heartbeat.scope === "friends").length,
  };
}
