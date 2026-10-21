# Design rationale: the living training ledger

**Voice.** Plain, concrete, calm. One useful next step. Never shaming, never presuming belief.

**Signature move.** The training ledger: ruled structure, thin rules instead of boxes, tally
marks as progress, exercise frames with their own baseline, and a companion that stands on
that baseline. Celebration is a tally mark being struck, not confetti by default.

**Typography.** Funnel Display for large, tight headings; Hanken Grotesk for body; DM Mono for
numerals and eyebrows. Large numerals carry meaning (loads, reps, time).

**Colour roles.** canvas (`--background`), ink (`--foreground`), surface (`--surface`), rule
(`--line`), accent and action (`--primary`). The person's colour world sets accent and action;
panel tints and the page glow are derived from it with `color-mix`, so no world is privileged.
Default world is cobalt, not green. Seven worlds, each audited for light and dark contrast.

**Geometry.** Tight radius (0.4rem base), rules over cards, no nested boxes, no icon circles as
decoration, no stock photography. Workout cards use exercise media or original form diagrams.

**Media.** Local, rights-tracked assets only (`catalogue/rights-manifest.json`, guarded by
`npm run catalogue:rights`). Badges are truthful: Motion, N illustrated steps, Illustration,
No demo yet. Static WebP is never called animated.

**Spacing.** 4px grid; 44px minimum targets; content width capped for reading.

**Motion.** Communicates state, hierarchy and feedback. Transform/opacity only, paused
off-screen, still poses under reduced motion.

## Verified / provisional / blocking

- Verified: unit tests for domain logic; headless Chromium renders at 390 and 1280, light and dark.
- Provisional: contrast on every colour world pairing at 200% text; meals photos provenance.
- Blocking (external): VAYVOR Supabase project, provider credentials, real-device and screen-reader testing, licensed motion bundle.

## Completion criteria

tsc, eslint, full vitest, `catalogue:media:check`, `catalogue:rights`, production build, and
screenshot review at 320/390/768/1440, light/dark, reduced motion and 200% text with no overlap.

## Design reset (mobile first)

Principles taken from outside fitness, translated, not copied: calm navigation that recedes (Linear), a
mode-aware bottom stack and companion rail that adapt to the screen (Arc), immediate actions and one
primary control per screen (Raycast), exposed-but-simple system logic and precise controls (Teenage
Engineering). The result is a living personal instrument over a training ledger.

- One quiet canvas; chrome is solid with a single rule: no blur, glow or drop shadow (`.spatial-glass` is now flat).
- Mobile tabs show at most five slots plus "More" (a sheet); nothing is hidden in a sideways scroll.
- Today leads with the next meaningful action; the daily signal becomes a compact 2-column ledger below it.
- Reserved bottom stack (resume bar, companion, tabs) so nothing floats over content; screens that need
  a persistent bar (session rest and Finish) portal it into that reserved space (sidebar on desktop).
- Gym Mode is a fixed-height column: scrolling content above, a 96 px "Complete set" bar in the thumb zone,
  a rest screen with a giant timer and 80 px controls.
- Signature progress motion: the ledger tick that inks left to right (setup progress), and the tally mark struck on a celebration.
- Desktop is the same layout expanded: ledger rail, companion rail, and the expanded panel as a third column.
