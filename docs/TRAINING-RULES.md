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
- Weekly hard-set guard rails per muscle (primary = 1, secondary = 0.5): 4–14 new/returning, 8–20 experienced. These produce warnings, not blocks.

## Selection

Only catalogue exercises in the `generator` tier (licensed, English instructions, a primary muscle, a known movement pattern),
only equipment the person has, never exercises matching `AUTO_AVOID` (high-skill or commonly risky movements such as
behind-neck work, Olympic lifts, kipping) and, unless experienced, `ADVANCED_ONLY`. Ties break by a stable hash, so the same
inputs and seed give the same plan. Favourites and logged history are preferred; repeats across the week are penalised.

## Adjustments

- Short on time: pair antagonists into supersets, then drop lowest-priority exercises, then trim sets (never below 2, never the main lifts).
- Machine busy / can't do it: same movement pattern, overlapping muscles, equipment you have.
- Missed a session: move to the first free day that keeps the gap, otherwise skip. Volume is never "made up".

## Needs qualified review before wider release

Rep/set/rest numbers, weekly-set bounds, the `AUTO_AVOID` and `ADVANCED_ONLY` lists, beginner caps, return-to-routine volumes,
and the wording of the health confirmations. Residual catalogue misclassifications are fixed in `catalogue/overrides.json`.

## Media

wger images are licensed, self-hosted copies with original source and attribution metadata, so reviewed catalogue media can be cached
offline without large opaque-response quota costs. Text, sets and logging work offline. The catalogue pipeline preserves
the CC-BY-SA attribution and human-reviewed exclusions on refresh.
