# Experience lab: Today → Gym

Status: **prototype for owner review. Nothing here is rolled out across routes.** The route rollout is paused until a
direction is chosen. The earlier Today/Shell work on the Living Instrument primitives is saved on the branch (commit
`39bb113`, labelled WIP / not accepted) and is superseded by this reset.

## What changed in the north star

Not "fewer borders" but **fewer simultaneous choices and more cinematic focus**: the interface should feel like
entering a responsive environment, not reading a dashboard. Motion is allowed only where it communicates
_readiness, progression, rest or completion_. No random decorative loops, no loud gamification, no particle wallpaper,
no mascots bobbing for attention. Sound is an optional future capability and is not used.

## The lab

Development-only route `/dev/experience-lab` (in a production build it renders the 404 page; the route chunk is a
~94-byte stub and the build guard fails if any lab text ships). One shared model drives all three prototypes, so
**copy, content, state machine and timing are identical** and only presentation differs (a test asserts identical copy
at six moments, plus a11y structure).

The 15-second sequence (`src/components/experience/model.ts`, every beat is a timed action, so seeking is a pure fold):

| t    | scene            | what happens                                                                                                                                                                                     |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.0  | Arrive           | Date, "Good morning, Sam." Dayline shows Readiness, Plan, Now, Recovery                                                                                                                          |
| 2.0  | Readiness        | One decision: "How ready do you feel?" Fresh / Okay / Tired (Okay chosen at 3.7s)                                                                                                                |
| 4.6  | Adapt with Buddy | Plan appears. The Buddy signal is asked "I only have 35 minutes"; a **preview** appears (drops hammer curl, keeps heaviest sets, saves 10 minutes); **Confirm** at 7.8s applies it with **Undo** |
| 8.6  | Now              | "Back & biceps, 4 exercises, about 35 min" and Begin                                                                                                                                             |
| 9.5  | Enter Gym Mode   | The chrome falls away; the world changes state                                                                                                                                                   |
| 12.2 | Set              | Seated cable row, set 1 of 3, 62.5 kg × 8; Done logs it                                                                                                                                          |
| 12.7 | Rest             | 90 s rest (accelerated in the demo); completion at 14.6s                                                                                                                                         |

