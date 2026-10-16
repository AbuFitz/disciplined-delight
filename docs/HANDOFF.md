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
2. Optional: open **Soul** and turn on **Salah**, then pick a source (calculated for a locality, or paste your mosque's
   timetable) and check it against your mosque. If you don't pray, leave it off and nothing about prayer appears.
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
session expiry in the wild; migration `0005`.

## The Supabase project blocker

The only project the connector can see is "TruetoDetail System" (inactive, a different product). It is **not** the
VAYVOR project and **nothing was applied to it**. Activation needs a decision from you:

1. Create or choose the VAYVOR Supabase project.
2. Apply `supabase/migrations/0003` to `0005` (review first; `0001`/`0002` are legacy and unused by the new client).
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

## Continuation: Phase 2 corrections, design sweep and Phase 3

Branch `claude/relaxed-ptolemy-4v3qva`, no pull request open. Read this section for the current state; earlier sections are history.

### Plans are now reliable

- **Curated catalogue.** `catalogue/overrides.json` is the persistent corrections file (pattern, equipment, tracking, muscles,
  hide, rename) and also the curation list: only 141 hand-reviewed exercises are used by automatic programmes; the other 738
  remain browsable. No name-based exclusion lists remain in code. Details: `docs/CATALOGUE.md`.
- **Accepting is gated** by `assessPlan` after every swap, removal or fill: main-lift gaps, empty sessions, sessions that
  cannot fit the requested time, unavailable or duplicate exercises, or any starting load block saving, each with fixes
  (choose an exercise, add the equipment that unlocks options, allow more minutes). Equipment suggestions survive on partial plans.
- **Beginner volume warning investigated**: it came from double-counting upstream's multiple "primary" muscles, hip-thrust
  style moves filed as hinges, and no trimming after selection. Fixed in counting, classification and selection. **The weekly
  bounds were not widened** (4–10 new/returning, 8–18 experienced). See `docs/TRAINING-RULES.md`. The rules remain **draft and
  not reviewed by a qualified coach or clinician**; that requirement stands.
- `shortenSession`'s result is honoured (a session that still can't fit is a blocker with "allow N minutes"). Recovery is
  checked across Sunday into Monday, and missed-session rescheduling uses the same wrap.

### Recoverable plan editing

- Accepting, replacing and regenerating are **one atomic IndexedDB transaction** (`applyBatch`: templates, archives, plan record,
  equipment profile and their outbox mutations together), scoped to the account generation at the moment of the call. A failed
  save leaves the previous schedule untouched and shows a retry panel. Tested with an injected failure.
- No default when workouts already exist: you must choose "keep and add unscheduled" or "replace (archive)".
- **Archived workouts** are listed on Train with **Restore** (back on its day if free, otherwise unscheduled).
- **Regenerate** (Train → Generated plans): starts from the original answers with a new seed, shows what changes per workout
  (added, removed, changed sets/reps), warns if you edited the plan since, states how many logged sessions are untouched (all),
  and requires a choice before saving. Only that plan's workouts can be archived; logged sessions are never rewritten.

### Design

Reviewed Today, Train, Library, Body, Mind, Soul, Circle, Week and the whole builder (6 steps, gap state, swap sheet, library
detail and add sheets, empty and long-name states). Direction after your feedback: **editorial and quiet**: charcoal, warm paper,
controlled green; one paper-coloured hero ("Next up") per screen, hairline panels elsewhere, bigger type only where it matters,
colour tints used rarely. Sweep run with `scratchpad` tooling (not committed) at 320/390/768/1440 px in dark and light, 200% text
and reduced motion, checking horizontal overflow, controls under 40 px, unlabelled controls and clipped text. Fixed: a bare
`grid` with responsive columns let long content blow out the page (global fix), display titles now wrap, sheets are bounded to the
viewport at large text, Close buttons no longer shrink, library filters stack on narrow screens and are no longer sticky, mood
scales and day tabs wrap or scroll instead of squeezing, inline credit links are real tap targets, skip-to-content link added.
Keyboard: tab order and visible focus checked on eight routes, dialog focus trap and return verified.

### Phase 3: daily routines (see `docs/ROUTINES.md`, `docs/PRIVACY.md`)

