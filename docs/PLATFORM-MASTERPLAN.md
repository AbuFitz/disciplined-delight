# VAYVOR platform masterplan

Status: pre-product architecture; the current application is an early prototype, not release-ready  
Date: 19 October 2026

## 1. Product thesis

VAYVOR should become a modular personal operating system for health, fitness, routine and meaning. It can replace several narrow apps because its modules share one private timeline, one planning system and one permission model—not because every possible feature is pushed onto one screen.

The product promise is:

> Choose the areas that matter to you. VAYVOR connects them into one calm daily system and keeps everything else out of the way.

This produces two simultaneous qualities:

- **Broad underneath:** training, movement, nutrition, micronutrients, supplements, hydration, sleep, recovery, body, mind, routines, faith/meaning, social accountability and devices can interoperate.
- **Small on the surface:** a person sees only their enabled modules, current priorities and next useful actions.

VAYVOR should not claim to diagnose, treat or replace clinicians. It may organise wellness data, reveal clearly supported patterns and help people follow plans they chose.

## 2. Platform shape

### Universal core

Every module uses the same small set of platform concepts:

1. **Observation:** something measured or recorded—weight, vitamin D intake, sleep duration, mood, completed reps.
2. **Plan item:** something intended—workout, meal, supplement, bedtime, prayer, appointment.
3. **Event:** something that happened—session completed, meal logged, reminder dismissed, plan changed.
4. **Goal:** a desired direction with a measurable or descriptive outcome.
5. **Routine:** a repeating cue and action, with exceptions and quiet periods.
6. **Content:** an exercise demonstration, recipe, educational explanation or guided activity.
7. **Connection:** a device, health hub, data provider or explicitly approved person.
8. **Consent:** what may be read, written, shared, remembered or used for an insight.

Modules should extend these concepts rather than invent isolated databases and competing navigation patterns.

### Optional module packs

| Pack | What it covers | Example replacements | Initial priority |
|---|---|---|---|
| Train | Strength, cardio, mobility, sport, plans, Gym Mode, exercise library | Workout tracker, programme builder, rest timer | Foundation vertical slice |
| Fuel | Meals, recipes, macros, vitamins, minerals, hydration, caffeine, barcode scan | Calorie and micronutrient trackers | Foundation vertical slice |
| Supplements | Products, label nutrients, schedule, adherence, stock and duplicate-intake warnings | Pill/supplement reminders | After Fuel foundations |
| Recover | Sleep, fatigue, soreness, readiness, rest days and recovery habits | Sleep/readiness dashboard | After device foundation |
| Body | Weight, measurements, body composition, progress photos and optional cycle tracking | Weight/body trackers | Early, privacy-sensitive |
| Mind | Mood, stress, reflection, focus, breathing and journalling | Mood/focus apps | Optional from setup |
| Rhythm | Calendar, routines, reminders, habits and daily/weekly planning | Habit and routine apps | Core infrastructure |
| Meaning | User-selected faith, spiritual or secular practices and calendars | Prayer/reflection apps | Explicit opt-in only |
| Circle | Private accountability, crews, challenges and user-controlled sharing | Accountability/community apps | Later, after safety/privacy |
| Connect | HealthKit, Health Connect, watches, wearables and future VAYVOR hardware | Device aggregation | Native-app phase |
| Care | Medication list, reminders, appointments, symptom journal and record import | Basic care organiser | Much later; separate clinical governance |

“Care” is deliberately separate from general wellness. Medication and symptom features create higher safety, privacy and regulatory obligations and must not quietly emerge from habit-tracking code.

## 3. Information architecture

The primary navigation should remain stable even as modules are added:

- **Today:** the personalised, cross-module daily view.
- **Plan:** calendar, routines, programmes and future intentions.
- **Track:** fast logging and module-specific records.
- **Explore:** exercises, foods, recipes, education and programmes.
- **Progress:** trends, reviews and experiments.
- **You:** profile, modules, connections, privacy, data and appearance.

