# Adaptive Training Intelligence v1

## Product boundary

VAYVOR uses deterministic rules over records the person deliberately enters. It does not claim wearable recovery data, medical diagnosis, injury treatment, or proprietary training science. Suggestions are previews; the person must accept, modify, or dismiss them.

## Readiness

The pre-session check-in asks for 1–5 ratings for sleep, soreness, energy and stress, plus available time and an optional aggravating movement. The score is an explainable arithmetic summary. Rules are evaluated in this order:

1. an aggravating movement suggests a same-intent swap;
2. insufficient time suggests trimming lower-priority exercises;
3. a score at or below 30 suggests about 10% less load;
4. a score at or below 40 suggests one fewer working set;
5. otherwise the original plan remains.

Neutral midpoint ratings (3/5 across the four signals) keep the original plan unless available time or an aggravating movement creates a separate reason to change it. No suggestion is applied until confirmation. The original input, suggestion, reason and decision remain on the session. A lower-load acceptance also lowers previous-value placeholders by 10% when the new session did not yet contain explicit weights. Session elapsed time starts only after the person accepts, keeps, or skips the check-in, so setup time is not counted as training time.

## Adaptation

Per-exercise suggestions use completed/partial session facts, never private notes:

- `never` or unavailable-equipment feedback suggests a swap;
- a gap of at least 21 days suggests a conservative 10% return reduction;
- at least two successful exposures at the top of the rep range without maximal effort can suggest the configured load increment;
- repeated maximal/failure evidence can suggest 5% less, but only after at least three observations;
- “less next time” can suggest one fewer set;
- otherwise the target is held while evidence builds.

Confidence is labelled early/developing/established. A deload signal needs strain evidence in at least three recent sessions; one poor day never triggers it. Program template edits create recoverable revisions.

## Logging and insight

Sessions support warm-up, working, drop and failure sets; RIR/RPE; notes; preference signals; reordering; swaps; undo; pause/resume; and inline prior values. Estimated 1RM PRs use the Epley estimate and are labelled estimated. Warm-up ramps and a 20 kg-bar plate calculator are convenience estimates.

Weekly muscle sets come from the editable muscle label attached to the workout. Failure/maximal-effort sets receive a modest 1.3 fatigue weight. This is a workload summary, not a measurement of physiological fatigue. Readiness/completion associations are withheld until at least six usable observations with both higher- and lower-readiness days, and are explicitly non-causal.

## Authored workout library

Version `2026.10.1` contains 12 authored sessions and four programmes (4–8 weeks), spanning new, returning and experienced users; 2–4 day structures; strength, muscle, fitness and return goals; home/gym/anywhere; and time/equipment constraints. Exercises reference only IDs present in VAYVOR’s licensed catalogue. No commercial programme was copied and no scraped media is bundled.

Workout copies retain source workout/version metadata. Users can start, save, schedule, favourite, edit, restore revisions and enrol once into a programme. Programme installation cleans up partial local template copies if persistence fails.

## Gym Mode and web-platform limits

Gym Mode is a heads-up logging surface: one exercise/current set, previous/current/next rail, large input targets, fast completion/undo/skip/swap/note/pause/end, rest takeover and on-demand form media. Screen Wake Lock, speech and vibration are optional capability-detected browser APIs. Unsupported or denied states remain visible and sessions continue normally. The wake sentinel is released on cleanup.

Gym locations are explicit opt-in coordinates/radius, checked only when the person taps. This web app does not claim background geofencing or auto-launch. Spotify/Apple Music URLs are validated and opened in the provider; VAYVOR does not embed or control playback without provider OAuth/SDK entitlements.

## Live Pulse and challenges status

No counts, opponents, milestones or activity are fabricated. Live Pulse currently shows only the truthful local “you are training” state and says aggregate presence is unavailable.

A production Live Pulse should use an authenticated Supabase Realtime Presence channel with opaque user IDs, coarse audience scope, heartbeat expiry/TTL, explicit opt-in, offline/unmount cleanup, and block/mute enforcement before aggregation. It must never broadcast names, exact location, detailed sets, notes or health fields.

Existing challenges remain server-backed and authenticated. Future 1v1/group expansion should use RLS-protected challenge/member/score-event tables, auditable scoring modes (plan consistency, personal improvement percentage, active minutes, completed sessions), expiry/realtime events, consented milestone sharing and anti-cheat/data-quality flags. Raw weight/bodyweight should not be the default comparison. Empty/invite states are required when no real opponent exists.
