# VAYVOR (formerly New Life): handoff

Branch: `claude/relaxed-ptolemy-4v3qva` (not merged, no pull request opened).
Commits since the audit baseline `720093e`: `614d10b` audit and domain core, `1de9cdb` shell and daily flows,
`e30d13b` editing layer, `db4d741` backup, PWA, sync and reminders, plus the final verification commit.

Read `docs/AUDIT.md` first for what the original app actually did and what was wrong with it.

## Which repository

The fitness app is `AbuFitz/disciplined-delight` (package name `new-life`; TanStack Start, React 19, Vite, Tailwind 4,
Supabase, bun). `AbuFitz/NEWLIFE` is a different Next.js coaching app and was **not touched**; if that was the one you
meant, say so. The OneSimpleSite skill suite and `ONESIMPLESITE_CONTEXT.md` were not available in this session, so
the repository's own conventions were followed.

## What changed, and how the daily flows work

- **Stack kept.** No framework migration. Routes render on the client (`defaultSsr: false`) because data lives in IndexedDB.
- **Design.** Charcoal/green-black canvas, warm paper text, restrained green, Funnel Display / Hanken Grotesk / DM Mono
  (self-hosted via `@fontsource`, so they work offline). A designed light theme uses the same tokens. Checked against the
  rendered reference site on 16 Oct 2026. Sidebar on desktop, five tabs on phones (Today, Train, Food, Salah, Progress),
  Week and Settings from the header or sidebar. Old URLs (`/workouts`, `/nutrition`, `/schedule`) redirect.
- **Today.** Next action (continue or start a session, otherwise next prayer, otherwise log a meal), next prayer with
  countdown and the five times, food eaten against target with planned totals shown separately, training and weekly
  count, weight trend and budget when there is data, a timeline, and reminders. **Edit Today** shows/hides, reorders
  (move up/down buttons, keyboard accessible) and resizes widgets, and restores the default.
- **Training.** Create, rename, duplicate, edit, reorder and archive workouts and exercises (sets, rep range, rest,
  technique notes, alternative, links). The original A/B/C/D programme and notes are preserved as the starting point
  (Mon A, Tue B, Thu C, Sat D). The active session has per-set weight, reps and completion; previous comparable session
  beside each exercise; set-aware double-progression _suggestions_ you accept yourself; warm-up, skip and add set; timestamp-based rest timer; pause/resume; replacing an
  exercise affects only that session; finish as **Completed** or **Partial**. Sessions snapshot the template, so editing
  a template later never rewrites history. Cardio is guidance only and does not count as a lifting session.
- **Food.** Day A and Day B survive as editable day templates; meals have structured ingredients where the original item
  text had clear quantities (no unit conversions, chicken and rice stay _cooked_ weights) and keep the original
  estimate, labelled, until every ingredient has real nutrition data. Planned, prepared and eaten are separate. Log a
  whole meal in one tap, adjust the portion, correct or undo. Week planner, copy last week, batch cooking (ingredients
  counted once). Shopping list: pantry deductions, whole-pack rounding, shops, bought ticks, recorded purchases.
  **Estimated checkout**, **price coverage** and **actual spend** are separate numbers, and an incomplete estimate says so.
- **Salah.** Verified AlAdhan calendar API (method, Asr convention, high-latitude handling, minute adjustments), or
  manual and pasted mosque timetables. Start times and jamaat times are stored separately. Next prayer rolls across
  midnight and UK clock changes; calculated times only apply to the settings that produced them; manual mode never
  fetches; missing days show a setup state, never recycled times. One-tap Prayed with undo and backdating; unlogged is
  neutral. Private 14-day history.
- **Progress.** Weigh-ins with a trend only when there are ≥6 over ≥14 days; training frequency; per-exercise
  performance from real sets; food-logging coverage (a day with no log is unknown, not zero); maintenance estimate that
  shows "Not enough data" until ≥21 days, ≥70% fully-logged days and ≥6 weigh-ins, with a range, and never changes your
  target. Original-app history is shown as recorded and not turned into sets.
- **Week planner.** Recurring blocks, single-occurrence skip/move versus whole-series edits, prayer-linked blocks,
  overlap warnings, change a workout's weekday for future weeks, or do a missed one today without changing history.
- **Data.** IndexedDB with atomic outbox, stable IDs, revisions and tombstones. Versioned export, import with a
  merge/replace preview, request persistent storage, recoverable scoped erase, and a download of the raw original-app
  data. Sign-in and sync are optional and explicit (see below).
