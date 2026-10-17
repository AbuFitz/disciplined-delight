# Buddy: what ships

Buddy is an optional companion. It is not a therapist, authority figure or open-ended chatbot,
and no language model is involved: every line is chosen by a deterministic brain from status
signals.

## Character

Three original SVG characters, drawn in this repository (`src/components/buddy/BuddyCharacter.tsx`)
and sharing one rig of eyes, mouth, two arms, accessories and a ledger baseline:

- **Bell**: a kettlebell with a face. Steady and compact.
- **Cairn**: three balanced stones. Patient; the cap stone wobbles when it thinks.
- **Plate**: a weight plate with a rim, tick marks and a bar hole. Round and rolling.

Colour is `--primary` from the selected colour world (or a fixed world if the person picks one),
so light and dark both stay legible. There is no raster art, no stock asset and no AI-generated art.

## Animation state machine

`src/domain/buddy/state.ts` is pure and tested. 13 states: enter, idle, breathe, listen, think,
explain, point, encourage, celebrate, recover, rest, error, offline. Each has a distinct *static*
pose (eyes, mouth, arms, accessory, lean), so state is visible with motion off. Transient states
settle back to a base state; higher-priority states (error, celebrate, recover) are not displaced
by lower ones.

Motion levels: Still (poses only), Gentle (breathing, blinking), Lively (full). Reduced-motion
preference always forces Still. All animation is transform/opacity only, pauses off-screen and in
background tabs (`data-live`), and is gated by `prefers-reduced-motion: no-preference`.

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
