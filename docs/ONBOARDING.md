# Setup journey (quick start)

Source: `src/routes/onboarding.tsx`, `src/domain/onboarding.ts`, `src/components/onboarding/`.

## The path: 8 screens, one decision each

| # | Screen | Decision | Why it is here |
|---|--------|----------|----------------|
| 1 | Outcome | strength / muscle / fitter / lose weight / not sure | programme style and rep ranges |
| 2 | Experience | new / returning / some / experienced | how much we start with |
| 3 | Safety (optional) | 18+ confirmation, movements to leave out, free note, "clinician limited my exercise" | the generator refuses adults-only or clinician-restricted cases rather than guessing |
| 4 | Days | 2-7 weekdays | schedule |
| 5 | Time | 30 / 45 / 60 / 75 min | exercises per session |
| 6 | Kit | place, then tick equipment | only doable exercises |
| 7 | Your plan | none (review) | generated first week, "why this", first-day dry run |
| 8 | Start | name (optional), handle (only when signed in) | review with Change links, data-location explanation, start |

Optional, never required: a "Make it yours" screen (colour world and companion) reachable from screen 8.
Scripted run on the production build: about 7 s with defaults (a person takes roughly 45-90 s).

## What was removed or deferred (audit of the previous wizard)

The old wizard had 5 screens and ~25 inputs. For the first credible plan it asked, before any value:
timezone (now auto-detected), six "areas" including faith (now defaults; never asked), nutrition
approach and dietary needs, sleep and work hours, quiet hours, reminder intensity, deeper physiology,
and the companion and colour. Those were duplicate, premature or unclear-consequence questions.
All are still available later (Settings, and Today's setup path suggests them one at a time):
food style, sleep and work, mindset, faith and reflection (optional, never assumed), crews,
music/health/location connections, notifications, colour world and companion.

## Behaviour

- Resumable: every change autosaves to `localStorage` (`vayvor:onboarding:v2`); a validated parser
  rejects old or tampered drafts. Reload resumes; "Start over" clears it.
- Deep links and the browser Back/Forward button work (`?s=<step>`); a link past an unanswered
  screen is corrected to the furthest valid screen. Nothing is lost going back.
- Sensitive screens have "Why we ask", skip, and a local-storage statement; nothing infers religion,
  health, gender or goals; no goal, level or place is pre-selected.
- Accounts: local-first. The start screen says what signing in unlocks (sync, backup, crews) and links
  to sign in, with the draft kept. When accounts are not configured (this build) it says so; it never dead-ends.
- Start accepts the generated first-week plan (same generator and atomic accept as the plan builder).
- Mobile first: the action bar sits at the bottom (thumb zone), 44-52 px controls, radios are real inputs
  (keyboard: Tab, arrows, Enter), reduced-motion removes the progress-tick transition, 200% text wraps.
