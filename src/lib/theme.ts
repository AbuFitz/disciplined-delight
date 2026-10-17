export type ThemePref = "dark" | "light" | "system";
export type AccentWorld = "mint" | "cobalt" | "violet" | "coral" | "amber" | "rose" | "slate";
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
  document.documentElement.dataset.theme = eff;
  document.documentElement.dataset.accent = getAccentWorld();
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", eff === "light" ? "#f8f6f1" : "#101114");
}
export function getAccentWorld(): AccentWorld {
  try {
    const value = localStorage.getItem(ACCENT_KEY);
    if (["mint", "cobalt", "violet", "coral", "amber", "rose", "slate"].includes(value ?? ""))
      return value as AccentWorld;
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
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem('${KEY}')||'dark';var l=p==='light'||(p==='system'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=l?'light':'dark';document.documentElement.dataset.accent=localStorage.getItem('${ACCENT_KEY}')||'cobalt'}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.dataset.accent='cobalt'}})()`;