- **Spaces:** Today, Body (training, food, shopping and budget, progress, library, plan builder), Mind (check-in, reflect, focus
  timer, history), Soul (optional Salah, reflection), Circle (an honest "not open yet" page: no pretend people or scores).
  Old URLs (`/train`, `/food`, `/salah`, `/progress`, `/plan`, `/schedule`, `/workouts`, `/nutrition`, `/library`) still work
  (checked in a browser) and light up their space.
- **Engine:** one pure agenda (`domain/routine.ts`) over repeating activities, the five prayers and the planned workout; linked
  activities complete from their real record exactly once; skip, rest day, move (another time or day), pause/resume and
  correcting a tick or skip are supported; midnight, late-evening blocks and DST handled and tested.
- **Today:** one next-action card and one timeline with per-item actions. Build a routine around real sleep, work and prayer
  times from the Week page; nothing is placed over them, and what can't fit is reported.
- **Privacy:** Mind entries are forced private; Salah is off until chosen. Private collections are listed in code and checked
  at the database level (owner-only rows). Not end-to-end encrypted (see `docs/PRIVACY.md`).
- **Not built (by design, planned phases):** friends, crews, challenges, medals, chat, Four in a Row.
- **Limits:** routine blocks don't schedule notifications; "meal" links mean any meal logged; skipping the default workout
  row is per date.

## Checks actually run (this continuation)

| Check                                                                                  | Result                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (vitest, fake IndexedDB)                                                    | 196 pass: planner, reliability, plan actions (atomic failure, regeneration, restore), diff, routine engine incl. DST, routine actions, tracking, catalogue, backup, sync, accounts                 |
| `tsc --noEmit`, `eslint`                                                               | clean, 0 errors (22 existing warnings)                                                                                                                                                             |
| Production build (`NITRO_PRESET=node-server`)                                          | builds; served on a local port                                                                                                                                                                     |
| Offline on the **production build with the service worker active** (headless Chromium) | SW controls the page; catalogue snapshot cached; offline Library shows 879 exercises, search and credits work; a workout set logged offline survives a reload                                      |
| Browser flows on the dev server (headless Chromium)                                    | builder gating (remove main lift → blocked → fill → saved), regenerate with required choice, archive and restore, routine builder, tick/undo/skip/undo/move/pause/resume, Salah optional, old URLs |
| Database SQL tests, local Postgres 16, **simulated** auth schema                       | `supabase/tests/run-local.sh`: sync 21, reminders 8, profiles 18, all pass (includes private `mind` and prayer rows unreadable by another user)                                                    |
| Design sweep                                                                           | see Design; final screenshots in `docs/screenshots/phase3/` (final sweep: no overflow, small-target, unlabelled-control or clipping findings at 320/390/768/1440 px, dark and light, 200% text, and reduced motion at 390 px)                                                                                                                                        |

**Simulated vs real:** nothing was run against a real Supabase project (none exists for VAYVOR), real email, Google sign-in,
push or a real phone. `docs/SUPABASE-SETUP.md` has the exact steps and a table of each check, how to run it and its status;
`scripts/verify-supabase.mjs` checks a real project (anonymous denial, migrations present, and with `--write` two-account
isolation and sync) and refuses to run against a URL that doesn't match the project ref you name. Its argument guards were
exercised; its checks have only been run against an incomplete local simulation, so treat its first real run as untested.

## Remaining dependencies (yours)

1. Create or choose the VAYVOR Supabase project; apply migrations (`docs/SUPABASE-SETUP.md`); run `scripts/verify-supabase.mjs`
   and the manual email, Google and push checks; real-iPhone and Android PWA checks.
2. Set Vercel env names, Site/Redirect URLs, SMTP and templates; redeploy to confirm the security-patched TanStack build.
3. Qualified coach/clinician review of `programmes.ts` and the curated exercise list before offering plans publicly.
4. Rights decisions for the CC BY-SA catalogue (credits page, snapshot licence); hotlinked exercise images need a connection
   (self-hosting selected images is the proper fix and is not done).
5. vayvor.com registration, trademark search, embroidery test sew.
6. Later phases: friends/crews/challenges/medals, chat and Four in a Row with dares, release verification.
