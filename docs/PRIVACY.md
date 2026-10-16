# What is private in VAYVOR, and how that is enforced

Private by default: **journals and reflections, mood and energy check-ins, focus notes, and prayer settings, times and
logs.** Nothing social exists yet (Circle is not built), and the rule for when it does is that none of the collections
below may ever be read by it.

| Data                                                   | Collection                                                                        | Who can read it                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| Check-ins, reflections (Mind and Soul), focus sessions | `mind` (every entry carries `visibility: "private"`; the save function forces it) | You, on your device and in your own account |
| Salah setup, cached times, prayer logs                 | `prayerSettings`, `prayerDays`, `prayerLogs`                                      | You                                         |
| Whether you turned Salah on                            | `modules`                                                                         | You                                         |

`PRIVATE_COLLECTIONS` in `src/data/types.ts` lists them so future social code can refuse them by name.

- **On the device:** one IndexedDB database per account (guest data is separate and is never merged without a prompt).
- **In the cloud (when signed in and sync is configured):** rows are written only through `push_mutation` and are readable
  only by their owner (row-level security). The SQL tests check that a second user cannot read another user's `mind` or
  prayer rows (`supabase/tests/sync_rls.test.sql`). Run on a simulated auth schema, not yet on a real project.
- **Not end-to-end encrypted.** Supabase (and so anyone with access to the project's database) can technically read synced
  rows. If that is not acceptable for journals, they must stay unsynced on a device: that option is not built.
- **Backups** you export contain these collections in plain JSON. Treat the file as sensitive.
- Salah is optional: with it off nothing about prayer is shown, scheduled or logged.