Buddy is an optional floating/sheet-level helper and can be disabled or hidden. It is not a navigation destination and no feature may require it.

### Today screen contract

Today should never become a grid of every possible metric. It contains at most:

1. **Now:** one most relevant action with a clear reason.
2. **Later:** the next three scheduled items.
3. **Signals:** up to three user-selected summaries such as recovery, nutrients or training load.
4. **Quick log:** configurable shortcuts.
5. **Review:** a quiet end-of-day completion and carry-forward state.

Users can expand modules for depth. The platform chooses prominence from explicit priorities, time sensitivity and user configuration—not engagement-maximising guesses.

## 4. Progressive setup

### Setup is a sequence, not a questionnaire wall

The first-use path has three levels:

**Level 1 — start in under two minutes**

- choose one to three outcomes;
- choose the first module pack;
- set units, timezone and accessibility basics;
- continue as guest or sign in;
- land on a useful, editable starting day.

**Level 2 — configure the selected module when first opened**

Training asks about experience, equipment, time, environment and limitations. Fuel asks what the person wants to track, their food style and whether they want nutrient targets. Meaning asks the person's chosen tradition or secular mode only if they enable it.

**Level 3 — unlock precision only when useful**

Device connections, detailed physiology, micronutrient reference profile, advanced reminders, social sharing and Buddy memory appear in context later. Each screen explains why the data is useful and what changes if it is skipped.

Nothing assumes the user is Muslim, religious, male, able-bodied, dieting, trying to lose weight or comfortable sharing health data.

### Module picker

Users manage modules from a visual “Build your VAYVOR” screen:

- each pack previews what appears and which data it uses;
- enabling a pack never rearranges everything without a preview;
- disabling a pack hides it but retains or deletes its data according to the user's explicit choice;
- packs have beginner and detailed modes;
- modules can suggest a connection to another module, but cannot turn it on.

## 5. Food, vitamins and supplements

### Food data stack

Use a provider adapter rather than binding the interface to one database:

1. **USDA FoodData Central** for high-quality generic and US branded nutrient data. Its REST API and downloadable datasets expose detailed nutrient records.
2. **Open Food Facts v3** for international barcode coverage and product contributions. Its data is open under ODbL, but user-contributed records may be incomplete or inaccurate and must be quality-labelled.
3. **NIH Dietary Supplement Label Database (DSLD)** for supplement brands, ingredients and label facts; its API specification is published under CC0.
4. **Manual/custom items** for meals, recipes, local products and clinician-provided plans.

