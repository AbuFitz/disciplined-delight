#!/usr/bin/env node
/**
 * Captures review evidence for the experience lab (dev server must be running, with the lab route available).
 *
 *   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs BASE=http://localhost:5173 node scripts/experience-lab/capture.mjs
 *
 * Writes contact sheets (one row of key moments per prototype/size/theme) and screen recordings of the
 * 15-second sequence into docs/experience-lab/. playwright-core is not a project dependency.
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const BASE = process.env.BASE ?? "http://localhost:5173";
const OUT = new URL("../../docs/experience-lab/", import.meta.url).pathname;
const TMP = join(OUT, ".tmp");
mkdirSync(TMP, { recursive: true });

const MOMENTS = [
  [800, "arrive"],
  [3500, "readiness"],
  [6900, "buddy preview"],
  [8800, "now"],
  [10800, "gym set"],
  [13200, "rest"],
];
const SIZES = { 320: [320, 640], 390: [390, 780], desk: [1080, 640] };
const exe = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });

async function frameShots(p, size, theme, rm) {
  const [w, h] = SIZES[size];
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: rm ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const bufs = [];
  for (const [t] of MOMENTS) {
    await page.goto(
      `${BASE}/dev/experience-lab?p=${p}&w=${size}&theme=${theme}&rm=${rm ? 1 : 0}&seek=${t}&chrome=0`,
      { waitUntil: "networkidle" },
    );
    await page.waitForTimeout(t >= 13000 ? 1400 : t < 1000 ? 3800 : 2300);
    bufs.push((await page.screenshot()).toString("base64"));
  }
  // compose a labelled contact sheet in the browser
  const sheet = await ctx.newPage();
  const cols = size === "desk" ? 3 : 6;
  const scale = size === "desk" ? 0.5 : 1;
  await sheet.setContent(
    `<body style="margin:0;background:#111;color:#ddd;font:12px monospace"><canvas id=c></canvas></body>`,
  );
  const png = await sheet.evaluate(
    async ({ bufs, w, h, labels, cols, scale, title }) => {
      const cw = Math.round(w * scale),
        ch = Math.round(h * scale),
        pad = 8,
        head = 22;
      const rows = Math.ceil(bufs.length / cols);
      const c = document.getElementById("c");
      c.width = cols * (cw + pad) + pad;
      c.height = rows * (ch + head + pad) + head;
      const g = c.getContext("2d");
      g.fillStyle = "#111";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#ddd";
      g.font = "13px monospace";
      g.fillText(title, pad, 15);
      for (let i = 0; i < bufs.length; i++) {
        const img = new Image();
        await new Promise((r) => {
          img.onload = r;
          img.src = "data:image/png;base64," + bufs[i];
        });
        const x = pad + (i % cols) * (cw + pad),
          y = head + Math.floor(i / cols) * (ch + head + pad);
        g.fillStyle = "#999";
        g.font = "11px monospace";
        g.fillText(labels[i], x, y + 12);
        g.drawImage(img, x, y + 16, cw, ch);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    {
      bufs,
      w,
      h,
      labels: MOMENTS.map((m) => `${(m[0] / 1000).toFixed(1)}s ${m[1]}`),
      cols,
      scale,
      title: `Prototype ${p.toUpperCase()} · ${size} · ${theme}${rm ? " · reduced motion" : ""}`,
    },
  );
  const name = `${p}-${size}-${theme}${rm ? "-reduced" : ""}.png`;
  writeFileSync(join(OUT, name), Buffer.from(png, "base64"));
  console.log("wrote", name);
  await ctx.close();
}

async function video(p, size, theme) {
  const [w, h] = SIZES[size];
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    recordVideo: { dir: TMP, size: { width: w, height: h } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(
    `${BASE}/dev/experience-lab?p=${p}&w=${size}&theme=${theme}&chrome=0&autoplay=1`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(17500);
  const v = page.video();
  await ctx.close();
  const path = await v.path();
  renameSync(path, join(OUT, `${p}-${size}-${theme}.webm`));
  console.log("wrote", `${p}-${size}-${theme}.webm`);
}

const only = process.env.ONLY ?? "all";
const list = (k, all) => (process.env[k] ? process.env[k].split(",") : all);
const PROTOS = list("PROTOS", ["a", "b", "c"]);
const SIZE_IDS = list("SIZE_IDS", ["320", "390", "desk"]);
const THEMES = list("THEMES", ["dark", "light"]);
if (only === "all" || only === "shots")
  for (const p of PROTOS)
    for (const size of SIZE_IDS)
      for (const theme of THEMES) await frameShots(p, size, theme, false);
if (only === "all" || only === "rm")
  for (const p of PROTOS) for (const theme of THEMES) await frameShots(p, "390", theme, true);
if (only === "all" || only === "video")
  for (const p of PROTOS) {
    await video(p, "390", "dark");
    await video(p, "desk", "light");
  }
await browser.close();
