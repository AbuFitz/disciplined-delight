# Claude build brief: VAYVOR Living Instrument redesign

Use this as the implementation brief for the next design pass. Read `docs/VISUAL-REDESIGN-RESEARCH.md`, `docs/INTERFACE-SYSTEM.md`, `docs/PLATFORM-MASTERPLAN.md` and `docs/WORKOUT-BUDDY-WEARABLE-STRATEGY.md` before changing code.

## Mission

Redesign VAYVOR into a mobile-first **Living Instrument**: a calm personal system that turns training, recovery, nutrition and life signals into one understandable next action.

This is not a reskin. The current interface has too many similarly rounded bordered panels, too much equal visual weight, overused uppercase headings and an over-dominant green accent. Reduce cognitive load and give each view a clear focal point while preserving existing domain logic.

Do not clone reference sites or copy their code, assets, layouts or proprietary iconography. Translate the principles documented in the research.

## Non-negotiable product behaviour

1. Mobile first at 390px, stress-tested at 320px, then 768px and 1440px.
2. One dominant action or object per viewport.
3. Buddy remains optional and contextual. It does not become primary navigation or a floating obstruction.
4. Faith/meaning, nutrition depth, social comparison and advanced tracking are opt-in. Never assume religion, gender, gym access or competitive motivation.
5. Gym Mode removes global navigation and prioritises the current exercise, demonstration, set and next action.
6. User accents are previewable and constrained to accessible theme tokens. Green is not the default brand lock.
7. No random workout imagery. Use only the application’s approved exercise-media catalogue and poster fallback.
8. Do not change recommendation, health or workout-generation logic in this visual pass unless required to preserve an existing interaction.

## Visual system to build

### Spatial primitives

Replace broad use of the generic `Panel` with a small purposeful set:

- `Canvas`: page background and responsive content bounds.
- `Stage`: the single dominant active object.
- `Section`: flow grouping using spacing/type, normally without a border.
- `DataRow`: compact scannable item with explicit states.
- `MetricStrip`: one to three key signals, never a mini-dashboard grid.
- `Dayline`: temporal rail for completed/current/later states.
- `MediaTile`: approved exercise demonstration with poster, duration and status.
- `ActionDock`: one safe-area-aware action region.
- `FilterSheet`: mobile filter and sort surface.
- `EmptyCanvas`: calm explanation plus one next action.

Keep `Panel` only where an object has independent action, state or portability. Do not mechanically wrap sections in a replacement card.

### Material rules

- Neutral canvas; accent acts as a signal.
- Glass only on transient Utility layers such as nav, sheets or command surfaces.
- Maximum two elevation levels per screen.
- Radius scale: 6px controls, 12px media/objects, 20px rare Stage/sheet, pill only for tags/toggles.
- Prefer type, space and low-contrast dividers over boxes.
- Shadows only for floating/transient layers.

### Type

Use the installed fonts first:

- Hanken Grotesk: interface and body.
- Funnel Display: selective product headings; greatly reduce all-caps.
- Fraunces: rare reflective or milestone moments.
- DM Mono: telemetry, time, reps, load and device values.

Do not add a font until a side-by-side specimen proves the need.

### Icons

Keep Phosphor for universal actions. Create a coherent set of VAYVOR SVG glyph components for product concepts: Today/Dayline, Train, Fuel, Recover, Body, Mind, Meaning, Circle, Buddy, Readiness, Adaptation and Gym Mode.

Use a 24px base grid, 16/20/24 sizes, approximately 1.75px stroke and a consistent squared/rounded geometry. Do not place every icon in a coloured circle. Unfamiliar icons retain visible labels.

### Motion

- 100ms press feedback.
- 180ms local state changes.
- 280ms spatial transitions and sheets.
- Up to 450ms for earned milestones only.
- Springs only for direct manipulation.
- No ambient decorative animation on reading/data-entry screens.
- Implement static/reduced-motion equivalents with `prefers-reduced-motion`.

## Signature interaction

Build the **Dayline** as the shared visual metaphor. It connects readiness, plan, active work and recovery. Selecting the current moment expands it into the Stage. It becomes set/rest progression in Gym Mode and the completed session story in review.

Do not introduce a second large signature motif in this pass.

## Execution plan

## Platform coverage contract

The vertical slice establishes the system; it is not permission to leave the rest of the platform inconsistent. Maintain a route/state ledger and mark every item **not started**, **implemented**, **verified**, **blocked** or **not applicable**.

### Entry, identity and recovery

- Welcome, sign in/sign up, callback, forgot password and reset password.
- Guest mode, account upgrade, expired links, invalid links, offline sign-in and session expiry.
- Privacy explanation, permissions, consent changes, export and account deletion safeguards.

### Setup and personalisation

