/**
 * Usage (run from the repo root, with bun):
 *   bun scripts/catalogue/cli.ts fetch  [--fresh]            # download wger English exercises into .catalogue-cache/
 *   bun scripts/catalogue/cli.ts build  [--dry-run]          # write public/catalogue/v1/* and catalogue/quarantine.json
 * `build --dry-run` prints the diff against the committed snapshot and writes nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSnapshot, diffSnapshots, fetchWger, stableJson } from "./pipeline";

const CACHE = ".catalogue-cache";
const OUT = "public/catalogue/v1";
const [cmd, ...flags] = process.argv.slice(2);
const has = (f: string) => flags.includes(f);

if (cmd === "fetch") {
  const r = await fetchWger({ stateFile: `${CACHE}/wger.state.json`, rawFile: `${CACHE}/wger.json`, fresh: has("--fresh"), onPage: (n, t) => console.log(`${n}/${t}`) });
  console.log(r.skipped ? "Already fetched (use --fresh to refresh)." : `Fetched ${r.count} entries in ${r.pages} pages${r.resumed ? " (resumed)" : ""}.`);
} else if (cmd === "build") {
  if (!existsSync(`${CACHE}/wger.json`)) throw new Error("Run `fetch` first.");
  const state = JSON.parse(readFileSync(`${CACHE}/wger.state.json`, "utf8"));
  if (!state.done) throw new Error("The fetch is unfinished; rerun `fetch` to resume.");
  const raw = JSON.parse(readFileSync(`${CACHE}/wger.json`, "utf8"));
  const overrides = existsSync("catalogue/overrides.json") ? JSON.parse(readFileSync("catalogue/overrides.json", "utf8")) : {};
  const fetchedAt: string = state.finishedAt;
  const res = buildSnapshot(raw, { overrides, snapshot: fetchedAt.slice(0, 10), fetchedAt });
  const prev = existsSync(`${OUT}/exercises.json`) ? JSON.parse(readFileSync(`${OUT}/exercises.json`, "utf8")) : null;
  const d = diffSnapshots(prev, res.snapshot);
  console.log(`published ${res.snapshot.counts.published} (generator ${res.snapshot.counts.generator}), quarantined ${res.snapshot.counts.quarantined}`);
  console.log(`diff vs committed: +${d.added.length} added, -${d.removed.length} removed, ~${d.changed.length} changed, ${d.unchanged} unchanged`);
  if (has("--dry-run")) console.log("dry run: nothing written");
  else {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/exercises.json`, stableJson(res.snapshot));
    writeFileSync(`${OUT}/report.json`, JSON.stringify(res.report, null, 2) + "\n");
    mkdirSync("catalogue", { recursive: true });
    writeFileSync("catalogue/quarantine.json", JSON.stringify(res.quarantine, null, 1) + "\n");
    console.log(`wrote ${OUT}/ and catalogue/quarantine.json`);
  }
} else console.log("commands: fetch [--fresh] | build [--dry-run]");
