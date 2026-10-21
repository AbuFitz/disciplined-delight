# Living Instrument: the governing design contract

VAYVOR is a calm personal instrument that turns training, recovery, nutrition and life signals into one
understandable next action. Calm at rest, precise in use, alive when the person acts. Default mindset: you versus
yesterday. Community and competition are opt-in. This document governs the build; the earlier "quiet canvas" and
"rounded Uber-like" passes are superseded where they conflict (see Deviations).

## Signature: the Dayline

One thin temporal rail connects **readiness, plan, current action and recovery**. Selecting the current moment
expands it into the dominant **Stage**. In Gym Mode the Stage becomes set/rest progress; in review it becomes the
completed session story. There is no second competing visual gimmick.

## Three layers

1. **Canvas**: neutral page, typography, rhythm, subtle rules. Solid. Calm.
2. **Stage**: one dominant active object or action per viewport.
3. **Utility**: transient sheets, nav, command surface, optional Buddy. **Glass belongs only here.**

Max two elevation levels. Radius scale: 6px controls, 12px media/objects, 20px rare Stage/sheet; pill only for tags
and toggles. Space, type and dividers before boxes. A card exists only for content with its own state, action or
boundary. Accent is a signal, not paint.

## Primitives (src/components/living/)

Canvas, Stage, Section, DataRow, MetricStrip, Dayline, MediaTile, ActionDock, FilterSheet, EmptyCanvas. Each has
loading, empty, error, long-copy and 200%-text states, specimens in `/dev/design-lab` (development only).
Obsolete (`Panel`, `Group`, `Tile`, `SignalRail`, `Segmented` pills, `Chip` borders) are removed only after callers migrate.

## Type, glyphs, colour, motion

- Hanken Grotesk for UI/body, Funnel Display selectively and rarely uppercase, Fraunces only for rare reflective or
  milestone moments, DM Mono for telemetry. Phosphor only for universal actions. A 24px VAYVOR glyph family
  (Dayline, Train, Fuel, Recover, Body, Mind, Meaning, Circle, Buddy, Readiness, Adaptation, Gym Mode) with visible
  labels for unfamiliar symbols.
- Foundations Obsidian / Parchment / Graphite / Fog. Accent worlds Cobalt (default), Citrus, Coral, Violet, Rose, Ice,
  Slate, previewable and contrast-checked. Semantic success/warning/danger never change with the world. No neon-green
  lock. No free-form colour until contrast can be guaranteed.
- Motion 100ms press, 180ms local state, 280ms spatial/sheet, up to 450ms only for an earned milestone. Springs only
  for direct manipulation. No ambient decorative motion. Full reduced-motion equivalents. Haptics never carry
  information alone.

## Mobile and accessibility non-negotiables

Design at 390px, stress at 320px, verify 768 and 1440. 44x44 controls, 200% text, keyboard and visible focus, screen
readers, reduced motion, contrast modes, long names and translations, keyboard-open, safe areas, orientation. No
horizontal overflow. Fixed nav, sheets, toasts, Buddy and active-session controls never overlap content. One dominant
action/object per viewport.

## Visual research, translated (principles only; no layouts, assets or brand identity copied)

| Reference           | Principle adopted here                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Linear              | Inactive states recede; structure felt through rhythm and hairlines, not boxes; calm density |
| Raycast             | Optional command/helper speed; previewable theme worlds                                      |
| Nothing             | Industrial restraint; DM Mono telemetry microtype; one focal object                          |
| Teenage Engineering | Tactile instrument behaviour; purposeful asymmetry; authored glyphs                          |
| Craft               | Warmth and editorial human moments; editable personal worlds                                 |
| Cosmos              | Breathing room; spatial rhythm; one dominant action                                          |

## Buddy

Optional, contextual, useful; never the main product, never a floating obstruction. Translates voice/text intent into
**previewable** actions (build/adjust a plan, move a workout, hotel version, log food, explain adaptation, configure
reminders) with confirmation before consequential changes and undo where feasible. Cute brief reactions only in setup,
empty states and earned celebrations; no constant bobbing. States: unavailable, ambiguous, unsafe, no network,
permission denied, reduced motion. Buddy never shames, guilts, diagnoses or infers faith.

## Behavioural setup (autonomy first)

Optional, one decision per screen, every choice editable later: motivation style, feedback intensity, reminder
tolerance, streak pressure, social-comparison preference, accessibility and sensory needs. No dark patterns, no
shame, no streak guilt. Defaults are calm and self-comparison only. Never inferred from behaviour.

## External adapters (capability flags; no fabricated functionality)

Every adapter sits behind a capability flag and states honestly what is connected, not connected, denied, stale or
unavailable. Credentials and native-device dependencies are **blocked, not complete**.

- **Music** (Spotify, Apple Music): disconnected / OAuth / permission / unavailable states; Gym Mode controls appear
  only when connected. Needs developer credentials and (Apple) MusicKit entitlements: blocked.
- **Gym location**: explicit permission and privacy copy, radius model, a scheduled Gym Mode _suggestion_ now,
  geofence and native capability later, never auto-start a workout without confirmation. (The current security headers
  deny `geolocation`; enabling it is a deliberate, documented change.)
- **Wearables**: capability and provenance model for steps, HR, sleep, haptics, battery; stale, sync and manual
  fallback; no fake readings. Needs native/Health APIs: blocked.
- **Presence and challenges**: opt-in, anonymised, never invented live counts; self-comparison default; competition
  controls. Needs the account service: blocked.
- **Bug reporting**: privacy-safe; drafts, diagnostics preview with redaction, submit failure and retry, status
  history.

## Deviations from earlier work (deliberate)

The v3 pass (rounded-3xl surfaces, pill buttons, icon circles) conflicts with this contract's "fewer borders, pills
and rounded containers" rule and its radius scale. It is retained as the starting point and replaced primitive by
primitive during migration, not recoloured. Any remaining deviation is listed in `docs/COVERAGE-LEDGER.md`.
