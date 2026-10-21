# Exercise catalogue: source pilot, pipeline and rights

Pilot run 16 October 2026 against the live wger public API. Numbers below come from that run
(`public/catalogue/v1/report.json`), not from marketing pages. This is engineering analysis, **not legal advice**.

## Source decision

| Candidate                        | Finding                                                                                                             | Decision                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **wger** `/api/v2/exerciseinfo/` | Public, paginated, per-entry licences, authors, images with their own licences                                      | **Imported** for broad text coverage and reviewed generator records               |
| **RepDB free tier**              | 643 structured exercises and 1,138 original flat WebP illustrations; commercial in-app use with visible attribution | **Imported**; exact-name records merge media, otherwise remain library-only       |
| ExerciseDB                       | Terms prohibit persistent storage and limit caching to one hour                                                     | **Not used.** Incompatible with an offline catalogue without a separate agreement |
| free-exercise-db                 | Claims Unlicense, but the repository has no licence file and its images' provenance is unclear                      | **Not imported.** Candidate only after provenance is verified                     |
| Lyfta                            | A product benchmark                                                                                                 | **Nothing copied** (no descriptions, demonstrations or data)                      |
| Flow exercise dataset            | Animation prompts/provenance are incomplete and movement accuracy is not professionally reviewed                    | **Not imported**                                                                  |

## What the wger pilot found

- 932 English entries. After the importer's publication gates: **879 published and 53 quarantined** (39 with no usable instructions, 14 whose text contains links). The committed snapshot has 878 unique normalised names because two records are legitimate "T-bar row" variants.
- Licences are per entry: CC BY-SA 4.0 (755), CC BY-SA 3.0 (104), CC0 (20). **Every non-CC0 entry is ShareAlike.**
- Instruction quality is uneven: median 222 characters, 25 empty, 594 pass a 100-character and primary-muscle check. In the pilot, 494 passed the automated instruction, muscle and movement-pattern gates. Automatic plans now apply a stricter requirement: **141 explicitly reviewed records** are in the generator tier; the rest of the published catalogue remains browsable and can be added manually.
- Equipment taxonomy has **no "machine" type**, although ~78 names are machine or cable stations. 50 entries get machine metadata derived from the name by rules and are flagged `equipmentDerived`. Selectorised-machine coverage is weak, so the owner's machine-based programme stays his own custom content (linked by name search, not replaced).
- Images: 383 across 279 upstream exercises, CC BY-SA 3/4, 46 flagged AI-generated (34 exercises have **only** AI images). AI images are excluded and the exclusion is recorded. The first licensed import produced 253 images; a frame-by-frame human review removed four semantically wrong associations and 14 byte-identical frames within the same exercise. The committed snapshot now has **235 credited images across 186 exercises**.
- Videos: 78 on 46 exercises, mostly ~60 MB HEVC `.MOV`. Unsuitable for the web or offline use. **Out of scope.**
- Not covered by the source: setup steps as a separate field, difficulty/experience level, selectorised machine variety, much pull-up/vertical-pull and overhead-press depth (26 and 15 entries).

## RepDB illustration and motion layer

- The committed merged snapshot contains **1,421 exercises** and **1,373 self-hosted media assets**. RepDB contributed all 643 free-tier records: 542 new library records and 101 exact-name media merges, with 1,138 WebP illustrations. Fuzzy names are never merged automatically.
- The free-tier licence permits personal and commercial use inside applications with visible attribution, prohibits republishing the collection as a standalone dataset/API, and excludes the evaluation-only premium samples. VAYVOR keeps RepDB attribution on every item and on `/credits`; `premium-samples/` is never imported.
- Cards use still thumbnails. Detail and active-session surfaces use the shared `ExerciseMedia` player. It supports stills, animated image loops and MP4/WebM clips, poster fallback, error recovery, play/pause, off-screen suspension and `prefers-reduced-motion`.
- RepDB Standard's production motion loops are **not included** and have not been purchased. `npm run catalogue:repdb:motion -- --source /licensed/bundle --license-file /purchase/record` validates a user-supplied complete licensed bundle, rejects preview samples, records the licence proof hash and installs matching motion assets. The command refuses small/partial bundles.

## Rights obligations (to confirm with the owner)

- Attribution is stored with every record (`attribution`, `author`, `licence`, source URL) and per image. The Library shows the exact credit on every exercise; `/credits` exposes the snapshot source, aggregate contributor counts and every licence represented in the shipped data.
- ShareAlike: text we adapt (we only strip HTML and normalise formatting) must be offered under the same or a compatible licence. The catalogue snapshot (`public/catalogue/v1/exercises.json`) is a CC BY-SA derivative; app code is unaffected. The in-app credits page links the applicable CC BY-SA 3.0, CC BY-SA 4.0 and CC0 1.0 terms and directs people to each record's exact attribution.
- Images are self-hosted at `/catalogue/media/` for reliable same-origin/offline use. `media-manifest.json` retains each original wger URL, author, licence, byte count and SHA-256 checksum; the app still renders the required credit. This is redistribution of the licensed media, so the licence and attribution obligations remain.
- A reviewer with the right expertise should check any instruction text shown as safety-relevant guidance. The generator tier has passed automated gates and explicit internal curation, **not** review by a qualified coach or clinician.

## Pipeline

