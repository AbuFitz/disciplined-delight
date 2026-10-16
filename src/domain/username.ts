/** Mirrors the database: 3–20 chars, starts with a letter, letters/digits/underscore. Compared case-insensitively. */
export const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const RESERVED = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "newlife",
  "vayvor",
  "vayvorhq",
  "new_life",
  "moderator",
  "mod",
  "system",
  "root",
  "staff",
  "official",
  "null",
  "undefined",
  "anonymous",
  "everyone",
  "me",
  "you",
]);

export type UsernameCheck = { ok: true } | { ok: false; reason: string };

export function checkUsername(raw: string): UsernameCheck {
  const v = raw.trim();
  if (v.length < 3) return { ok: false, reason: "Use at least 3 characters." };
  if (v.length > 20) return { ok: false, reason: "Use 20 characters or fewer." };
  if (!/^[A-Za-z]/.test(v)) return { ok: false, reason: "Start with a letter." };
  if (!USERNAME_RE.test(v)) return { ok: false, reason: "Letters, numbers and underscores only." };
  if (RESERVED.has(v.toLowerCase())) return { ok: false, reason: "That name is reserved." };
  return { ok: true };
}

export const normaliseUsername = (v: string) => v.trim().toLowerCase();
