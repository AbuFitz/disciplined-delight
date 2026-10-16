# Exercise catalogue: source pilot, pipeline and rights

Pilot run 16 October 2026 against the live wger public API. Numbers below come from that run
(`public/catalogue/v1/report.json`), not from marketing pages. This is engineering analysis, **not legal advice**.

## Source decision

| Candidate | Finding | Decision |
| --- | --- | --- |
| **wger** `/api/v2/exerciseinfo/` | Public, paginated, per-entry licences, authors, images with their own licences | **Imported** (first and only source) |
| ExerciseDB | Terms prohibit persistent storage and limit caching to one hour | **Not used.** Incompatible with an offline catalogue without a separate agreement |
| free-exercise-db | Claims Unlicense, but the repository has no licence file and its images' provenance is unclear | **Not imported.** Candidate only after provenance is verified |
| Lyfta | A product benchmark | **Nothing copied** (no descriptions, demonstrations or data) |

## What the wger pilot found

- 932 English entries, no duplicate English names. After the importer's gates: **879 published, 494 generator-eligible, 53 quarantined**
  (39 with no usable instructions, 14 whose text contains links).
- Licences are per entry: CC BY-SA 4.0 (755), CC BY-SA 3.0 (104), CC0 (20). **Every non-CC0 entry is ShareAlike.**
- Instruction quality is uneven: median 222 characters, 25 empty, 594 pass a 100-character and primary-muscle check. Only 494 pass all generator gates (instructions, muscle, known movement pattern).
- Equipment taxonomy has **no "machine" type**, although ~78 names are machine or cable stations. 50 entries get machine metadata derived from the name by rules and are flagged `equipmentDerived`. Selectorised-machine coverage is weak, so the owner's machine-based programme stays his own custom content (linked by name search, not replaced).
- Images: 383 across 279 upstream exercises, CC BY-SA 3/4, 46 flagged AI-generated (34 exercises have **only** AI images). AI images are excluded and the exclusion is recorded. The first licensed import produced 253 images; a frame-by-frame human review removed four semantically wrong associations and 14 byte-identical frames within the same exercise. The committed snapshot now has **235 credited images across 186 exercises**.
- Videos: 78 on 46 exercises, mostly ~60 MB HEVC `.MOV`. Unsuitable for the web or offline use. **Out of scope.**
- Not covered by the source: setup steps as a separate field, difficulty/experience level, selectorised machine variety, much pull-up/vertical-pull and overhead-press depth (26 and 15 entries).

## Rights obligations (to confirm with the owner)

- Attribution is stored with every record (`attribution`, `author`, `licence`, source URL) and per image. The Library shows the exact credit on every exercise; `/credits` exposes the snapshot source, aggregate contributor counts and every licence represented in the shipped data.
- ShareAlike: text we adapt (we only strip HTML and normalise formatting) must be offered under the same or a compatible licence. The catalogue snapshot (`public/catalogue/v1/exercises.json`) is a CC BY-SA derivative; app code is unaffected. The in-app credits page links the applicable CC BY-SA 3.0, CC BY-SA 4.0 and CC0 1.0 terms and directs people to each record's exact attribution.
- Images are self-hosted at `/catalogue/media/` for reliable same-origin/offline use. `media-manifest.json` retains each original wger URL, author, licence, byte count and SHA-256 checksum; the app still renders the required credit. This is redistribution of the licensed media, so the licence and attribution obligations remain.
- A reviewer with the right expertise should check any instruction text shown as safety-relevant guidance. "Generator-eligible" means passes automated gates, **not** that a qualified person has reviewed it.

## Pipeline

```bash
bun scripts/catalogue/cli.ts fetch [--fresh]   # paginated, polite, retrying, resumable (.catalogue-cache/)
bun scripts/catalogue/cli.ts build --dry-run   # diff vs committed snapshot, writes nothing
bun scripts/catalogue/cli.ts build             # writes public/catalogue/v1/{exercises,report}.json + catalogue/quarantine.json
npm run catalogue:media                        # apply reviewed exclusions and self-host licensed media
npm run catalogue:media:check                  # verify paths, provenance, bytes, hashes and review state
```

- Stable IDs `wger:<uuid>`; source version = wger `last_update_global`.
- Resume: the cursor (next page URL) is written atomically after every page; a failure resumes at the failed page. A finished fetch re-run makes no requests.
- Retries: 429 and 5xx back off 1, 2, 4, 8 s; other 4xx stop immediately.
- Deterministic: same input gives byte-identical output; repeated rows never duplicate.
- Human curation lives in `catalogue/overrides.json` (hide, rename, pattern, tracking, equipment and `mediaRemove`) and is applied over the upstream record at build time, so a refresh cannot overwrite it. The media command applies the same exclusions before writing its manifest. User-created exercises are a separate local collection.
- Historical sessions copy the exercise name and prescription at the time (snapshot), so a catalogue refresh never rewrites history.
- Genuinely different variations stay separate records. Substitutions are suggested by pattern, muscle and equipment, not merged.

Tested in `src/data/catalogue-pipeline.test.ts`, `src/domain/catalogue-wger.test.ts` (real wger entries as fixtures) and `src/data/catalogue-media.test.ts` (committed file/manifest parity, checksums, reviewed exclusions and no repeated bytes within an exercise).

## Deviation from the masterplan

The plan suggests importing into a canonical catalogue in Supabase. No VAYVOR Supabase project exists yet, so the catalogue ships as a **versioned static snapshot** the app lazy-loads and caches. That works offline and has no backend dependency.
Supabase tables for a shared catalogue are only needed once users share custom exercises (Circle phase), so they are deferred rather than added as unused schema.
