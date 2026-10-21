/**
 * Catalogue import pipeline (provider-neutral shell around the wger adapter).
 *   fetch  : paginated, polite, retrying, RESUMABLE (cursor persisted after every page)
 *   build  : raw → canonical snapshot, deterministic (same input → identical bytes), with a dry-run diff
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  CatalogueExercise,
  CatalogueSnapshot,
  Overrides,
  Quarantined,
} from "../../src/domain/catalogue";
import { normaliseWger, type WgerExercise } from "../../src/domain/catalogue-wger";

export const WGER_BASE = "https://wger.de/api/v2/exerciseinfo/";
const UA = "VAYVOR-catalogue-importer/1.0 (open-licence import; contact: project owner)";

type FetchState = {
  nextUrl: string | null;
  pages: number;
  done: boolean;
  startedAt: string;
  finishedAt?: string;
};
export type FetchOptions = {
  stateFile: string;
  rawFile: string;
  language?: number;
  limit?: number;
  delayMs?: number;
  retries?: number;
  fresh?: boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => string;
  onPage?: (n: number, total: number) => void;
};

const atomicWrite = (file: string, text: string) => {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file); // never leaves a half-written state file
};

/** Fetches every page, persisting after each one so a failure can resume at the failed page. Rerunning a finished fetch does nothing. */
export async function fetchWger(
  o: FetchOptions,
): Promise<{ pages: number; count: number; resumed: boolean; skipped: boolean }> {
  const f = o.fetchImpl ?? fetch;
  const sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = o.now ?? (() => new Date().toISOString());
  const retries = o.retries ?? 4;
  const first = `${WGER_BASE}?language=${o.language ?? 2}&limit=${o.limit ?? 100}&format=json`;

  let state: FetchState | null =
    !o.fresh && existsSync(o.stateFile) ? JSON.parse(readFileSync(o.stateFile, "utf8")) : null;
  let rows: WgerExercise[] =
    state && existsSync(o.rawFile) ? JSON.parse(readFileSync(o.rawFile, "utf8")) : [];
  if (state?.done) return { pages: state.pages, count: rows.length, resumed: false, skipped: true };
  const resumed = !!state;
  if (!state) {
    state = { nextUrl: first, pages: 0, done: false, startedAt: now() };
    rows = [];
  }

  while (state.nextUrl) {
    let page: { count: number; next: string | null; results: WgerExercise[] } | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res: Response = await f(state.nextUrl, {
          headers: { "User-Agent": UA, Accept: "application/json" },
        });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} (not retrying)`);
        page = await res.json();
        break;
      } catch (e) {
        if (attempt === retries || /not retrying/.test((e as Error).message)) throw e; // state on disk still points at this page
        await sleep(2 ** attempt * 1000);
      }
    }
    rows = rows.concat(page!.results);
    state = { ...state, nextUrl: page!.next, pages: state.pages + 1 };
    atomicWrite(o.rawFile, JSON.stringify(rows));
    atomicWrite(o.stateFile, JSON.stringify(state));
    o.onPage?.(rows.length, page!.count);
    if (state.nextUrl) await sleep(o.delayMs ?? 500); // be polite to a free public service
  }
  state = { ...state, done: true, finishedAt: now() };
  atomicWrite(o.stateFile, JSON.stringify(state));
  return { pages: state.pages, count: rows.length, resumed, skipped: false };
}

/* ------------------------------ build ------------------------------ */
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

export type BuildResult = {
  snapshot: CatalogueSnapshot;
  quarantine: Quarantined[];
  attribution: {
    id: string;
    name: string;
    text: string;
    media: { id: string; author: string; licence: string; url: string }[];
  }[];
  report: Record<string, unknown>;
};

export function buildSnapshot(
  raw: WgerExercise[],
  opts: { overrides?: Overrides; snapshot: string; fetchedAt: string },
): BuildResult {
  const published: CatalogueExercise[] = [];
  const quarantine: Quarantined[] = [];
  const seen = new Set<string>();
  for (const e of [...raw].sort((a, b) => a.uuid.localeCompare(b.uuid))) {
    if (seen.has(e.uuid)) continue; // reruns and overlapping pages never duplicate
    seen.add(e.uuid);
    const r = normaliseWger(e, opts.overrides ?? {});
    if (r.ok) published.push(r.exercise);
    else quarantine.push(r.quarantined);
  }
  // Distinct movements can share a name across providers later; exact name collisions within a source are kept apart by id.
  const names = new Map<string, number>();
  for (const p of published)
    names.set(p.name.toLowerCase(), (names.get(p.name.toLowerCase()) ?? 0) + 1);
  const tally = (f: (e: CatalogueExercise) => string | string[]) => {
    const m: Record<string, number> = {};
    for (const e of published) for (const k of [f(e)].flat()) m[k] = (m[k] ?? 0) + 1;
    return Object.fromEntries(
      Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    );
  };
  const reasons: Record<string, number> = {};
  for (const q of quarantine) for (const r of q.reasons) reasons[r] = (reasons[r] ?? 0) + 1;
  const snapshot: CatalogueSnapshot = {
    schema: 1,
    snapshot: opts.snapshot,
    provider: { name: "wger", url: "https://wger.de", fetchedAt: opts.fetchedAt },
    counts: {
      published: published.length,
      generator: published.filter((e) => e.tier === "generator").length,
      quarantined: quarantine.length,
    },
    exercises: published,
  };
  return {
    snapshot,
    quarantine,
    attribution: published.map((e) => ({
      id: e.id,
      name: e.name,
      text: e.attribution,
      media: e.media.map((m) => ({
        id: m.id,
        author: m.author,
        licence: m.licence.short,
        url: m.url,
      })),
    })),
    report: {
      snapshot: opts.snapshot,
      inputEntries: seen.size,
      published: published.length,
      generatorEligible: published.filter((e) => e.tier === "generator").length,
      quarantined: quarantine.length,
      quarantineReasons: reasons,
      uniqueNames: names.size,
      duplicateNames: [...names.entries()].filter(([, n]) => n > 1).map(([k]) => k),
      withImages: published.filter((e) => e.media.length).length,
      machineEquipment: published.filter((e) => e.equipment.includes("machine")).length,
      equipmentDerived: published.filter((e) => e.equipmentDerived.length).length,
      byPattern: tally((e) => e.pattern),
      byTracking: tally((e) => e.tracking),
      byLicence: tally((e) => e.licence.id),
      byCategory: tally((e) => e.category),
    },
  };
}

export type Diff = { added: string[]; removed: string[]; changed: string[]; unchanged: number };
/** Dry-run comparison against the previous snapshot (by stable id and content hash). */
export function diffSnapshots(prev: CatalogueSnapshot | null, next: CatalogueSnapshot): Diff {
  const a = new Map((prev?.exercises ?? []).map((e) => [e.id, hash(e)]));
  const b = new Map(next.exercises.map((e) => [e.id, hash(e)]));
  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  const changed = [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k));
  return { added, removed, changed, unchanged: b.size - added.length - changed.length };
}

export const stableJson = (v: unknown) => JSON.stringify(v) + "\n";