```bash
bun scripts/catalogue/cli.ts fetch [--fresh]   # paginated, polite, retrying, resumable (.catalogue-cache/)
bun scripts/catalogue/cli.ts build --dry-run   # diff vs committed snapshot, writes nothing
bun scripts/catalogue/cli.ts build             # writes public/catalogue/v1/{exercises,report}.json + catalogue/quarantine.json
npm run catalogue:media                        # apply reviewed exclusions and self-host licensed media
npm run catalogue:media:check                  # verify paths, provenance, bytes, hashes and review state
npm run catalogue:repdb -- --source /path/to/exercise-dataset
npm run catalogue:repdb:motion -- --source /licensed/bundle --license-file /purchase/record
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

## Curation (how automatic programmes choose exercises)

`catalogue/overrides.json` is the persistent corrections file, keyed by stable id (`wger:<uuid>`). Each entry can hide an
exercise, rename it, and **correct its movement pattern, equipment (replace, add or remove), tracking type and muscles**,
and can mark it `curated: "new" | "some"`.

- Only exercises that pass the automatic gates **and** are curated are in the `generator` tier, which is all the plan
  generator ever uses. `new` means suitable for beginners and people returning; `some` is for experienced lifters only.
  Everything else (738 of 879) stays fully browsable in the Library.
- Upstream data is wrong in ways name rules cannot fix (for example leg curls, leg extensions and lat pulldowns tagged
  "bodyweight", a deadlift listing only lats). These are fixed per exercise in the file, not by adding more name-based
  exclusions in code. There are none left in the planner.
- Current state: 141 curated exercises (`public/catalogue/v1/report.json`: `generatorEligible`). Each has been read by a
  person (the author of this change); it has **not** been reviewed by a coach. Rebuild with
  `bun scripts/catalogue/cli.ts build` after editing the file; `build --dry-run` shows what would change.
- Adding to the curated set is a deliberate edit to that file, with a pattern, equipment and tracking that you have checked.

## Licensed motion bundle: exact requirements

`npm run catalogue:repdb:motion -- --source <dir> --license-file <file>` installs motion only
from a bundle you have licensed. It requires: at least 100 `.webp`, `.mp4` or `.webm` motion files
(preview/sample folders such as `premium-samples` are refused; `-start`/`-peak` stills are
ignored); file names matching a catalogue RepDB slug (optionally suffixed `-animation`,
`-animated` or `-loop`); and a non-empty licence or purchase record whose hash is stored. Until
then every exercise shows stills or "illustrated steps" and is never labelled as motion.

## Exercises-dataset merge (MIT data) and the restricted local media source

Imported 21 October 2026 from `hasaneyldrm/exercises-dataset` (MIT for **data, text and translations**).
`npm run catalogue:dataset -- --source /path/to/exercises-dataset` is repeatable and idempotent.

- **Canonical ids never change.** Existing `wger:` / `repdb:` / `custom:` ids stay. A dataset record whose
  normalised name (or word-order/plural-insensitive token key) equals an existing name or alias is **merged**:
  the existing record keeps its fields and media, gains a `source.merged` cross-reference and the `xd_text`
  flag. Everything else is added as `xd:<id>` (`ExercisesDataset`, licence `MIT (data)`, tier `library`,
  `not_reviewed_for_generator`). Result: 1,421 -> 2,598 exercises (139 merged, 8 folded into an earlier dataset
  record, 1,177 added).
- `public/catalogue/v1/aliases.json` maps every dataset id to its canonical id; `useCatalogue().byId` resolves
  aliases, and `canonicalId()` is exported. `catalogue/id-baseline.json` freezes the pre-merge ids; a test fails
  if any stops resolving (programmes, history and favourites reference them).
- Translations (it, tr, es, ru, zh, hi, pl, ko, fr instruction steps) are lazy per-language files in
  `public/catalogue/v1/i18n/<lang>.json`, keyed by canonical id. English stays in the snapshot.
- Names are title-cased from the dataset's lower-case names; muscle, equipment, pattern and tracking are mapped by
  rules in the importer and are **not** coach-reviewed. Dataset-only records never enter the plan generator.

### Media: Gym visual is NOT licensed to this project

The dataset's images and GIFs are (c) Gym visual, redistributed there with permission at 180x180 and governed by
Gym visual's terms. **We hold no licence.** Therefore:

- No binary is committed, copied to `public/`, bundled or put in Git LFS. The cache is the gitignored
  `.local-media/gymvisual/`, filled by `npm run catalogue:local-media -- --source <checkout>` (refuses to write if
  the folder is not gitignored; `--check` verifies the cache).
- `catalogue/local-media-index.json` (tracked, no binaries) maps canonical ids to file names and keeps the
  dataset's provenance fields.
- The dev adapter (`src/data/local-media.ts`) is active only when `import.meta.env.DEV` **and**
  `VITE_LOCAL_MEDIA=gymvisual` (put it in an untracked `.env.local`). `vite.config.ts` serves `/local-media/*`
  from the cache only with `apply: "serve"`; the plugin does not exist in a build. In a production build the whole
  branch is dead-code-eliminated (verified: the built output contains none of the local paths).
- Local items are labelled `Local dev media` with the credit "(c) Gym visual (not licensed)". The licensed
  catalogue media remains the fallback and the production source.
- **Guards:** `npm run build` ends with `node scripts/catalogue/dist-rights.mjs`, which fails if any tracked file,
  `public/` or build output (`dist`, `.output`, `.vercel/output`, ...) contains restricted file names, `local-media`
  paths, GIFs without licensed provenance in the media manifest, or Git LFS media config.
  `src/data/rights-local-media.test.ts` covers the guard on leaky/clean fixtures, the dev-only gating, alias and
  baseline integrity and that dataset records carry no media.
- **Switching after a licence is supplied:** produce licensed `MediaItem`s (same shape, a real licence entry and
  self-hosted files with hashes in the media manifest) from a normal importer, add them to the snapshot, and delete
  the dev adapter and flag. Nothing else changes.
