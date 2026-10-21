# Ambient Athletic Cinema (experience lab)

Status: **prototype for owner review, not accepted, not rolled out.** Route migration is paused. This supersedes the
earlier three-prototype lab and the "Living Instrument" minimalism where they conflict: simple means **low cognitive
load with high visual richness** (gradients, animated light, depth, fluid transitions), not stripped-back.

Route (development only; production renders the 404 page, the chunk is a stub and the build guard fails if lab text
ships): `/dev/experience-lab`. Code: `src/components/cinema/` (`model.ts` state and timeline, `use-cinema.ts` driver,
`cinema.tsx` scene, `cinema.css` effects, `glyph.tsx` assistant mark, `lab.tsx` controls).
Reproducible URLs: `?w=320|390|desk&theme=dark|light&time=dawn|day|dusk|night&world=cobalt|citrus|coral|violet|rose|ice|slate&rm=1&low=1&seek=<ms>&chrome=0`.

## The sequence (about 26 s; every beat is a timed action, seeking is a pure fold)

| t              | beat                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 2.7 s     | The atmosphere resolves first (sky, aurora ribbons, volumetric rays, horizon light, depth ridges and running lanes, grain), then the Dayline energy path draws, then the greeting, then the one next action                                                                                                                                                                                                                         |
| 2.7 to 6.3 s   | One decision: "How ready do you feel?" A **drag-to-charge** slider charges the Dayline live (glow, width, ribbon intensity); release snaps to Tired / Okay / Fresh with a haptic tick per detent                                                                                                                                                                                                                                    |
| 6.3 to 8.2 s   | Now: "Back & biceps" and a light-lens Begin                                                                                                                                                                                                                                                                                                                                                                                         |
| 8.2 to 9.9 s   | **Portal**: the Now moment is passed through (scale-through, depth layers dolly at different rates, the Dayline lifts away) into edge-to-edge Gym Mode                                                                                                                                                                                                                                                                              |
| 10.5 to 17 s   | **Assistant**: a signal appears, expands into a command surface (voice bars, transcript "I only have 30 minutes and this machine is busy"), previews a **diff** (swap seated cable row for dumbbell one-arm row because the machine is busy, keep two, remove hammer and cable curl, 45 to 30 min), **Confirm**, the session visibly rewrites (title and numerals swap to 24 kg x 10), the surface closes and an Undo toast follows |
| 18 s           | Done logs the set and an **energy pulse** runs along the edge track                                                                                                                                                                                                                                                                                                                                                                 |
| 18.9 to 21.1 s | **Rest breathes** (8 s halo, draining arc, countdown, calmer atmosphere); a bloom marks completion                                                                                                                                                                                                                                                                                                                                  |
| 21.8 s on      | **Finish** collapses the session into the story (4 exercises, 9 sets, 29 min, "adapted from 45 to 30 min") and the world cools into recovery                                                                                                                                                                                                                                                                                        |

Colour worlds (user chosen), time of day and mode are lab controls. Dark is deep and luminous; light is sunlit and airy.

## Assistant signal (replaces the cartoon Buddy as the default presence)

An authored mark (a V opening like a lens with a core of light and a horizon arc) whose light and behaviour come from
the scene. It appears when invoked or useful, expands into a voice/text command surface, **previews a concrete change,
asks for confirmation, supports undo, and disappears**. No autonomous consequential change. Voice is shown as a demo
(typed as if spoken); no microphone is used and nothing here is connected to real planner actions yet. Skins and the
old blob family remain optional later.

## Motion, accessibility, performance

- Transform, opacity and a few small SVG strokes. Camera travel is deliberately modest (scale 1.05 to 1.22), the
  horizon stays level, nothing flashes, and ambient loops are slow (26 to 44 s) for vestibular comfort.
- **Reduced motion**: same hierarchy and states without travel, parallax, dolly, loops, pulses or counting; panes
  cross-fade in 140 ms; progress stays legible through text, the filled path, nodes and a static arc.
- **Low power**: atmosphere becomes static and backdrop blur is replaced by a solid translucent fill.
- Targets are at least 44 px (automated check across scenes), content stays inside the frame at 320 and 390, regions
  adapt by container query to desktop, text sits on local scrims, and inactive layers are inert and hidden from
  assistive tech with a live region for state changes.

## Evidence in this directory

`cinema-390-dark-dawn.png`, `cinema-320-dark-dawn.png`, `cinema-390-light-day.png` (13 moments each: arrive, readiness,
charged, now, portal, gym, listening, preview, rewritten, updated, pulse, rest, story) and `cinema-assistant-390.png`.
Also run: no element outside the frame and no target under 44 px (earlier prototypes' checks; this prototype's check
found label-box overlaps and low-contrast muted text, fixed with tighter labels, brighter muted ink, button gradients
and scrims, **but a final re-run of the contrast/overlap probe did not complete before the session limit**).

## Not done (next)

Video capture and frame timing, 200% text and reduced-motion screenshots of this prototype, the final contrast re-run,
all-worlds visual review, and any route migration. No real-device, screen-reader, haptic-hardware or user testing.
Measures of Buddy value (setup completion, taps per set, time to change a plan, follow-through) are defined in the
earlier lab notes and still need instrumentation.
