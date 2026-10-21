export type ThemePref = "dark" | "light" | "system";
export type AccentWorld = "cobalt" | "citrus" | "coral" | "violet" | "rose" | "ice" | "slate";
export const ACCENT_WORLDS: AccentWorld[] = [
  "cobalt",
  "citrus",
  "coral",
  "violet",
  "rose",
  "ice",
  "slate",
];
/** Neutral foundations. Obsidian and Graphite are dark; Parchment and Fog are light. */
export type Foundation = "obsidian" | "graphite" | "parchment" | "fog";
const FOUNDATION_KEY = "vayvor-foundation";
const FOUNDATION_THEME: Record<Foundation, "dark" | "light"> = {
  obsidian: "dark",
  graphite: "dark",
  parchment: "light",
  fog: "light",
};
const FOUNDATION_COLOUR: Record<Foundation, string> = {
  obsidian: "#0a0a0c",
  graphite: "#16171a",
  parchment: "#f3efe6",
  fog: "#eceef1",
};
export function getFoundation(): Foundation | null {
  try {
    const v = localStorage.getItem(FOUNDATION_KEY);
    if (v && v in FOUNDATION_THEME) return v as Foundation;
  } catch {
    /* storage unavailable */
  }
  return null;
}
/** A stored foundation only applies when it matches the resolved mode; otherwise the mode's default is used. */
export function foundationFor(theme: "dark" | "light", f: Foundation | null): Foundation {
  return f && FOUNDATION_THEME[f] === theme ? f : theme === "dark" ? "obsidian" : "parchment";
}
export function setFoundation(value: Foundation | null) {
  try {
    if (value) localStorage.setItem(FOUNDATION_KEY, value);
    else localStorage.removeItem(FOUNDATION_KEY);
  } catch {
    /* storage unavailable */
  }
  applyTheme(getThemePref());
}
/** Colour worlds that were renamed or retired keep working for anyone who stored them. */
const LEGACY_WORLD: Record<string, AccentWorld> = { amber: "citrus", mint: "cobalt" };
const KEY = "nl-theme"; // per-device convenience only
const ACCENT_KEY = "vayvor-accent";

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "dark";
}
export function applyTheme(pref: ThemePref) {
  const eff =
    pref === "system"
      ? matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : pref;
  const foundation = foundationFor(eff, getFoundation());
  document.documentElement.dataset.theme = eff;
  document.documentElement.dataset.foundation = foundation;
  document.documentElement.dataset.accent = getAccentWorld();
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", FOUNDATION_COLOUR[foundation]);
}
export function getAccentWorld(): AccentWorld {
  try {
    const value = localStorage.getItem(ACCENT_KEY) ?? "";
    if ((ACCENT_WORLDS as string[]).includes(value)) return value as AccentWorld;
    if (LEGACY_WORLD[value]) return LEGACY_WORLD[value]!;
  } catch {
    /* storage unavailable */
  }
  return "cobalt";
}
export function setAccentWorld(value: AccentWorld) {
  try {
    localStorage.setItem(ACCENT_KEY, value);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.dataset.accent = value;
}
export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
}
/** Inline script run before paint to avoid a flash. */
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem('${KEY}')||'dark';var l=p==='light'||(p==='system'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=l?'light':'dark';var a=localStorage.getItem('${ACCENT_KEY}')||'cobalt';a=a==='amber'?'citrus':a==='mint'?'cobalt':a;document.documentElement.dataset.accent=a;var f=localStorage.getItem('${FOUNDATION_KEY}');var d=l?'light':'dark';var ok={obsidian:'dark',graphite:'dark',parchment:'light',fog:'light'};document.documentElement.dataset.foundation=f&&ok[f]===d?f:(l?'parchment':'obsidian')}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.dataset.accent='cobalt'}})()`;