- **PWA.** Manifest, generated icons, service worker (offline shell, hashed assets only, never caches API,
  cross-origin or non-GET), update banner that never reloads during a workout, shortcuts.

## Data migration and recovery

- **Original data lives in browser localStorage** at the deployed origin (sign-in was disabled), under
  `sunrise-strength-tracker-v1`, `sunrise-strength-schedule-v2` and `new-life-shopping-checklist-v1`.
- **Keep the origin.** Redeploy to the same Vercel project (`sunrisestrength.vercel.app`) and the new app reads those
  keys in place. If you ever move host, a new origin cannot read the old one. Before switching, open the old site and
  run this in the browser console, then keep the file:
  ```js
  copy(
    JSON.stringify(
      Object.fromEntries(
        [
          "sunrise-strength-tracker-v1",
          "sunrise-strength-schedule-v2",
          "new-life-shopping-checklist-v1",
        ].map((k) => [k, localStorage.getItem(k)]),
      ),
    ),
  );
  ```
- On first run the migration copies the raw blobs into `legacyRaw`, converts days to `legacyDays` (one weight and a
  done flag, never expanded into sets), schedule steps to routine blocks (the old fixed 03:14 Fajr is **archived**, not
  used), seeds the programme, Day A/B, ingredients and reminder checklist, and marks the old 2,760 kcal target
  **provisional**. It is idempotent, never overwrites edits, and never deletes the old localStorage keys.
- Recovery: Settings → Your data → Download original data, or export a backup. `runMigration` only runs once
  (`meta: migration:legacy`).
