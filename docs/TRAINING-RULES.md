# Training rules (draft, `RULES_VERSION = 2026.1-draft`)

**Status: not reviewed by a qualified coach or clinician.** The generator is built from widely used, general
resistance-training guidance. Do not present it as a public template library, or as advice for people with
medical conditions, until that review has happened. Source of truth: `src/domain/programmes.ts` and `src/domain/planner.ts`.

## Scope

- Healthy adults only. The builder asks for confirmation of both; if either is not given, no plan is generated.
- No loads are ever assigned. Bodyweight and past numbers cannot determine a safe starting weight. The plan gives an effort
  target instead (leave about 3 reps in reserve when new, about 2 otherwise).

## Structure

| Days | Programme                          | Notes                                  |
| ---- | ---------------------------------- | -------------------------------------- |
| 2    | Full body ×2                       |                                        |
| 3    | Full body ×3                       | at least one rest day between sessions |
| 4    | Upper / lower ×2                   |                                        |
| 5    | Push / pull / legs + upper + lower |                                        |

New users are capped at 3 days, returning users at 4, and told why.

## Numbers (all in `programmes.ts`)

- Reps: compound 6–10 (build), 4–6 (strength), 8–12 (general), 10–15 (return); isolation 8–15.
- Sets: 3 for main work (2 for returning/new accessories, 2 for "get back into it"), never more than 4.
- Rest: 30 s–3 min by role and goal.
- Exercises per session: 5 (new), 6 (returning), 8 (some experience), dropping the lowest-priority slots first.
- Weekly hard-set guard rails per muscle: **4–10 new and returning, 8–18 experienced.** These are the original bounds. They
  are not widened to make warnings disappear.

### How weekly sets are counted (and what the beginner warning turned out to be)

The first version warned that a beginner plan gave glutes about 17 hard sets a week against a limit of 10. Investigation
found three causes, none of which was the limit being too low:

1. **Counting.** Upstream lists several "primary" muscles for one lift (a squat lists quads, glutes and hamstrings) and each
   was credited in full. Compound patterns now use `PATTERN_CREDIT`: squat and lunge give quads 1 and glutes 0.5; hinge gives
   glutes 1 and hamstrings 1; presses and rows give the main muscle 1 and helpers 0.5. Isolation work credits primary muscles 1
   and secondary 0.5.
2. **Classification.** Hip thrusts, back extensions and similar were filed as "hinge", so they filled the main hinge slot.
   They are now "glute" accessories; the hinge slot is deadlift/RDL-type work.
3. **Selection.** After picking, `balanceVolume` trims the least important contributors (a set at a time, then whole
   accessories) until every muscle is within its bound. If only main lifts remain over the bound the warning stays.
   Result: the three beginner fixtures (full gym, dumbbells and bench, bodyweight) now have no volume warnings and glutes sit at
   the 10-set ceiling. Gentle two-day plans give lower weekly totals by design and are reported as "light" if they fall under
   the lower bound. All the credits and bounds are draft numbers and need the qualified review below.

## Selection

Only **curated** catalogue exercises are used (see `docs/CATALOGUE.md`), only equipment the person has, and only `new`-level
ones unless the person says they have some experience. There are no name-based exclusion lists in code. Ties break by a
stable hash, so the same inputs and seed give the same plan. Favourites and logged history are preferred; repeats across
the week are penalised. "Try a different mix" changes the seed.

## Accepting a plan

`assessPlan` is the only gate for "Use this plan" and is recomputed from the plan as it stands after every swap, removal or
fill. It blocks on: a main-lift slot with nothing in it (and not deliberately left out for time or volume), a session with no
exercises, a session longer than the requested time (when even the shortest version does not fit), unknown or unavailable
exercises, duplicates, or any starting load. Each blocker comes with fixes: choose an exercise for the slot, add the equipment
that would unlock options, or allow more minutes. Warnings (volume, recovery) never block.

## Adjustments

- Short on time: pair antagonists into supersets, then drop lowest-priority exercises, then trim sets (never below 2, never the main lifts).
- Machine busy / can't do it: same movement pattern, overlapping muscles, equipment you have.
- Missed a session: move to the first free day this week that keeps the gap (measured across Sunday into Monday), otherwise skip. Volume is never "made up".
- Recovery: whole-body sessions on consecutive days, including Sunday and Monday, raise a warning.

## Needs qualified review before wider release

Rep/set/rest numbers, weekly-set bounds and `PATTERN_CREDIT`, the curated exercise list and each exercise's `new`/`some` level, beginner caps, return-to-routine volumes,
and the wording of the health confirmations. Residual catalogue misclassifications are fixed in `catalogue/overrides.json`.

## Media

wger images are licensed, self-hosted copies with original source and attribution metadata, so reviewed catalogue media can be cached
offline without large opaque-response quota costs. Text, sets and logging work offline. The catalogue pipeline preserves
the CC-BY-SA attribution and human-reviewed exclusions on refresh.
