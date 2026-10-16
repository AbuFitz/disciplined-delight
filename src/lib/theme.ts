export type ThemePref = "dark" | "light" | "system";
const KEY = "nl-theme"; // per-device convenience only

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
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", eff === "light" ? "#f8f6f1" : "#0e1311");
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
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem('${KEY}')||'dark';var l=p==='light'||(p==='system'&&matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=l?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}})()`;