- Core goals, experience, constraints, schedule, environment, equipment and accessibility needs.
- Behavioural preferences: motivation style, feedback intensity, reminder tolerance, streak pressure, social-comparison preference and sensory needs. Preserve autonomy, avoid shame/dark patterns and keep every choice editable.
- Training, recovery, nutrition, vitamins/supplements, mind, meaning/faith, community, Buddy, notifications, location and devices as progressive optional setup.
- Setup review, edit-before-commit, skip, resume, back, save failure and partial completion.
- Appearance preview: light/dark/system, accent world, contrast and reduced motion.

### Daily system

- Today/Now Stage, Dayline, readiness, agenda, routines, reminders and adaptive explanations.
- Empty day, missed day, late day, travel, illness/injury, poor recovery, schedule conflict, offline and stale sync.
- Quick log, reschedule, substitute, dismiss and undo.

### Training

- Plan, calendar, programme, build/edit workout, exercise selection, scheduled session and substitutions.
- Gym Mode, rest timer, set editing, supersets/circuits, warm-up, cooldown, pause, resume, abandon, complete and review.
- Demonstration loading/failure, no equipment, pain/injury constraint, offline media, wake lock and interrupted session.
- Progression, deload, personal records and the explanation for every adaptation.

### Music and gym context

- Spotify and Apple Music are capability-gated adapters with honest disconnected, OAuth, permission-denied, unavailable and playback-error states.
- Gym Mode exposes playlist controls only after a service is connected; music must never block a workout.
- Gym location/radius uses explicit permission and a privacy explanation. Scheduled time/location may suggest Gym Mode, but the product never begins a workout without confirmation.
- Treat background geofencing as a future native capability where the web/PWA runtime cannot support it reliably.

### Exercise library

- Search, filters, sorting, movement families, equipment, muscles, goals and accessible alternatives.
- Consistent approved demonstration media, poster frame, text cues, common mistakes, regressions, progressions and substitutions.
- Missing media, licence/credit display, slow loading, offline, empty results and large-result performance.

### Food, nutrition and supplements

- Meal logging, targets, meal plans, shopping and nutrition summaries.
- Vitamins/supplements schedule, dosage-unit display, adherence and reminders without medical claims.
- Empty history, edit/delete confirmation, unavailable food, dietary constraints, unit systems and incomplete nutrition data.

### Body, recovery and mind

- Readiness, sleep/recovery, measurements, trends, milestones, check-ins and reflections.
- Manual entry and future device data with source/provenance visible.
- Sensitive-data privacy, missing data, contradictory signals, implausible values and no-history states.

### Meaning and faith

- Neutral meaning/values entry and explicit opt-in faith setup.
- Islam/Salah and future traditions live behind user choice; none are inferred from identity, name or location.
- Method/settings changes, unavailable location/time data, privacy, reminders and respectful disable/remove paths.

### Circle and motivation

- Crews, four-person groups, chat, challenges, invitations, privacy and safety/reporting.
- Self-comparison is default; leaderboards/competition are opt-in.
- Live activity/presence is anonymised and opt-in. Never fabricate a “people training now” count when no live backend signal exists.
- Empty community, muted/blocked/reported users, failed message, deleted content and moderation feedback.

### Buddy and global action

- Ask/explain, log, schedule, reschedule, substitute and plan-building intents.
- Preview and confirmation before consequential actions; undo where feasible.
- Voice/text alternatives, unavailable assistant, ambiguous request, unsafe request, no network and permission denial.
- Character reactions remain secondary, brief and reduced-motion aware.

### Progress, devices and settings

- Progress summaries, reports, comparison ranges and data-source clarity.
- Wearable/device connection concepts, disconnected/reconnecting/battery/stale-data states and manual fallback.
- Model source provenance and device capability for steps, heart rate, sleep, haptics and battery; never substitute generated readings for unavailable hardware data.
- Account, modules, reminders, theme, units, gym/location, companion, data, credits and install/PWA settings.
- Feedback and bug reporting with category, severity, reproduction context, privacy-safe diagnostics, success/failure and saved draft.
- Diagnostics are previewable and redactable before submission; include retry and report-status history when a backend exists.

### System-wide resilience

- Loading, skeleton, empty, partial, stale, offline, reconnecting, success, recoverable error, fatal error and permission-denied states.
- 404/route failure, update available, conflict resolution, sync status, destructive confirmation and undo.
- Keyboard open, safe areas, orientation change, long translations, long names, 200% zoom, reduced motion, high contrast and screen reader.
- PWA install/update, cache/media limits, storage full and refresh during an active task.

No surface is complete until its relevant states are demonstrated or explicitly classified in the ledger.

### Phase 0 — protect the baseline

1. Record current screenshots for mobile and desktop routes.
2. List all places using `Panel`, fixed positioning, z-index and bottom padding.
3. Preserve unrelated user changes.
4. Put the redesign behind a local feature flag or clearly isolated route until the vertical slice is approved.
5. Do not alter data migrations or recommendation logic.

