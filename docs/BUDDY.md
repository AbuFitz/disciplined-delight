# Buddy: what ships

Buddy is an optional companion. It is not a therapist, authority figure or open-ended chatbot,
and no language model is involved: every line is chosen by a deterministic brain from status
signals.

## Character

**Current state: provisional.** The earlier Bell/Cairn/Plate bodies were rejected and removed. The
companion is now a family of four non-gendered variants (Tavi quick/curious, Ollo cosy/calm, Zuri
bold/celebratory, Eira elegant/reflective) that share one face and state set and differ by silhouette
and motion profile (`src/domain/buddy/variants.ts`). Bodies come from a replaceable art pack
(`src/domain/buddy/art.ts`); the shipped pack `provisional-v0` is deliberately neutral geometry and is
labelled provisional wherever it appears. The approved four-variant exploration is reference-only
(`docs/design-reference/`) and was not traced. Names are working names (see variants.ts for the collision note).

Superseded description of the old art, kept only for history: three original SVG characters drawn in this repository
sharing one rig of eyes, mouth, two arms, accessories and a ledger baseline:

- **Bell**: a kettlebell with a face. Steady and compact.
- **Cairn**: three balanced stones. Patient; the cap stone wobbles when it thinks.
- **Plate**: a weight plate with a rim, tick marks and a bar hole. Round and rolling.

Colour is `--primary` from the selected colour world (or a fixed world if the person picks one),
so light and dark both stay legible. There is no raster art, no stock asset and no AI-generated art.

## Animation

`src/domain/buddy/state.ts` (state machine, pure and tested) and `src/domain/buddy/clips.ts` (authored clips).
14 states: enter, idle, breathe, listen, think, explain, point, encourage, celebrate, recover, rest (sleep),
error (help), offline, exit. Priority and interruption rules keep error/celebrate/recover from being
displaced. Each state also has a distinct static pose (eyes, mouth, accessory, lean).

Clips are WAAPI keyframes on the rig parts (root, body, face, eyes, mouth, acc, shadow) built from
anticipation, action, overshoot and settle with squash and stretch, scaled by the variant's motion
profile (tempo, squash, anticipation, overshoot, idle cadence and favourite idle moves). Interruptions
blend from the current pose. Only transform and opacity change, so layout never shifts. Animation pauses
off-screen and in background tabs, never blocks input, and reduced motion or the Still setting applies a
static key pose instead. Motion levels: Still, Gentle (softened clips), Lively.

Haptics: `docs/HAPTICS.md`.

## Context awareness

`src/domain/buddy/brain.ts` maps the screen and status signals to a scene, state, short line,
panel text, tips and one action: first run, onboarding, Today, plan setup, Library, readiness,
low readiness, next exercise, form cue, rest, personal best, workout done, missed-session
recovery, reflection, help, empty, error, offline and quiet hours. Inputs are status only:
planned/active/completed workouts, sync state, online state, set counts. It never reads notes,
journal text, health text or faith settings.

## Surfaces

- **Placement contract: Buddy never floats over content.** On small screens the bottom bars
  (resume bar, Buddy bar, tabs) are one stack that the shell *reserves* out of the scrolling area
  (`html[data-shell="bars"]`, `--reserve-bottom`, measured with a ResizeObserver), so the page
  scrolls in the space above them. The expanded panel is part of that stack, so opening it shrinks
  the scrollport instead of covering anything. On desktop Buddy lives in the sidebar rail and the
  expanded panel is a third layout column that content reflows around. Snoozed or on-demand
  Buddy is a header button on mobile and a rail control on desktop; a snoozed Buddy is never lost.
  Panel: guidance, Snooze 4h, Hide today, Mute, Read aloud, Buddy settings, Report a problem.
- **Inline strip** (`BuddyStrip`): inside Gym Mode and rest screens, in the layout flow.
- **Guidance cards** (`BuddyGuide`): readiness, adaptation, rest, gym start.
- The dock is hidden on `/train/session` and `/onboarding`, which use inline surfaces.

## Setup and customisation

Progressive step in onboarding (opt in or out, name, form, colour, then expandable personality,
rhythm, sound and placement) and the full form in Settings > Companion. Options: form, name,
colour (match world or fixed), expression, personality, coaching tone, intensity, frequency,
movement, celebration, sound (silent by default, soft chime, device voice), placement (right,
left, in context only, only when tapped), quiet hours, topics, mute. Stored configs from earlier
builds are migrated by `normaliseCompanion` (orb/totem/spark to bell/cairn/plate, dashboard to
dock_right). Faith is never inferred or mentioned.

## Mirror Mode ("You vs You")

`src/domain/buddy/mirror.ts`. Compares only with the person's own earlier sessions: last time,
a personal ghost target (match it, or one small step), ahead / matched / lighter wording that
treats a lighter day as information, consistency against their own usual week, personal bests
against their own history, and a compassionate comeback line after a long gap. Shown in Gym
Mode, exercise cards, the finish sheet and the Buddy panel on Today. No leaderboards, no other
people.

## Not built

- Voice uses the device speech engine; quality varies by device.
- No server-side or LLM-driven coaching.
- Real-device and screen-reader verification of the dock has not been done (only headless Chromium).
