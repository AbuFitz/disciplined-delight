/** Computes the source/licence manifest from the committed snapshot and public assets. Pure and deterministic. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

export const ALLOWED_LICENCES = new Set(["RepDB Free Tier 1.0", "CC BY-SA 4.0", "CC BY-SA 3.0", "CC0 1.0", "CC0"]);
const SOURCES = {
  wger: {
    name: "wger Workout Manager",
    url: "https://wger.de",
    use: "Exercise text, muscles and images, redistributed per-entry under the licence recorded on each record.",
    redistribution: "Allowed with attribution; ShareAlike applies to CC BY-SA material.",
  },
  RepDB: {
    name: "RepDB Free tier dataset",
    url: "https://repdb.co",
    use: "Exercise records and static WebP start/peak illustrations.",
    redistribution: "Permitted by the RepDB Free Tier 1.0 licence with attribution. Paid RepDB Standard motion is NOT included.",
  },
};

export function computeRights(root = process.cwd()) {
  const snap = JSON.parse(readFileSync(join(root, "public/catalogue/v1/exercises.json"), "utf8"));
  const byProvider = {};
  const licences = {};
  const kinds = {};
  let remote = 0;
  let missing = 0;
  let assets = 0;
  for (const e of snap.exercises) {
    const p = (byProvider[e.source.provider] ??= { exercises: 0, withMedia: 0, mediaItems: 0 });
    p.exercises++;
    if (e.media.length) p.withMedia++;
    for (const m of e.media) {
      p.mediaItems++;
      assets++;
      licences[m.licence.short] = (licences[m.licence.short] ?? 0) + 1;
      kinds[m.kind] = (kinds[m.kind] ?? 0) + 1;
      for (const u of [m.url, m.thumb, m.poster].filter(Boolean)) {
        if (/^https?:/i.test(u)) remote++;
        else if (!existsSync(join(root, "public", u.replace(/^\//, "")))) missing++;
      }
    }
  }
  // Every raster outside the licensed catalogue media must be a known original (icons, brand).
  const ORIGINAL = new Set(["apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "brand/vayvor-wordmark-email.png"]);
  const rasters = [];
  const scan = (dir, rel = "") => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name), r = rel ? `${rel}/${name}` : name;
      if (statSync(full).isDirectory()) {
        if (r !== "catalogue") scan(full, r);
      } else if (/\.(png|jpe?g|gif|webp|avif)$/i.test(name)) rasters.push(r);
    }
  };
  scan(join(root, "public"));
  const unknown = rasters.filter((r) => !ORIGINAL.has(r)).sort();
  return {
    snapshot: snap.snapshot,
    sources: Object.fromEntries(Object.entries(byProvider).map(([k, v]) => [k, { ...(SOURCES[k] ?? { name: k }), ...v }])),
    mediaLicences: Object.fromEntries(Object.entries(licences).sort()),
    mediaKinds: Object.fromEntries(Object.entries(kinds).sort()),
    totals: { exercises: snap.exercises.length, mediaItems: assets, remoteUrls: remote, missingFiles: missing },
    motion: { genuineMotionItems: (kinds.animation ?? 0) + (kinds.video ?? 0), note: "All current assets are static images. RepDB Standard (paid) motion is not included; install a licensed bundle with `npm run catalogue:repdb:motion`." },
    unverifiedProvenance: unknown.map((path) => ({ path, reason: "Raster image outside the licensed catalogue with no recorded provenance." })),
    originalAssets: [...ORIGINAL].sort(),
    allowedMediaLicences: [...ALLOWED_LICENCES].sort(),
  };
}