Deliverable: baseline screenshot/contact sheet and a short component audit.

### Phase 1 — build the design lab

Create a development-only `/dev/design-lab` route showing:

- neutral canvases in light/dark;
- all user accent worlds with contrast values;
- the type scale on realistic health/training content;
- radius/border/elevation rules;
- buttons, fields, dropdowns, segmented controls, sheets and error/loading/disabled/focus states;
- product glyphs beside Phosphor actions;
- Stage, Section, DataRow, MetricStrip, Dayline, MediaTile and ActionDock;
- reduced-motion and high-contrast examples.

Create only two composed screen specimens:

1. **Living Instrument** — recommended, with Dayline and a precise Stage.
2. **Editorial Utility** — quieter comparator using more typographic contrast and less visible instrumentation.

Choose Living Instrument unless the comparator reveals a clear usability advantage. Do not build multiple full themes.

Deliverable: screenshots at 390px and 1440px plus a written decision.

### Phase 2 — vertical slice

Implement one complete journey before touching every route:

1. Sign in / start.
2. Progressive onboarding.
3. Today with Now Stage and Dayline.
4. Train week/session selection.
5. Gym Mode.
6. Session review.
7. Library search and one exercise detail.

Requirements:

- one interaction per onboarding step;
- setup summary before committing;
- fixed elements never overlap content;
- correct safe-area padding;
- realistic long labels, errors, loading, empty and offline states;
- approved exercise poster/video only;
- keyboard, touch and screen-reader paths;
- Buddy available through a labelled helper action, then rendered in a sheet/page, not a floating bubble.

Deliverable: working journey, screenshots and a short QA record.

### Phase 3 — extend by intent

Apply the system to the remaining product areas in this order:

1. Plan and calendar.
2. Recovery and body signals.
3. Fuel, vitamins and supplements.
4. Progress and reports.
5. Explore/library breadth.
6. Community/challenges.
7. Meaning/faith and optional life modules.
8. Settings, devices, privacy and bug reporting.

Do not dump every module onto Today. Each optional system should appear only when enabled or relevant.

### Phase 4 — refinement and removal

1. Remove obsolete visual primitives only after all callers migrate.
2. Audit copy for brevity, neutrality and action clarity.
3. Remove decorative elements that do not communicate hierarchy, state or identity.
4. Compare new screenshots against the baseline at the same sizes.
5. Test actual scrolling and keyboard behaviour, not screenshots alone.

## Route-level acceptance criteria

### Global

- The primary action is identifiable within three seconds.
- 44×44px normal touch targets; no WCAG target below 24×24px without allowed spacing.
- Works at 320, 390, 768 and 1440px with no horizontal overflow.
- Works at 200% text zoom.
- Visible focus, logical tab order and labelled non-text controls.
- Reduced-motion mode communicates the same state.
- No bottom nav, action dock, toast, sheet or Buddy overlap.
- No screen uses a border/radius merely because a wrapper exists.
- No arbitrary hard-coded accent colours outside semantic/token layers.

### Today

- One Now Stage, one Dayline and no more than two selected signals above the fold.
- Later items are scannable rows, not a card wall.
- User can customise which signals appear without entering a complex settings maze.

### Onboarding

- One decision per screen.
- Clear progress and back/skip behaviour.
- Sensitive questions explain purpose and are optional unless technically essential.
- Generated setup preview shows what is enabled and why.

### Library

- Consistent movement media source and aspect ratio.
- Search is immediately visible; filters live in a sheet.
- Media loading, unavailable video, reduced motion and offline states all have useful fallbacks.
- Detail exposes setup, cues, mistakes, regressions and substitutions without burying the demonstration.

### Gym Mode

- Global nav is absent.
- Current exercise/set/action is dominant at arm’s length.
- Session can be operated with large controls and minimal phone attention.
- Exit, pause and emergency recovery paths are obvious and confirmation is proportional to risk.

## QA gate for every phase

Run and pass:

- typecheck;
- lint;
- unit/integration tests;
- production build;
- existing catalogue/media checks;
- browser verification of the entire vertical slice;
- screenshot comparison in both colour modes and at required viewport sizes.

After editing multiple React components, run the React best-practice review. Fix accessibility, overlap, hydration, console and broken-state issues before calling a phase complete.

## What “done” means

The redesign is not done when the home screen looks impressive. It is done when the complete vertical slice is calmer, faster and more understandable; all controls and states are coherent; exercise media is consistent; motion is purposeful and optional; and the same system scales into the platform’s broader modules without returning to a wall of cards.

Return at the end of each phase with:

1. What changed.
2. What was deliberately not changed.
3. Links to relevant files.
4. Screenshots at 390px and 1440px.
5. Test/build results.
6. Remaining risks and the next smallest coherent phase.