- **Database.** Migrations `0001`/`0002` are untouched and unused by the new client (archive, don't drop).
  `0003_sync.sql` and `0004_push_reminders.sql` are new and **have not been applied to any Supabase project**. Apply them
  with the Supabase SQL editor or CLI when you want sync. Review them first.

## Configuration still required (names only)

| Purpose         | Name                                                                             | Where                                           |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Cloud sync      | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                    | Vercel env (client)                             |
| Push public key | `VITE_VAPID_PUBLIC_KEY`                                                          | Vercel env (client)                             |
| Push server     | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`          | Supabase Edge Function secrets                  |
| Scheduling      | run `supabase/functions/send-reminders` every minute with header `x-cron-secret` | Supabase scheduled function or pg_cron + pg_net |

Generate VAPID keys with `npx web-push generate-vapid-keys`. The service-role key is only used inside the edge function
(provided by Supabase) and never reaches the client. `NITRO_PRESET=node-server bun run build` makes a local production
build; the default stays the Vercel preset.

## Verification: what was run and what it showed

Automated (all passing at hand-off): **80 vitest tests in 14 files**, `tsc --noEmit` clean, `eslint src` 0 errors
(19 warnings: fast-refresh export style and a few hook-dependency notes), production build succeeds. Run `bun run test`,
`bun run typecheck`, `bun run lint`.

Real Postgres 16 (simulated `auth` schema; see `supabase/tests/README.md`): 19 sync checks and 9 reminder checks
pass: idempotent retries, stale-base conflicts, tombstones, direct writes blocked, second user cannot read the first's
rows or mutation log, anon denied, reminders claimed exactly once and stale ones skipped.

Rendered Chromium, at 320, 390, 768 and 1440 px, every route: no horizontal overflow, no console errors, labelled
controls on every route and sheet checked, 44 px targets except the seven day tabs on the Week page at 320 px (38 px
wide). Also checked at 200% text size, light theme, reduced motion, sheet focus trap and Escape, and keyboard-only Edit
Today. Production build with the service worker: shell opens offline on four routes, a meal logged offline survived
reconnect with exactly one queued mutation. Mocked clock: the date flips at midnight BST, and at 23:30 the next prayer
is tomorrow's Fajr. Screenshots: `docs/screenshots/`.

| Acceptance scenario                                     | Status                                                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Old profile survives, no invented set details           | Automated test and browser                                                                                                                                |
| Change a workout's weekday; history intact              | Browser (split moves; sessions snapshot templates)                                                                                                        |
| Record sets, reload, resume, timer recalculates         | Browser                                                                                                                                                   |
| Partial workout stays partial                           | Browser                                                                                                                                                   |
| Edit an exercise after past sessions                    | Browser, snapshot design                                                                                                                                  |
| Assign Day A/B; ingredient requirements match           | Automated and browser                                                                                                                                     |
| Batch and leftovers count ingredients once              | Automated                                                                                                                                                 |
| Log half a meal then correct it; plan unchanged         | Browser                                                                                                                                                   |
| Price change updates estimates; old purchases unchanged | Automated and browser                                                                                                                                     |
| Missing price shows incomplete coverage                 | Automated and browser                                                                                                                                     |
| Pantry plus whole packs                                 | Automated and browser                                                                                                                                     |
| Partial food logging is not a zero day                  | Automated and browser                                                                                                                                     |
| Midnight and DST                                        | Automated (dates, prayer, reminders) and browser clock mock                                                                                               |
| No prayer data shows an honest state                    | Automated and browser                                                                                                                                     |
| Change method/mosque/timezone invalidates cache         | Automated (settings version); manual-mode source mixing bug found and fixed                                                                               |
| Prayer log twice, undo, correct                         | Logic only (one record per date and prayer, so a second log is a no-op); in the browser only the enabled/disabled state of the Prayed buttons was checked |
| Offline logging then reconnect, no duplicates           | Browser (once) and sync engine tests                                                                                                                      |
| Same record edited on two devices                       | Sync engine tests (conflict kept and listed)                                                                                                              |
| Guest to signed-in                                      | Engine and SQL tests; **not run against a real Supabase project**                                                                                         |
| Second account cannot read first                        | SQL tests on real Postgres; **not run through Supabase Auth**                                                                                             |
| Export/import round trip                                | Automated; file picker path not driven in a browser                                                                                                       |
| App update during a session                             | Banner is disabled while a session is active; **update flow not exercised in a browser**                                                                  |
| Edit Today on phone and desktop                         | Browser (persists across reload; keyboard)                                                                                                                |
| Reminder permission refused                             | Code path only                                                                                                                                            |

## Not verified, not built, or limited

**Needs a real device or real credentials (not verified):** installing to an iPhone Home Screen; Web Push delivery
(needs VAPID keys, an authenticated account, the migration applied and the scheduled function); the push permission
flow; Supabase sign-in, sync and storage against your actual project; service-worker _update_ behaviour.

**Not built:** progress photos and recipe photos (the backup format says so); "use my location" for prayer times
(town/country entry only); cardio logging (guidance only; original cardio flags are preserved in history);
drag-to-reorder (move buttons only); "money saved" against a dated baseline and a substitution price comparison (no
savings are claimed anywhere); return-to-training simplifier; automated supermarket prices; native widgets,
HealthKit and Live Activities (not possible from a PWA).

**Known limitations:** Legacy dates in the original app came from a UTC string slice, so a day logged between midnight
and 1 am BST may sit one day early; they are kept as recorded and labelled. The outbox is created for every write even
before you link a device (so first sync can upload history); it is only drained after you turn on sync. Calculated
prayer times are a method's output and may differ from your mosque. Notification delivery timing is best effort.

## First-use path

1. Open **Settings**: confirm your goal, then **confirm or change the nutrition targets** (the original 2,760 kcal is
   shown as _not confirmed_ until you do), set a weekly food budget.
2. Open **Salah**: pick a source (calculated for Hemel Hempstead, or paste your mosque's timetable) and check it
   against your mosque.
3. **Food → Week plan**: drop Day A/Day B onto days, then **Meals** to add ingredients and prices; **Shopping** builds the list.
4. **Train → Start now** (or the Next-up panel on a training day) and log your first session.
5. Optional: add a weigh-in, install to the Home Screen, export a backup, and sign in to link a device for sync.

---

# Continuation: accounts and the VAYVOR rebrand

Status after the second pass. Phases follow the product masterplan (accounts, catalogue and generator, routines,
circle, chat and games, release). **Only Phase 1 and the rebrand are done.** Phases 2 to 6 have not been started, so
nothing in them should be treated as built.

## Security fix on the way

Vercel blocked the deploy of `71a2422` on a known XSS advisory in `@tanstack/react-start@1.168.26`
(CVE-2026-102989). Commit `12fef94` moves to the patched `1.168.61`, aligns `@tanstack/react-router` (1.170.42)
and `router-plugin` (1.168.43) so one router-core resolves, and adapts one type. The override flag was **not** used.
Verified by typecheck, tests, lint, the Vercel-preset build and a node-server build serving every route.
Redeploy from the new head to confirm on Vercel itself; that deploy has not been observed.

## Phase 1: accounts and ownership (done, with the limits below)

Reproduced then fixed: the local store had one database and no account in any key, so a switch of account would have
shown, queued and synced the previous account's private records. Now every scope is its own IndexedDB
(`new-life` for guest, `new-life:u:<id>` per account), async work is generation-guarded, `ScopeGate` renders nothing
while auth and storage disagree, and all sync entry points verify scope, session and database owner.

Built: shared auth store; email/password with confirmation, resend with cooldown, expired-link handling, forgot and
reset password; Google shown only if listed in `VITE_AUTH_PROVIDERS`; guest route; onboarding with a unique
case-insensitive handle; profile editing; sign-out with a remove-from-device choice; remembered accounts list;
one-time guest import (account identity wins). New people start blank, so the owner's programme, meals and the
provisional 2,760 kcal target are seeded only where the original app's data exists.

Evidence

- 101 vitest tests, including isolation across A to B to A, a mid-sync account switch, guest import and profile merge.
- Postgres 16 (simulated `auth` schema): profiles 18/18 checks, and a 30-round concurrent handle race with exactly
  one winner each round. `supabase/tests/profiles.test.sql`.
- Browser, against a **local simulation** of Supabase Auth and RPC (not real Supabase): account A logs a meal and signs out;
  guest and account B never see it; B's handle clash (different case) is refused; A signs back in and sees only A's
  data; a second tab drops A's data when the first signs out; sign-out with removal deletes that account's database.
  14 of 15 assertions passed; the 15th was a case-sensitive regex in my own test (the heading renders in capitals).

**Not verified**: anything against a real Supabase project; real confirmation and recovery emails; Google sign-in;
session expiry in the wild; migrations `0005` and `0006`.

## The Supabase project blocker

The only project the connector can see is "TruetoDetail System" (inactive, a different product). It is **not** the
VAYVOR project and **nothing was applied to it**. Activation needs a decision from you:

1. Create or choose the VAYVOR Supabase project.
2. Apply `supabase/migrations/0003` to `0006` (review first; `0001`/`0002` are legacy and unused by the new client).
3. Set Site URL and Redirect URLs (`<origin>/auth/callback`, `<origin>/auth/reset`) to the real working origin.
4. Configure custom SMTP and paste `supabase/templates/*` (see its README).
5. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` on Vercel; add `VITE_AUTH_PROVIDERS=google` only after Google is configured.

## Rebrand to VAYVOR

Applied deliberately, not by global replace. Product name, wordmark, page titles and metadata, PWA `name` and
`short_name`, notification text, download filenames, error copy, email templates, unapplied migration comments and docs now say
VAYVOR ("VAY-vor"). The wordmark is solid geometric capitals as vector paths: one colour, no font or gradient, legible
at 52 px wide, with a monogram for icons. See `docs/BRAND.md` (usage, minimum sizes, embroidery guidance to confirm
with the embroiderer, and the list of identifiers that deliberately did **not** change).

Unchanged on purpose: IndexedDB names, legacy storage keys, `nl-theme`, manifest `id`/`start_url`/`scope`, the
backup `app` field (both spellings are read), package and repo names, applied migration `0001`. A guard test
(`src/data/brand.test.ts`) fails if the old visible name returns or an identifier changes.

Verified in a browser on a production build: with the previous service worker installed, the update banner appears,
applying it removes the old caches, and the `new-life` database, owner programme and title ("VAYVOR") are intact.

**Not verified**: an installed iPhone app. The Home Screen name and icon on iOS only change when the app is removed
and added again. The domain **vayvor.com** is not used anywhere in code or config; no trademark search has been done.

Screenshots: `docs/screenshots/vayvor/`. Earlier folders show the old name and are kept as history.

## Phase 2: catalogue, programmes and recoverable plan editing

Done:
- Licence-checked catalogue snapshot, pipeline and quarantine report. `catalogue/overrides.json` contains 571 persistent human corrections; only the curated generator tier is used automatically, while the wider library remains browsable.
- Deterministic generator, honest time/equipment gaps, corrected weekly-volume accounting, Sunday/Monday recovery, shortening, substitutes and missed-day handling. The rules remain **draft and unreviewed by a qualified coach** (`docs/TRAINING-RULES.md`).
- The builder recalculates blockers after every swap/removal, cannot accept empty or invalid sessions, keeps useful fixes on partial previews and never assigns a starting weight.
- Accept, replace and regenerate are account-scoped atomic operations covering templates, archives, plan records, equipment and sync mutations. A failed write preserves the previous schedule. Logged sessions are not rewritten.
- Archived workouts have a restore view. Regeneration previews added/removed/changed exercises and requires an explicit choice for existing workouts.
- Tracking types (weight/reps, bodyweight, assisted, time and distance) work in the session logger; only loaded lifts count toward volume/progression.
- Service worker `nl-v3` keeps network-first offline catalogue and same-origin exercise-media copies.

## Phase 3: connected daily routine system

Done:
- Primary navigation is Today / Body / Mind / Soul / Circle; Train, Food, Progress, Library and Week remain available as deep links and desktop shortcuts.
- Body brings together training, food, shopping/budget, progress, the exercise library and the plan builder.
- The routine engine supports recurring and one-off activities, skip/rest/move, pause/resume, correcting completion, cross-midnight blocks, prayer-relative activities and timezone-local dates. Linked workouts, meals, prayers and Mind entries complete from their real records rather than a duplicate tick.
- Today has one next action and a combined timeline. Routine editing is available from Today/Week.
- Mind has private check-ins, reflections, focus entries and history. Soul keeps Salah optional and stores private reflections.
- Privacy is explicit in the UI and records: Mind entries are forced to `visibility: "private"`; journal, mood and prayer records are not exposed to Circle.

## Phase 4: Circle foundation

Built:
- Exact-handle/display-name discovery without email or contact-book lookup; directed requests become mutual connections only after acceptance.
- A connection-only feed with explicit, manually written shares, optional highlights, kudos and removal. Workouts, meals, prayers, mood and journal records are never posted automatically or read by Circle.
- Blocking removes an existing request/connection in both directions, hides both people from discovery and feeds, and has a reviewable unblock list.
- `0006_circle.sql` owns the social tables and security-definer RPCs. All tables have RLS, direct writes are revoked, anonymous calls are denied and guessed post IDs cannot be used for kudos outside an accepted connection.
- The unconfigured/signed-out interface is an honest setup state, not fake people or activity. The live feed, people search, request actions, share composer and privacy controls appear only for a signed-in account with a completed profile.

Current verification (16 October 2026): 202 Vitest tests pass, TypeScript passes, ESLint passes with 18 fast-refresh-only warnings and no errors, and the Vercel-preset production build succeeds. Browser checks cover every main and legacy route at 320 px and 768 px, the five primary routes at 390 px, and Today at 1440 px; no horizontal overflow or console errors were observed. The complete builder produced a credible 3-day, 30-minute home-dumbbell plan and remained overflow-free at 320, 390 and 768 px; emptying a session disabled acceptance and exposed specific repair actions. Light theme at 320 px and keyboard traversal with a visible 2 px focus outline were also checked. A check-in saved successfully and appeared in private History. Circle's configuration gate was rendered at 390 and 1440 px without overflow or console errors. Mobile and desktop screenshots showed coherent navigation and usable empty states. The local production-preview path now builds Nitro's node-server output before serving it. With that production server stopped, the library retained all 879 exercises and a self-hosted exercise image, and a newly created workout could record and complete a set; after reconnect and reload the completed session appeared exactly once. All 253 allowed exercise images are served from `/catalogue/media/`; `media-manifest.json` retains their original wger URLs, authors, licences, byte sizes and SHA-256 checksums.

Still required before calling the rebuild complete:
- Complete the 200%-text and emulated reduced-motion browser sweep, including builders, sheets, long names, errors and all routine editing flows. The global reduced-motion CSS override is present, but this browser surface did not expose motion emulation or text-only zoom.
- Visually review every imported image/crop and re-run `npm run catalogue:media` after any upstream catalogue refresh; the automated media check verifies presence and provenance, not exercise/image semantic correctness.
- Obtain qualified coach/clinician review of the training rules and curated catalogue. Real Supabase queued sync and Circle RLS/RPC tests, SMTP, Google sign-in, push, account isolation on the real project, Vercel deployment/domain and real iPhone installation remain external verification dependencies.
- Phase 5 chat/games and the Phase 6 release pass remain. They must build on real Circle identities/connections rather than simulated users.
