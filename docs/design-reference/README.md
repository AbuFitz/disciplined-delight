# Design reference (not production)

Everything in this folder is **reference-only**. Nothing here is shipped, imported by the app, or
traced into code.

## Buddy family exploration (approved direction, not final sprites)

`buddy-family-exploration-v1.png` (to be dropped here by the product owner; the image was shared
in the working session but could not be written into the repository from there).

What the exploration establishes, and what the code follows:

- Four non-gendered variants with distinct silhouette, colour and motion personality:
  quick/curious (cobalt), cosy/calm (coral), bold/celebratory (amber), elegant/reflective (lilac).
- One shared, simple face: a dark face window with warm cream eyes and a tiny mouth; three short
  accent ticks on the forehead.
- Compact, readable, tactile silhouettes; cream body with one accent colour used for trim.

What the code does with it:

- `src/domain/buddy/variants.ts`: the four variants and their motion profiles.
- `src/domain/buddy/art.ts`: the art-pack interface and `provisional-v0`, a deliberately neutral
  geometric pack (labelled provisional everywhere it is shown). Bodies were **not** traced from the
  reference. Replace the pack with the approved production art; clips, state machine, haptics and
  settings do not change.
- `src/components/buddy/BuddyCharacter.tsx`: the renderer contract (rig parts `root`, `body`,
  `face`, `eyes`, `mouth`, `acc`, `shadow`).

## Rejected

The first anime/robot exploration and the Bell/Cairn/Plate gym-object bodies are rejected and not
used. A second mature material exploration is reference-only.
