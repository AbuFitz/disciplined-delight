# Buddy: character, interaction and state specification

## Character and voice

Buddy is an optional VAYVOR companion, not a therapist, authority figure or open-ended chatbot. The visual direction is an ownable, ungendered and culturally neutral silhouette that reads at 64–160 px in dark and light themes. It should feel mature and premium—never babyish, anime, humanoid-gendered or robotic. The first exploratory ImageGen sheet is explicitly rejected as final production art and is not included in the app.

Voice is concise, autonomy-supportive and factual. It offers one achievable choice, explains why, and never shames, diagnoses, invents health claims, implies a relationship, infers faith, or treats a missed day as a broken streak. Approved tones are quiet, direct and warm; all share the same safety rules.

## Interaction model

- During setup, Buddy explains why the current question exists and which downstream choice it changes. Back, skip and edit-later remain visible. The final step previews the selected fit; safety-relevant answers switch to a non-diagnostic clinician/qualified-trainer gate.
- After setup, the deterministic state machine surfaces at most one next action from coarse app state. It can link to a relevant screen; it cannot hold an open-ended conversation.
- The state priority is sync/error, offline, active workout, completion/milestone, planned workout, meal planning, focus, recovery, idle. Module permissions and quiet hours are checked before any message.
- Status-only privacy means Buddy cannot read journal or prayer content, health notes, passwords/tokens, account content or workout notes.

## Curated customisation

People can choose a name; one of three base forms (orb, totem, spark); mint, amber or violet contrast-safe palettes; calm, bright or focused expression; quiet/direct/warm tone; low/medium/high energy; off/gentle/full motion; off/subtle/full celebration; setup/dashboard/on-demand placement; topic permissions; and quiet hours. A live preview and reset are available. Core choices are never paywalled. Future accessories may acknowledge positive milestones, but must never be tied to streak punishment.

The current shapes are CSS integration primitives, not final character art. Production state art should be commissioned only after this inventory is approved: idle, listening/setup-guide, explaining-why, conflict-repair, active, planned, celebration, recovery, offline and sync-attention. Every animated state needs a static reduced-motion equivalent and screen-reader text.