Sources: [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide/), [USDA downloadable datasets](https://fdc.nal.usda.gov/download-datasets/), [Open Food Facts API](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/index.md), [NIH DSLD API guide](https://dsld.od.nih.gov/api-guide), [DSLD API specification](https://dsldapi.od.nih.gov/).

### Nutrient tracking

The Fuel pack should support:

- energy, protein, carbohydrate, fibre, total fat and relevant subtypes;
- vitamins A, B1, B2, B3, B5, B6, B7, B12, C, D, E, K and folate;
- calcium, chloride, chromium, copper, iodine, iron, magnesium, manganese, molybdenum, phosphorus, potassium, selenium, sodium and zinc;
- water, caffeine and user-created nutrients;
- food, recipe, meal and day totals;
- data completeness and source confidence for every total;
- food-derived and supplement-derived totals shown together and separately.

Apple HealthKit and Android Health Connect already define broad nutrition and micronutrient record types, so VAYVOR's internal nutrient identifiers should map cleanly to both. Sources: [Apple HealthKit nutrition identifiers](https://developer.apple.com/documentation/healthkit/nutrition-type-identifiers), [Android Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types).

### Reference targets without fake certainty

Nutrient targets depend on factors such as age band, physiology, pregnancy/lactation status and jurisdiction. When a user enables target comparisons, VAYVOR should request only the reference-profile fields required for the selected guideline and keep them separate from identity labels.

The interface must distinguish:

- guideline reference range;
- user/clinician-set target;
- consumed amount;
- estimated amount caused by incomplete food data;
- upper-limit warning based on a named source;
- suspected deficiency, which VAYVOR must not diagnose.

Missing micronutrient data is “unknown”, not zero. A weekly pattern may be shown only with adequate logging coverage.

### Supplement workflow

Users can scan/search a label, review the matched product, confirm serving size and schedule it. The module then provides:

- taken, skipped, snoozed and paused states;
- stock count and reorder reminder;
- totals contributed to daily nutrients;
- duplicate-ingredient visibility across products;
- a change history when the product formula or user dose changes;
- exportable list for a clinician or pharmacist.

The app may flag that multiple products contain the same nutrient. It must not advise starting, stopping or changing a supplement or medication based solely on the model. Interaction and upper-limit notices require an authoritative, versioned source and careful jurisdiction-specific review.

## 6. Workout source for the prototype

Use **WorkoutX v2 free** for the visual redesign prototype because it currently offers one consistent 3D style across 1,900+ exercises with looping videos, posters and male/female variants. Its free tier is limited to 500 total requests, watermarked 360p previews, expiring links and no downloading/rehosting, so cache metadata—not media—and isolate it behind the provider adapter.

Use **wger** for open exercise metadata and as a rights-defensible fallback. Its public REST API is key-free; the project documents CC-licensed exercise data and approximately 150 contributed CC BY-SA videos. It does not satisfy the visual consistency requirement by itself.

Do not use the GitHub repository advertising 593 free HD videos: its credits state that the uploader bought the files from an advertisement and does not know their original creator. An MIT file in that repository cannot grant ownership of third-party footage.

Sources: [WorkoutX v2](https://workoutxapp.com/), [WorkoutX API documentation](https://workoutxapp.com/docs.html), [wger documentation](https://wger.readthedocs.io/en/latest/), [wger API guide](https://wger.readthedocs.io/en/latest/api/api.html), [unsafe repository's own provenance warning](https://github.com/luisaraujoc/free-exercise-db-api#where-did-the-videos-come-from-).

Provider selection and the production/offline route are detailed in [WORKOUT-BUDDY-WEARABLE-STRATEGY.md](./WORKOUT-BUDDY-WEARABLE-STRATEGY.md).

## 7. Optional Buddy

Buddy is a preference-controlled convenience layer. It can:

- search and explain;
- turn a sentence into a draft plan;
- propose changes across enabled modules;
- guide a workout hands-free;
- simplify logging by voice or text;
- surface a user-requested summary.

Buddy cannot:

- gate any normal workflow;
- enable modules, faith settings or sharing by assumption;
- write changes without the correct approval level;
- infer diagnoses, religion or private traits;
- read every module merely because it exists;
- create pressure through unsolicited messages.

The user chooses whether Buddy appears, its tone, allowed modules, intervention frequency, memory and quiet hours. “Off” means no avatar, prompts, proactive messages or model calls.

## 8. Data architecture

### Record envelope

Every user record should carry:

- stable ID, type and schema version;
- owner/account scope;
- occurred-at, recorded-at and timezone;
- value, unit and canonical code;
- source type, source ID and provenance;
- confidence/completeness where applicable;
- sensitivity class and sharing state;
- created, corrected, superseded and deleted state;
- sync revision and device ID.

Raw records remain distinct from derived summaries. Correcting a meal or wearable sample supersedes the record; it does not silently rewrite historical aggregates without traceability.

### Canonical units and codes

- Store canonical units and convert for display.
- Map health observations toward HL7 FHIR `Observation` semantics and standard codes where practical, without pretending the app is an electronic health record.
- Keep provider IDs alongside internal IDs.
- Never allow an LLM to invent units, provider IDs or clinical codes.

FHIR treats observations as measured or asserted events with metadata and distinguishes them from medication and other specialised resources; this is a useful interoperability boundary for the internal model. Source: [HL7 FHIR Observation](https://hl7.org/fhir/R4/observation.html).

### Integration layer

Each external source implements the same lifecycle:

```text
connect → consent → fetch → normalise → validate → deduplicate
        → store provenance → derive → display → export/delete/revoke
```

Adapters must expose capabilities and restrictions: read/write, cache duration, rate limit, offline rights, licence, regions and deletion behaviour. The UI must never imply that two sources provide equivalent accuracy.

## 9. Insight system

VAYVOR should progress through four levels:

1. **Record:** “You logged 7 hours of sleep.”
2. **Summarise:** “Your seven-day average is 6 h 42 m.”
3. **Relate:** “On adequately logged days, later caffeine coincided with later sleep.”
4. **Experiment:** “Would you like to try a seven-day earlier-caffeine experiment?”

The system must show coverage, sample size, source and uncertainty. Correlation is not described as causation. High-stakes interpretations route to appropriate professional guidance.

Personalisation ranks information using explicit goals, enabled modules, schedule and chosen notification preferences. It should not maximise screen time or manufacture urgency.

## 10. Privacy and permissions

Use permissions per module and per action rather than a single “allow everything” switch:

- local-only, synced-private or explicitly shared;
- read and write permissions separated;
- source-specific revocation;
- one-use, session and persistent Buddy access;
- export and erase by module;
- private notes excluded from insights by default;
- health, faith and journal data never used for social recommendations.

Sensitive modules require a clear data-flow screen showing device, VAYVOR cloud, external provider and any model processor. Data minimisation and deletion must be designed before live integrations are enabled.

## 11. Design system requirements

The interface should feel like one product even as modules differ:

- semantic colour roles with user-selectable accent palettes—not a green-locked identity;
- restrained glass used for layering, never reduced legibility;
- shared card, sheet, picker, chart, empty, loading and error patterns;
- minimum 44 px targets and thumb-reachable phone actions;
- calm density by default with optional detailed mode;
- reduced motion, high contrast, text scaling and screen-reader parity;
- no stacked floating controls, overlapping sheets or hidden primary actions;
- motion that communicates state, causality and completion rather than constant decoration.

Every module must pass 320/390/768/1440 px, 200% text, keyboard, screen-reader naming, reduced-motion and light/dark/custom-accent checks before it is considered complete.

## 12. Delivery programme

The project is not close to launch. Work should proceed through evidence gates rather than accumulating unverified screens.

### Stage 0 — align and stabilise

- freeze this masterplan as the product decision record;
- inventory current features as keep, redesign, merge, quarantine or remove;
- implement a module registry and stable navigation contract;
- define canonical records, units, provenance and sensitivity classes;
- build the provider-adapter boundary;
- remove unsupported claims and fake/placeholder data;
- establish visual regression, accessibility and data-migration baselines.

**Exit gate:** modules can be enabled/disabled safely; existing user data migrates; all primary paths work without Buddy.

### Stage 1 — complete Train as the reference module

- integrate WorkoutX free through a server-side proxy for prototype evaluation;
- retain wger/open metadata with visible provenance;
- rebuild Library and Workout Detail around consistent motion;
- complete plan builder, programme editing and Gym Mode;
- validate exercises, substitutions, offline behaviour and form content;
- prove the mobile interaction and design system.

**Exit gate:** a user can configure, schedule, perform, adapt and review a multi-week programme without inconsistent media or phone-heavy friction.

### Stage 2 — complete Fuel and micronutrients

- integrate USDA, Open Food Facts and NIH DSLD adapters;
- add barcode, search, manual foods, recipes and portion handling;
- add vitamin/mineral totals with completeness indicators;
- add supplement scheduling, adherence and stock;
- sync supported nutrient types with native health hubs later;
- validate unit conversion, duplicate nutrients and historical corrections.

**Exit gate:** nutrient totals are source-traceable, correction-safe and honest about missing data.

### Stage 3 — Rhythm, Recover and Body

- unify plans, reminders, sleep, recovery, weight and measurements;
- add experiments and transparent cross-module insights;
- implement native HealthKit and Health Connect bridges;
- test permission revocation and duplicate-source handling.

**Exit gate:** imported and manual records reconcile without double-counting, and insights state their evidence.

### Stage 4 — optional Buddy

- ship read-only search/explanation first;
- add structured drafts;
- add previewed, approval-gated writes with undo and audit;
- add push-to-talk Gym Mode commands;
- run shadow-mode safety and reliability evaluations.

**Exit gate:** Buddy can be disabled completely, never performs an unapproved mutation and adds measurable convenience.

### Stage 5 — Meaning and Circle

- expand opt-in faith/secular practice architecture;
- build sharing from explicit public records rather than private-module access;
- add accountability systems with block/report/moderation;
- validate psychological safety and notification pressure.

### Stage 6 — hardware exploration

- validate wearable integrations first;
- prototype haptic workout controls with development hardware;
- measure whether the prototype reduces phone pickups;
- only then consider custom electronics and industrial design.

### Stage 7 — release readiness

- real backend, authentication and sync verification;
- threat modelling, privacy review and penetration testing;
- clinical/content review where required;
- licence and attribution audit;
- data export/deletion/recovery drills;
- observability, support, incident and rollback processes;
- closed alpha, then limited beta—not an immediate public launch.

## 13. Prioritisation rules

Every proposed feature is scored against:

1. Does it remove a separate app or recurring friction?
2. Does it reuse the universal core instead of creating a silo?
3. Can it be completely hidden when irrelevant?
4. Does it improve an end-to-end user outcome rather than add a metric?
5. Is the data trustworthy and legally usable?
6. Can users correct, export and delete it?
7. Can the feature function without Buddy or continuous internet?
8. Does its safety burden match the team's present capability?

If it fails questions 2, 3, 5 or 8, it does not enter the active build.

## 14. Fact ledger

| Status | Finding | Decision |
|---|---|---|
| VERIFIED | WorkoutX free provides a consistent broad video catalogue but only 500 lifetime requests, watermarked 360p previews and streamed media | Use for prototype evaluation behind an adapter, not as a permanent free dependency |
| VERIFIED | wger provides a key-free REST API and openly licensed exercise data; video coverage is partial | Use as open metadata/fallback, not the primary visual experience |
| VERIFIED | USDA FoodData Central exposes detailed food/nutrient data through REST and downloadable datasets | Primary generic nutrient source |
| VERIFIED | Open Food Facts is open and international but explicitly disclaims completeness and accuracy | Use for barcodes with visible quality/provenance |
| VERIFIED | NIH DSLD exposes supplement labels and ingredients through a CC0 API | Primary supplement label source for supported markets |
| VERIFIED | HealthKit and Health Connect represent many vitamins, minerals, hydration and caffeine types | Align the canonical nutrient model for later native sync |
| VERIFIED | The current product has many implemented prototypes but several integrations, backend paths and real-device behaviours remain unverified | Treat the project as pre-product, not launch preparation |
| INFERRED | A module registry plus shared event/observation model is the cleanest way to replace multiple apps without overwhelming users | Make it the platform foundation before adding more screens |
| INFERRED | Train and Fuel are the best reference vertical slices | They exercise media, plans, logging, units, insights and offline behaviour |
| PROVISIONAL | WorkoutX is the best visual prototype source | Confirm by inspecting a representative sample and accepting the free terms |
| BLOCKED | Production workout-media source and offline rights | Defer until after prototype validation and commercial decision |
| BLOCKED | Care/medication scope | Requires jurisdiction, clinical governance and safety ownership |

## 15. Immediate next build brief

When implementation resumes, do not add another broad feature page. The next build should:

1. add the module registry and module-aware navigation;
2. move Buddy behind an optional preference and remove any main-product positioning;
3. implement the exercise-provider adapter;
4. connect WorkoutX free in a development-only integration with explicit quota/error states;
5. rebuild one complete Train journey using the new media;
6. create the shared observation/nutrient schema;
7. prototype USDA/Open Food Facts/DSLD search without yet redesigning the whole Food area;
8. test the entire flow on mobile before expanding scope.

That sequence makes the platform extensible while producing one genuinely excellent end-to-end experience at a time.
