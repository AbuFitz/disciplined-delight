# Daily routines (Phase 3)

One pure engine, `src/domain/routine.ts`, turns the day's records into an agenda; `src/data/agenda.ts` feeds it live data.

**Activities** are `RoutineBlock`s (repeating, by weekday, optionally relative to a prayer) plus two built-in rows: the five
prayers (when Salah is on) and the planned workout. Each block has a `link` saying what completes it:

| Link    | Done when                                             |
| ------- | ----------------------------------------------------- |
| manual  | you tick it (`routineDone` record)                    |
| workout | a session for that workout is completed               |
| prayer  | that prayer is logged                                 |
| meal    | any meal is logged that day                           |
| mind    | a check-in, reflection or focus entry exists that day |

A linked activity is done because the **real record exists**, so finishing the real thing updates the routine exactly once
and there is nothing separate to tick. If a linked block stands for a prayer or the workout, the default row for it is not
shown twice.

**Statuses:** upcoming, now, done, skipped, missed, rest. Prayers stay "now" until the next prayer starts; Isha until the
end of the day. A workout with no time is "any time today" and is only missed once the day has passed.

**Changes never edit the series:** skip, rest day and move (to another time or day) are one-off exceptions keyed by
block and date; ticks and skips are per-date completions; pause/resume sets `pausedFrom`/`pausedUntil` on the block.
Corrections: clear the tick or the exception; a linked activity is corrected by undoing the real record (prayers can be
un-logged from Today; mind entries are deleted in History).

**Time:** every comparison uses wall-clock minutes in the person's timezone (prayer settings, else profile, else the
device). The agenda for another date reads as past (missed) or future (upcoming) rather than by today's clock. Late-evening
blocks (sleep) continue past midnight into the next day. On DST days a time skipped by clocks going forward reads as
missed rather than "now" forever, and a repeated hour shows each activity once. Tested in `routine.test.ts`.

**Building around a real day:** `planRoutine` places activities at one start time that is free on every chosen weekday,
avoiding sleep, work, existing activities and prayer times (with 10 minute buffers), preferring the chosen part of the day.
What cannot fit is reported with the weekdays where it would, never overlapped.

**Spaces:** Today (next action + timeline), Body (training, food, shopping, progress, library), Mind (check-in, reflect,
focus, history), Soul (optional Salah, reflection), Circle (connections, deliberate sharing, chat, pacts, games and small
crews; no pretend people or scores). Old URLs
(`/train`, `/food`, `/salah`, `/progress`, `/plan`, `/schedule`, `/workouts`, `/nutrition`, `/library`) still work and light
up their space in the navigation.

**Limits:** a skipped/rested default workout is per date and does not change the weekly plan; moving a workout to another
day is done from the week planner. Meals link to "any meal logged", not to a named meal slot.

**Routine reminders:** each actionable routine block can opt into a start-time reminder (at the start or 5–60 minutes
before). Scheduling uses the expanded agenda, so prayer-relative times, one-off moves, skips, rest days, pauses and real
linked completions are honoured. Work and sleep remain context and cannot schedule reminders. Quiet hours apply, and a
subscribed device refreshes its rolling 48-hour server schedule after successful sync. Delivery is still best effort and
requires the optional Web Push setup described in `docs/SUPABASE-SETUP.md`.
