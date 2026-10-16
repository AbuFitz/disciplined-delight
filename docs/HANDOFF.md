# New Life rebuild: handoff

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
