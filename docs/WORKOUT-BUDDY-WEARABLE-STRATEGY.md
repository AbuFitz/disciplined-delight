# VAYVOR workout media, Buddy and wearable strategy

Status: research-backed product direction  
Date: 19 October 2026

## The decision

VAYVOR should stop mixing unrelated workout illustrations. The product needs one versioned motion provider for every exercise shown in generated plans, an optional Buddy that can safely assist through explicit tools when invited, and a wearable strategy that begins with integrations before custom hardware.

Recommended direction:

1. Use the **WorkoutX v2 free plan** as the immediate prototype source. It exposes 1,900+ exercises with consistent looping 3D video, male/female variants, posters and structured metadata. The free plan is limited to 500 total requests and watermarked 360p media, so it is a development source rather than the final production contract.
2. Use **wger** as the rights-defensible open-data fallback and metadata supplement. It has a key-free REST API and approximately 150 contributed exercise videos released under CC BY-SA, but its media coverage and visual style are not consistent enough to be the primary presentation layer.
3. Keep the wider current exercise index for specialist use, but generated plans and the default library should use only exercises with approved motion media. Do not mix visual providers inside one workout.
4. Keep Buddy optional. It should be available as a collapsible helper or summonable assistant that can interpret a request, prepare a structured change, show it for approval and call a narrowly scoped tool. Every normal platform flow must remain fully usable without Buddy.
5. Integrate Apple Health, Android Health Connect and selected wearable platforms before manufacturing hardware. If VAYVOR later builds a bracelet, the first product should be a **workout remote with optional Buddy interactions**—haptics, confirmations and movement cues—rather than an unvalidated medical tracker.

## 1. Workout media decision

### Provider comparison

| Option | Coverage and media | Commercial/offline fit | Main limitation | Decision |
|---|---|---|---|---|
| WorkoutX v2 free | 1,900+ exercises, 2,700+ consistent 3D MP4 clips, posters, male/female coverage and seven languages | Free for evaluation and small projects; commercial paid plans available later | 500 requests total, watermarked 360p previews, expiring CDN URLs and no rehosting/offline media | **Preferred early prototype API** |
| wger | Open exercise metadata and approximately 150 CC BY-SA videos | Key-free API; open licences; self-hostable | Partial and visually inconsistent media coverage; attribution/share-alike obligations vary by entry | **Preferred open-data fallback** |
| RepDB Standard | 643 exercises advertised; transparent HD images and looping motion assets; structured JSON, relationships and embeddings | One-time commercial dataset; assets can be self-hosted | Purchase required; exact animation count differs across official pages and must be confirmed | Revisit for production/offline |
| ExerciseDB.io Pro | 1,394 exercises, an animated GIF for every exercise; 720p/1080p media and exercise relationships | One-time commercial licence; self-host/CDN/bundle permitted | Mostly male presentation; GIF quality/smoothness requires visual audit; updates are separate | Strong fallback if breadth wins |
| MuscleWiki API | 1,900+ exercises and 7,700+ videos, multiple angles and variants | Commercial API plans | Video cannot be downloaded, rehosted, CDN cached or stored offline; video range requests consume calls | Evaluation/breadth source, not Gym Mode core |
| Random GitHub exercise repositories | Often large and apparently free | Unclear | A repository licence for code/data does not establish rights to embedded images or videos; inconsistent art direction | Do not ship their media |

