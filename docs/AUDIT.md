# New Life — audit and rebuild plan

Audited 16 Oct 2026 against the repository at commit `720093e`.

## Repository

- `disciplined-delight` is the fitness app (package name `new-life`). Stack as installed: TanStack Start 1.168 / Router 1.170, React 19.2, Vite 8, Tailwind 4.2, Radix/shadcn, Recharts 2, Supabase JS 2.112, bun, Nitro (Vercel preset). **The stack is retained.**
- `NEWLIFE` (Next.js) is a different coaching app and was not touched. The OneSimpleSite repo was not used as the app.
- Baseline: `bun run build` succeeds. `eslint .` hangs because it scans `.vercel/output`, so lint is now `eslint src`.
- OneSimpleSite skill suite / `ONESIMPLESITE_CONTEXT.md` was **not available in this session**; the repo's real conventions were followed.

## Findings

| Area        | Finding                                                                                                                                                                                                                        | Resolution                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Dates       | `new Date().toISOString().slice(0,10)` in tracker, progress, workouts: UTC date, wrong around midnight/BST                                                                                                                     | `domain/dates.ts` (explicit IANA tz), tested across DST                                                                    |
| Storage     | Three localStorage keys: `sunrise-strength-tracker-v1`, `sunrise-strength-schedule-v2`, `new-life-shopping-checklist-v1`. Nothing else. Sign-in disabled, so **all real data is only on the browser at the deployment origin** | IndexedDB store; legacy keys read, never deleted                                                                           |
| Writes      | Remote writes are fire-and-forget (`.then()` with no error handling); local state is not tied to the write                                                                                                                     | Atomic record + outbox transaction                                                                                         |
| Auth        | `AuthGate` disabled; hooks pick DB vs local per render from `user`, risking wrong-scope loads                                                                                                                                  | New sync status model; guest stays local until user opts in                                                                |
| Legacy logs | One weight string + `done` per exercise per day; no sets or reps                                                                                                                                                               | Kept as `legacyDays`; never expanded                                                                                       |
| Progression | `getNextSessionTarget` reads only the **last set**, fixed +2.5 kg, rpe optional                                                                                                                                                | Replaced by set-aware `domain/progression.ts`                                                                              |
| TDEE        | Uses 2,760 (also the intake target) as fallback; "14 entries" counts dates, not coverage                                                                                                                                       | Replaced by `domain/tdee.ts`: ≥21 days, ≥70% fully logged, ≥6 weigh-ins over ≥14 days, range shown, else "Not enough data" |
| Reset       | Settings "reset" deletes every `daily_logs` row with `confirm()`                                                                                                                                                               | Scoped, recoverable data management (tombstones + backup)                                                                  |
| Schema      | `0001_init.sql`: RLS on all six tables, ownership via `auth.uid()`. No storage bucket, no photos. `pr_records` unused by client. Policies use `for all` without `to authenticated`                                             | Kept; new sync schema added separately (not applied)                                                                       |
| Prayer      | Fixed Fajr 03:14 in the default schedule (a summer value; Fajr today is ≈05:52)                                                                                                                                                | Archived on migration; real Salah module                                                                                   |
| Targets     | 2,760 kcal etc. are hard-coded display constants                                                                                                                                                                               | Migrated as **provisional** with source label                                                                              |
| PWA         | No manifest, no service worker, no icons                                                                                                                                                                                       | Milestone 5                                                                                                                |
| Layout      | Global phone-width shell                                                                                                                                                                                                       | Replaced in Milestone 2                                                                                                    |

## AlAdhan contract (verified 16 Oct 2026)

`GET https://api.aladhan.com/v1/calendarByCity/{year}/{month}?city&country&method&school&latitudeAdjustmentMethod` returns `data[]` with `date.gregorian.date` (`DD-MM-YYYY`), `timings.{Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha}` as `"HH:MM (BST)"`, and `meta.method`. `/v1/methods` lists ids (e.g. 15 Moonsighting Committee, 2 ISNA, 3 MWL). It is calculated, so it may differ from a mosque timetable; manual entry is supported.

## Staged plan

1. Audit + domain core + store + migration (tests) ✅
2. Design system, shell, Today, active workout, meal log
3. Programme/recipe/day-template editing, week planner, shopping + budget
4. Salah and progress
5. Sync, backup/import, PWA, reminders
6. Verification and handoff
