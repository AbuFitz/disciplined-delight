/**
 * VAYVOR brand constants. User-visible name lives here; storage and install identifiers deliberately do NOT
 * (they keep their original values so existing data and installed apps keep working; see docs/BRAND.md).
 */
export const BRAND = {
  name: "VAYVOR",
  /** Pronounced "VAY-vor". */
  pronunciation: "VAY-vor",
  tagline: "Body, mind, soul, together.",
  description: "Train, eat well, reflect and pray on time, with friends beside you.",
  /** The intended primary domain. Not used for any callback or config until it is registered and connected. */
  intendedDomain: "vayvor.com",
} as const;

/** Share text uses whatever origin the app is actually served from (never a hard-coded domain). */
export function shareText(what: string, url?: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${what} ${BRAND.name}: ${url ?? origin}`.trim();
}