Sources: [WorkoutX v2](https://workoutxapp.com/), [WorkoutX documentation](https://workoutxapp.com/docs.html), [wger documentation](https://wger.readthedocs.io/en/latest/), [wger API](https://wger.readthedocs.io/en/latest/api/api.html), [RepDB](https://repdb.co/), [RepDB commercial-use guide](https://repdb.co/blog/exercise-dataset-commercial-use/), [RepDB free-data licence](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md), [ExerciseDB.io](https://exercisedb.io/), [ExerciseDB.io FAQ](https://exercisedb.io/faq), [ExerciseDB.io terms](https://exercisedb.io/terms), [MuscleWiki API](https://api.musclewiki.com/), [MuscleWiki terms](https://api.musclewiki.com/api-terms), [MuscleWiki FAQ](https://api.musclewiki.com/faq).

### Free-source conclusion

There is no credible, mature, completely free source currently identified that combines all four of these requirements: a large catalogue, one consistent motion style, clear commercial media rights and downloadable/offline assets.

The nearest matches each sacrifice something:

- WorkoutX provides the consistency and breadth needed to redesign the prototype, but its free media is watermarked, quota-limited and streamed.
- wger is genuinely open and defensible, but only a minority of exercises have video and the presentation varies.
- OpenGym3D is a promising MIT-licensed GitHub pipeline for producing consistent GLB exercise animations from CC0 or self-recorded motion, but its own roadmap describes a future version as the point where it becomes a full hundreds-exercise library. It is a potential long-term asset factory, not a ready catalogue today.
- `free-exercise-db-api` claims 593 free HD videos, but its own credits state that the uploader bought the footage from an advert and does not know the original creator. Its MIT licence cannot grant rights the uploader may not possess, so VAYVOR must not use those videos.

Sources: [OpenGym3D repository](https://github.com/AssiamahS/opengym3d), [`free-exercise-db-api` provenance warning](https://github.com/luisaraujoc/free-exercise-db-api#where-did-the-videos-come-from-), [wger's CC BY-SA video contribution](https://wger.readthedocs.io/_/downloads/en/latest/pdf/).

### Why an API alone is not the answer

The hard problem is not obtaining exercise names. It is securing consistent motion, legal commercial use, offline Gym Mode, predictable cost and stable identifiers. A runtime video API gives breadth quickly but makes playback dependent on signal, vendor limits and recurring calls. A licensed self-hosted bundle is a better match for a workout mode that must remain usable in a poor-signal gym.

### Canonical catalogue policy

The app can retain its broad metadata catalogue, but it should expose three explicit tiers:

- **Core motion catalogue:** approved provider asset, full instructions, contraindication note, equipment, movement pattern, muscles, difficulty, substitutions and poster frame. This is the only tier used by automatic plan generation.
- **Specialist catalogue:** valid exercise metadata but no approved motion asset. Searchable only behind an “advanced/text-only” filter.
- **Quarantine:** incomplete licence, duplicate identity, missing attribution, questionable form or failed media checks. Never visible to users.

This prevents a 1,400-item number from damaging the actual experience. A smaller coherent library is better than a larger inconsistent one.

### Provider-independent data contract

Every source must pass through a versioned adapter and become a `NormalizedExercise` rather than leaking provider-specific fields into the product.

Essential exercise fields:

- stable internal ID and provider/version provenance;
- canonical name, aliases and language;
- movement pattern, muscles, equipment, difficulty and mechanics;
- setup, execution steps, breathing, common mistakes and safety cues;
- regression, progression and substitution relationships;
- accessibility and contraindication notes reviewed by a qualified professional;
- approved media variants with angle, body presentation, format, dimensions, duration, poster, checksum, licence and attribution.

No runtime fuzzy merging should decide identity. Mapping should be reviewed and committed as data so changes are repeatable and auditable.

### Media acceptance gate

Before buying or importing a provider, audit 30–50 representative exercises across:

- squat, hinge, push, pull, carry, rotation and locomotion;
- unilateral, cable, machine, free-weight, body-weight, mobility and isometric work;
- phone-size readability and front/side angle usefulness;
- setup accuracy, joint path and end-range position;
- loop seam, playback speed, duration, file size and transparent-edge quality;
- consistent camera, crop, lighting, naming and body proportions;
- reduced-motion poster behaviour and screen-reader alternative text;
- licence scope, attribution, modification/transcoding, caching and termination rights.

A qualified strength professional should review form. Product counsel should approve the final media licence. These are release gates, not optional polish.

### Import and delivery design

1. Pin the provider bundle version and preserve its original manifest.
2. Verify hashes and reject corrupt or unexpected files.
3. Create responsive poster frames and web playback variants only where the licence allows transformation.
4. Store media on the VAYVOR CDN with immutable versioned paths.
5. Package a lightweight offline subset for the user's next scheduled sessions.
6. Record every asset's provider, licence version and transformation chain.
7. Measure start latency, completion rate and replay/form-help usage.

## 2. Buddy: an optional helper for VAYVOR

### Product definition

Buddy is not a decorative face, a free-form chatbot or the product's main navigation. It is an optional helper that turns plain speech into safe, reviewable actions across training, nutrition, routines, recovery, faith/wellbeing modules and connected devices. Users can hide it permanently, summon it when useful, or complete every task through ordinary screens and controls.

The principle is:

> Buddy helps operate the platform when invited; it is neither the platform nor its decision-maker.

The deterministic plan engine remains the source of truth. The language model translates intent, asks for missing constraints and calls typed tools. If the agent is unavailable, the user's plan, timers, logging and Gym Mode still work.

### Architecture

```text
Text / voice / bracelet event
          ↓
Buddy shell — character, animation, tone, accessibility
          ↓
Buddy agent — intent, clarification, proposal
          ↓
Policy gate — scope, risk, permission, confirmation
          ↓
Typed VAYVOR tools — read, draft, write
          ↓
Existing deterministic engines and data stores
          ↓
Result card + audit trail + undo
```

Build short conversational sessions with the Vercel AI SDK's agent/tool primitives inside the existing TypeScript application. Use durable workflows for tasks that pause for approval or run across time. Eve is worth reconsidering if scheduled, multi-channel and long-lived agent sessions become the centre of the product, but adding a second platform boundary is unnecessary for the first trustworthy Buddy release.

Sources: [Vercel AI SDK](https://vercel.com/docs/ai-sdk), [AI Gateway and AI SDK agent guide](https://vercel.com/kb/guide/ai-gateway-and-ai-sdk), [AI SDK 7](https://vercel.com/blog/ai-sdk-7), [runtime and tool context](https://vercel.com/kb/guide/ai-sdk-runtime-and-tool-context), [Eve](https://eve.dev/).

### Tool model

Read-only tools can execute without confirmation:

- `get_today`, `get_schedule`, `get_plan`, `get_progress_trends`;
- `search_exercises`, `get_exercise_form`, `get_substitutions`;
- `get_readiness_summary`, `get_wearable_summary`;
- `explain_recommendation`.

Draft tools create editable proposals:

- `draft_workout_plan`, `adapt_today`, `draft_week`;
- `draft_meal_plan`, `draft_routine`, `draft_goal`;
- `draft_if_then_plan`.

Write tools require a visible preview and affirmative confirmation:

- `accept_plan`, `reschedule_workout`, `log_set`, `log_meal`;
- `change_notification`, `connect_provider`, `enable_module`;
- `share_to_circle`.

Buddy is prohibited from:

- diagnosing illness or changing medication;
- inferring religion, disability, injury or mental state;
- enabling faith features without an explicit choice;
- silently sharing, posting, purchasing or inviting;
- overwriting history or deleting an account without the normal protected flow;
- treating a wearable readiness score as medical truth.

Every mutation returns a human-readable diff, a reason, an audit entry and an undo token.

### Permission ladder

| Level | Behaviour | Examples |
|---|---|---|
| Green | Act and show result | Explain form, find an exercise, summarise today's plan |
| Amber | Show proposed change; require confirmation | Move leg day, shorten a session, change reminders, save a meal plan |
| Red | Refuse or route to protected/manual flow | Diagnosis, medication, emergency decisions, purchases, account deletion |

Tool-specific context should contain only the minimum data needed for that action. A meal tool does not need private journal or faith content; a workout adjustment does not need social messages.

### Memory design

Persistent memory must be structured, editable and attributable—not a hidden transcript dump.

- Save only explicit facts such as goal, equipment, schedule, preferred session length and user-stated constraints.
- Store source, timestamp, confidence and expiry/reconfirmation date.
- Ask “Should I remember that?” before promoting a new conversational fact into durable memory.
- Let the user inspect, edit, export and forget each memory.
- Keep faith preferences explicit and module-scoped. Never infer a deen or worldview.
- Convert wearable events into narrow summaries before they reach the model.

### The interaction that makes it useful

The primary interface is a command bar available throughout the app:

- “Build me three 40-minute workouts around my bad shoulder and this gym's equipment.”
- “I slept badly. Make today lighter but keep the habit.”
- “I have 18 minutes. What is the smallest worthwhile session?”
- “Move leg day to Saturday and show what changes.”
- “Talk me through the next set without me touching the phone.”

Buddy responds with an actionable card—plan preview, schedule diff, form clip, timer or choice—not a paragraph whenever a visual control is better.

During Gym Mode it should:

- announce the next exercise and key cue;
- use haptic patterns for work, rest and set completion;
- accept short commands such as “done”, “repeat”, “lighter”, “swap” and “stop”;
- keep essential timers and logs offline;
- avoid open-ended speech when the user is lifting or breathing heavily.

### Behaviour design

Research on exercise motivation supports autonomy, competence and personally meaningful motivation. Implementation intentions help convert intention into a specific cue and action. Motivational-interviewing techniques can support behaviour change, but effects are modest and evidence quality varies, so VAYVOR should not market Buddy as therapy.

Product implications:

- offer two or three real choices rather than issuing commands;
- connect actions to the user's stated reason, not generic guilt;
- use “you vs you” personal baselines by default;
- celebrate evidence of consistency and recovery, not only streak length;
- write user-authored if-then plans: “If it is 6pm and I am home, I start the 10-minute version”;
- respond to missed sessions with a smaller next action, never shame;
- diagnose friction through capability, opportunity and motivation before changing the plan;
- make public competition opt-in and keep private accountability available.

Sources: [Self-determination theory and exercise review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3441783/), [motivational interviewing meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC11234249/), [implementation intentions meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6235272/), [COM-B / Behaviour Change Wheel paper](https://learning.ecdc.europa.eu/pluginfile.php/35392/mod_folder/content/0/6-%20The%20behaviour%20change%20wheel%20A%20new%20method%20for%20characterising%20and%20designing%20behaviour%20change%20intervntions.pdf).

### Buddy quality gates

Run Buddy in shadow mode before allowing writes. Evaluate at minimum:

- valid plan structure and exercise availability;
- correct permission level and no unapproved mutations;
- no diagnosis, religious inference or unsafe certainty;
- correct handling of missing, stale and contradictory data;
- resistance to instructions hidden in imported content;
- faithful diff, undo and audit behaviour;
- graceful offline/network failure;
- concise responses while in Gym Mode.

## 3. Wearables and a future VAYVOR bracelet

### Integration-first roadmap

**Phase A — health hubs:** build native bridges for Apple HealthKit and Android Health Connect. They provide user-permissioned access to workouts, heart rate, steps, sleep and other supported health records, but they require native iOS/Watch and Android code rather than a browser-only PWA.

**Phase B — broad device access:** evaluate an aggregator such as Terra to cover 500+ data sources quickly. Complete a pricing, data-processing agreement, deletion, consent, latency and export audit before committing. Direct integrations with WHOOP, Oura, Garmin and Polar can follow where data quality or cost justifies them.

**Phase C — real-time workout signals:** use direct native/BLE routes for live heart rate or motion. Cloud APIs are generally designed for synced records, not low-latency coaching.

Sources: [Apple HealthKit](https://developer.apple.com/documentation/healthkit), [Android Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types), [Terra overview](https://docs.tryterra.co/), [Terra streaming integrations](https://docs.tryterra.co/reference/streaming-api/supported-integrations), [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/), [Garmin Health SDK](https://developer.garmin.com/health-sdk/), [Oura authentication](https://cloud.ouraring.com/docs/authentication), [WHOOP API](https://developer.whoop.com/api/), [Polar AccessLink](https://www.polar.com/accesslink-api/).

Do not base the wearable strategy on Web Bluetooth. It has limited browser availability and is not supported in Safari/iOS, which makes it unsuitable for a reliable mobile-first consumer product. Sources: [MDN Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), [WebKit privacy position](https://webkit.org/tracking-prevention/), [browser support](https://caniuse.com/web-bluetooth).

### The right first bracelet

The differentiated first hardware product is not another imperfect tracker. It is a screenless Buddy remote that reduces phone handling:

- distinctive haptic cues for next set, rest finished, slow down and recovery;
- one-button/tap confirmation for set complete, skip, repeat or summon Buddy;
- motion sensing for coarse gesture and rep-event support;
- optional live heart-rate input only after validation;
- quiet-hour and opt-in wellbeing/faith reminders;
- multi-day battery, sweat resistance and a privacy-visible connection state.

The phone/watch remains the main computation and health-data hub. This lowers hardware, battery and validation risk while directly solving the user's “stop looking at my phone in the gym” problem.

### Hardware exploration, not yet a product claim

A development prototype could combine:

- Nordic nRF5340 for BLE, compute and wearable connectivity;
- Bosch BMI270 six-axis IMU for low-power motion and gesture sensing;
- Analog Devices MAXM86161 optical module only for an experimental heart-rate/SpO2 path;
- haptic driver, button/touch input and rechargeable battery.

Sources: [Nordic nRF5340](https://www.nordicsemi.com/Products/nRF5340/Downloads), [Bosch BMI270](https://www.bosch-sensortec.com/en/products/motion-sensors/imus/bmi270), [Analog Devices MAXM86161](https://www.analog.com/en/products/MAXM86161.html).

Optical sensing quality depends on enclosure, skin contact, placement, motion artefact, algorithms and population testing. VAYVOR must keep the product in the wellness category unless claims and measurements go through the required clinical and regulatory process.

## 4. Delivery sequence

### Gate 0 — one week: decide and de-risk

- Obtain licensed samples and written answers from RepDB and ExerciseDB.io.
- Run the 30–50 exercise visual/form audit.
- Get commercial licence review.
- Freeze the canonical provider decision and catalogue version.
- Define Buddy tool schemas, policy levels and threat model.

### Phase 1 — two to four weeks: consistent workouts

- Build the provider adapter, provenance manifest and media validation checks.
- Import the canonical catalogue and map current plans to supported IDs.
- Make automatic plan generation reject non-core exercises.
- Replace mixed images in Library, Plan and Gym Mode.
- Add posters, reduced motion and offline next-session caching.

### Phase 2 — three to five weeks: Buddy pilot

- Ship the command bar and structured proposal cards.
- Implement read tools, then drafts, then approval-gated writes.
- Add memory controls, audit log and undo.
- Run shadow-mode evaluations before enabling mutations.
- Add push-to-talk and concise Gym Mode commands after text behaviour is reliable.

### Phase 3 — four to eight weeks: wearable foundation

- Package the web experience in or alongside native mobile shells.
- Add HealthKit and Health Connect consent and summaries.
- Pilot one aggregator/direct provider with a small group.
- Connect haptic/speech Gym Mode to readiness and live workout events.

### Phase 4 — hardware discovery

- Prototype the Buddy remote on development boards.
- Validate whether haptics and one-button interaction reduce phone pickups.
- Only then fund a custom PCB, industrial design, battery, skin/sweat and RF testing.

## 5. Fact ledger

| Status | Finding | Product meaning |
|---|---|---|
| VERIFIED | RepDB advertises a one-time commercial dataset with transparent motion assets and self-hosting | Best current fit for consistent offline media |
| CONFLICTED | RepDB's official pages show different historical/current counts for animated clips | Confirm the exact deliverable in writing before purchase |
| VERIFIED | ExerciseDB.io advertises 1,394 exercises and matching GIFs under a one-time commercial licence | Viable broader fallback after visual audit |
| VERIFIED | MuscleWiki forbids downloading/rehosting/caching its videos and charges by API usage | Poor fit for offline Gym Mode and predictable playback cost |
| VERIFIED | HealthKit and Health Connect require native platform integration | A pure PWA cannot deliver the complete wearable experience |
| VERIFIED | Safari/iOS does not support Web Bluetooth | Custom bracelet connectivity needs native code |
| VERIFIED | WHOOP, Oura, Garmin, Polar and aggregators expose useful health/workout data under different consent and commercial terms | Use an integration layer with per-provider provenance and consent |
| INFERRED | A Buddy remote is a better first VAYVOR hardware wedge than a full tracker | It solves phone friction with far less sensing/regulatory risk |
| VERIFIED | WorkoutX v2's free plan supplies broad, visually consistent, watermarked prototype media with a 500-request lifetime allowance | Use only through a replaceable adapter during early development |
| INFERRED | RepDB Standard remains a possible production/offline provider | Reassess only after the free prototype proves the interaction and content requirements |
| PROVISIONAL | Vercel AI SDK inside the existing app is the lowest-complexity Buddy foundation | Confirm against the deployed backend/runtime before implementation |
| BLOCKED | Final asset purchase, native-app scope and hardware budget | Requires commercial decisions, not more code |

## 6. Non-negotiables

- No random web images or media with unclear provenance.
- No automatic plan may reference an exercise without approved guidance and media.
- No silent Buddy writes, opaque memory or direct model access to the database.
- No religion, injury or mental-state inference.
- No medical or readiness claim beyond the evidence and permissions available.
- No hardware promise before the interaction is validated with an inexpensive prototype.
- No competition mechanic that turns a missed day into punishment; “you vs you” remains the default.

