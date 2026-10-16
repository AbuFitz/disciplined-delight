# Exercise catalogue: source pilot, pipeline and rights

Pilot run 16 October 2026 against the live wger public API. Numbers below come from that run
(`public/catalogue/v1/report.json`), not from marketing pages. This is engineering analysis, **not legal advice**.

## Source decision

| Candidate                        | Finding                                                                                        | Decision                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **wger** `/api/v2/exerciseinfo/` | Public, paginated, per-entry licences, authors, images with their own licences                 | **Imported** (first and only source)                                              |
| ExerciseDB                       | Terms prohibit persistent storage and limit caching to one hour                                | **Not used.** Incompatible with an offline catalogue without a separate agreement |
| free-exercise-db                 | Claims Unlicense, but the repository has no licence file and its images' provenance is unclear | **Not imported.** Candidate only after provenance is verified                     |
| Lyfta                            | A product benchmark                                                                            | **Nothing copied** (no descriptions, demonstrations or data)                      |

## What the wger pilot found

- 932 English entries, no duplicate English names. After the importer's gates: **879 published, 53 quarantined**; 494 passed every automatic quality gate, of which **141 are hand-curated for automatic programmes** (see Curation)
  (39 with no usable instructions, 14 whose text contains links).
- Licences are per entry: CC BY-SA 4.0 (755), CC BY-SA 3.0 (104), CC0 (20). **Every non-CC0 entry is ShareAlike.**
- Instruction quality is uneven: median 222 characters, 25 empty, 594 pass a 100-character and primary-muscle check. 494 pass the automatic gates (instructions, muscle, known movement pattern), but automatic checks cannot tell a good programme exercise from a poor one, so they are not enough on their own.
- Equipment taxonomy has **no "machine" type**, although ~78 names are machine or cable stations. 50 entries get machine metadata derived from the name by rules and are flagged `equipmentDerived`. Selectorised-machine coverage is weak, so the owner's machine-based programme stays his own custom content (linked by name search, not replaced).
- Images: 383 across 279 exercises, CC BY-SA 3/4, 46 flagged AI-generated (34 exercises have **only** AI images). AI images are excluded and the exclusion is recorded. 189 published exercises have at least one usable credited image.
- Videos: 78 on 46 exercises, mostly ~60 MB HEVC `.MOV`. Unsuitable for the web or offline use. **Out of scope.**
- Not covered by the source: setup steps as a separate field, difficulty/experience level, selectorised machine variety, much pull-up/vertical-pull and overhead-press depth (26 and 15 entries).

## Rights obligations (to confirm with the owner)

- Attribution is stored with every record (`attribution`, `author`, `licence`, source URL) and per image. The library must show it.
- ShareAlike: text we adapt (we only strip HTML and normalise formatting) must be offered under the same or a compatible licence. Practically: the catalogue snapshot (`public/catalogue/v1/exercises.json`) is a CC BY-SA derivative; app code is unaffected, but the owner should decide how to publish the snapshot under that licence and put a credits page in the app.
- Images are **hotlinked from wger.de**, not copied. That avoids redistributing media but depends on their availability; the selected-workout offline cache stores only the images for workouts the user chooses.
- A reviewer with the right expertise should check any instruction text shown as safety-relevant guidance. "Generator-eligible" means passes automated gates, **not** that a qualified person has reviewed it.

## Pipeline

```bash
bun scripts/catalogue/cli.ts fetch [--fresh]   # paginated, polite, retrying, resumable (.catalogue-cache/)
bun scripts/catalogue/cli.ts build --dry-run   # diff vs committed snapshot, writes nothing
bun scripts/catalogue/cli.ts build             # writes public/catalogue/v1/{exercises,report}.json + catalogue/quarantine.json
```

- Stable IDs `wger:<uuid>`; source version = wger `last_update_global`.
- Resume: the cursor (next page URL) is written atomically after every page; a failure resumes at the failed page. A finished fetch re-run makes no requests.
- Retries: 429 and 5xx back off 1, 2, 4, 8 s; other 4xx stop immediately.
- Deterministic: same input gives byte-identical output; repeated rows never duplicate.
- Human curation lives in `catalogue/overrides.json` and is applied over the upstream record at build time, so a refresh cannot overwrite it (see Curation). User-created exercises are a separate local collection.
- Historical sessions copy the exercise name and prescription at the time (snapshot), so a catalogue refresh never rewrites history.
- Genuinely different variations stay separate records. Substitutions are suggested by pattern, muscle and equipment, not merged.

Tested in `src/data/catalogue-pipeline.test.ts` and `src/domain/catalogue-wger.test.ts` (real wger entries as fixtures).

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