Controls: Play/Pause/Restart, scrubber with scene label, speed, Compare or single view, 320 / 390 / Desktop frames
(prototypes adapt to the **frame** via container queries), Dark/Light, Reduced motion, Low power, accent worlds,
haptic-event log. Tapping inside any prototype takes over from autoplay (interactive mode: only arrive, enter, rest and
the undo timeout advance by themselves). Haptics fire **only for real taps**, only if the person enabled haptics in
Buddy settings (the lab's autoplay never vibrates; the log marks autoplay events with `*`).

URL parameters make every view reproducible: `?p=a|b|c|all&w=320|390|desk&theme=dark|light&rm=1&low=1&seek=<ms>&chrome=0`.

## The three prototypes

**A · Atmospheric spatial calm.** A four-layer environment (sky, far light, mid light, near vignette and grain) whose
colour and warmth respond to the readiness answer (Fresh: cooler and brighter; Okay: neutral; Tired: warmer and dimmer).
The far light breathes slowly (11 s); at rest it slows to an 8 s cycle matched to a breathing pace. Pointer parallax on
desktop. The Dayline is a luminous rail with a travelling point of light. Panes leave first and arrive second, one
decision at a time, with depth-of-field blur. Entering Gym Mode is a **dolly**: layers scale at different rates, the
Dayline lifts away, numbers become the interface. Rest is a halo and a draining arc; completion is a single soft bloom.
Buddy is a small **guide signal** (a ring that pings), not a character.

**B · Tactile instrument.** Matte surfaces with soft depth and fine grain; direct manipulation. The Dayline is a
physical slider with four detents; readiness is a **rotary dial** you can drag (or use the arrow keys) that snaps to
detents; minutes and exercise counts are **rolling digit readouts**; Begin and Done are **keys** with travel; Confirm
is a **toggle lever**; rest is a 60-tick dial whose ticks dim as time passes and flash once on completion. Buddy is an
**indicator lamp**, a readout window that shows the command, and an Ask key.

**C · Warm editorial sanctuary.** Paper and warm light; a human voice (Fraunces). Readiness is a _sentence you finish
with a word_. The Dayline is a timetable rule with four marks. Pages dissolve with a slow vertical drift; a patch of
window light moves across the paper over a minute (the only ambient motion). Applying the shortened plan **strikes
through** the old line and writes the new one. Gym Mode warms to dusk, with large numerals and a sentence readable at
arm's length. Rest is an ink bloom that breathes, then settles. Buddy is a **margin note** with a pencil mark.

How the research principles were translated (principles only; nothing copied): Linear, structure felt rather than
boxed, inactive states recede (A, C); Raycast, optional command speed and previewable worlds (the Buddy command line
and accent worlds); Nothing, industrial restraint, telemetry microtype, one focal object (B, A's numerals); Teenage
Engineering, tactile instrument behaviour and purposeful asymmetry (B); Craft, warmth, editorial human moments (C);
Cosmos, breathing room and one dominant action per screen (A, C).

## Reduced motion, performance, fallbacks

- **Reduced motion** (OS setting or the lab toggle): the same states with no movement. Panes cross-fade in 120 ms; no
  drift, parallax, dolly, breathing, bloom, ink reveal, counting or dimming sweep. Progress is carried by text, shape
  and position (current Dayline node, filled arc, final countdown value), never by animation alone.
- **Low power** toggle: the atmosphere (A's layers, C's moving light) becomes static. In production this would key off
  `Save-Data`, battery saver where exposed, and a Settings control.
- Transform and opacity only; the few blurred layers (A) are static elements, not per-frame filters; a probe of frame
  timing is in the evidence section.

## Buddy reset

The cartoon faces are **not** assumed to be the answer. The Buddy earns its place through **actions**: one-tap, text or
voice commands that **preview, confirm and are undoable**. Default presence is a subtle **guide signal** (orb, lamp or
margin mark) inside the experience, never a floating mascot over content. Character skins (including the existing blob
family) stay available as an **optional skin** and default off.

| Capability                       | Shape of the interaction                                      | Exists in the app today?                                     |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Plan creation / adjustment       | "Build me a 3-day plan" → preview diff → Confirm → Undo       | Planner and accept/replace exist; the command layer does not |
| Reschedule                       | "Move today's session to 6pm" → preview → Confirm             | Occurrence move exists                                       |
| Gym substitution / hotel version | "Hotel version" → swaps shown → Confirm                       | Substitution data exists; flow not built                     |
| What next?                       | One suggested action with a reason                            | Agenda "next" exists                                         |
| Form guidance                    | Cue, mistake, regression for the current exercise             | Library cues exist                                           |
| Rest timing                      | "Rest 2 minutes" → timer changes                              | Rest timer exists                                            |
| Recovery adaptation              | Explains and proposes a lighter session                       | Adaptive rules exist                                         |
| Food / supplement logging        | "Log 2 eggs and toast" → preview → Confirm                    | Meal logging exists; supplements not built                   |
| Setup help                       | Explains why a question is asked, fills defaults with preview | Onboarding exists                                            |
| Bug report                       | Drafts a report with a redacted diagnostics preview           | Report flow exists                                           |
| Integration troubleshooting      | Explains connect/disconnect states honestly                   | Adapters blocked on credentials                              |

Not built, so not claimed: the intent parser (rules-first deterministic grammar, optional model later), voice input
(needs microphone permission and a speech API; shown as an honest unavailable state when absent), and the confirmation
framework wired to real actions. **Invariants:** no autonomous consequential change; every change shows a preview and
needs confirmation; undo where feasible; states for unavailable, ambiguous, unsafe, no network, permission denied and
reduced motion.

### Measurable value (to be instrumented locally first; nothing is transmitted without consent)

| Outcome                | Metric                                                                                               | Baseline needed                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Lower setup drop-off   | Share who finish each onboarding step and the whole flow, with and without Buddy help                | Current onboarding funnel                              |
| Fewer taps in workouts | Taps and seconds per logged set; taps to substitute an exercise or change rest                       | Manual path                                            |
| Faster plan changes    | Time from intent to confirmed change (median) via Buddy versus the planner                           | Planner path                                           |
| Follow-through         | Planned sessions completed and rest/recovery days respected in the 7 days after an adapted plan      | Un-adapted plans (correlational only; no causal claim) |
| Safety and trust       | Preview cancel rate, undo rate, error rate; **zero** changes without confirmation (tested invariant) | n/a                                                    |

No target is claimed as achieved. These need real usage to measure.

## Recommendation (mine, pending the owner's review; not user-tested)

**A hybrid, with A as the spine.**

1. **A as the global environment and the Dayline as the journey** for Today, onboarding, review and recovery. It is the
   only prototype that makes the product feel like entering a place, it can carry readiness as light, and it supports
   one decision at a time and the dolly transition into Gym Mode without chrome.
2. **B's tactility only where hands are busy: Gym Mode and direct manipulation.** The Done key, rolling numerals and the
   rest tick dial are the most satisfying and the clearest at arm's length, and pair naturally with haptics. Using B for
   the whole product would turn into skeuomorphic fatigue and is the hardest to extend to Food, Mind and Circle.
3. **C's voice and paper for reflective moments**: Mind and meaning, setup explanations, milestones, session review as
   a story, and the light mode's warmth. Its sentence-as-input readiness is the calmest option for people who dislike
   dials, but it is the slowest for fast logging, so it should not own Gym Mode.
4. **One Buddy**: the A signal is the default; the C margin note appears in reflective contexts; the B lamp and Ask key
   appear in Gym Mode. Same capability, same preview and confirm contract.

Risks: A's blurred light layers need a low-end device check and contrast verification where text sits on gradients;
B needs careful target sizing and discoverability for non-visual access (every dial has a radio-group and a slider with
keyboard support); C's Fraunces numerals are lovely but must be checked for tabular alignment in load tables.

## Evidence (this directory)

Contact sheets `a|b|c-{320,390,desk}-{dark,light}.png` (six moments each), `…-390-{dark,light}-reduced.png` (reduced
motion), and recordings `{a,b,c}-390-dark.webm`, `{a,b,c}-desk-light.webm` of the 15-second sequence. Regenerate with
`scripts/experience-lab/capture.mjs` (needs `playwright-core`; see the script header). Automated checks run over every
prototype × 320/390/desktop × dark/light × ten moments: **no element outside the frame horizontally and no interactive
target under 44×44px**.

## Honest limits

Prototype quality, not product code: copy is shared placeholder content; the demonstration media area is intentionally
absent (no licensed media is used); no real-device, screen-reader, haptic-hardware or low-end-device testing was done;
the frame-timing numbers (below) come from a headless software renderer and are only a relative signal; no user testing.
