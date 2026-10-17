# What is private in VAYVOR, and how that is enforced

Private by default: **journals and reflections, mood and energy check-ins, focus notes, and prayer settings, times and
logs.** Circle is built, but it uses separate social tables and may never read the private collections below. Workouts,
meals, weight and routines are not posted automatically either: a feed item exists only after the person writes and
shares it explicitly.

| Data                                                   | Collection                                                                        | Who can read it                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| Check-ins, reflections (Mind and Soul), focus sessions | `mind` (every entry carries `visibility: "private"`; the save function forces it) | You, on your device and in your own account |
| Salah setup, cached times, prayer logs                 | `prayerSettings`, `prayerDays`, `prayerLogs`                                      | You                                         |
| Whether you turned Salah on                            | `modules`                                                                         | You                                         |

`PRIVATE_COLLECTIONS` in `src/data/types.ts` lists them so future social code can refuse them by name.

Circle has a deliberately smaller shared surface:

| Data                                              | Who can read it                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| Handle and display name                           | Signed-in people using exact-handle or display-name search         |
| Connection requests and blocks                    | The affected accounts; block lists are shown only to their owner   |
| Manually written feed posts and kudos             | The author and accepted, unblocked connections                     |
| One-to-one chat                                   | The two accepted, unblocked participants                           |
| Pact invitations and self-reported check-ins      | The two accepted, unblocked participants                           |
| Four in a Row boards and self-authored dares      | The two accepted, unblocked participants                           |
| Crew purpose, active roster and weekly roll calls | Accepted crew members; blocked people are filtered from each other |

Blocking removes the connection and immediately makes its feed posts, chat, pacts and games unavailable in both directions.
If the block or connection removal is between a crew owner and member, that membership is removed; blocked ordinary crew
members cannot see each other's roster entry or roll call.
Deleting a sent chat message leaves an honest tombstone rather than pretending the record never existed.

- **On the device:** one IndexedDB database per account (guest data is separate and is never merged without a prompt).
- **In the cloud (when signed in and sync is configured):** rows are written only through `push_mutation` and are readable
  only by their owner (row-level security). The SQL tests check that a second user cannot read another user's `mind` or
  prayer rows (`supabase/tests/sync_rls.test.sql`). Run on a simulated auth schema, not yet on a real project.
- **Not end-to-end encrypted.** Supabase (and so anyone with access to the project's database) can technically read synced
  rows and chat messages. If that is not acceptable for journals, they must stay unsynced on a device: that option is
  not built. Do not use Circle chat for passwords, financial details, medical records or emergencies.
- **Backups** you export contain these collections in plain JSON. Treat the file as sensitive.
- **Background reminders are opt-in.** When enabled, the next 48 hours of reminder time, title, short body and destination
  are copied to the reminder service together with this device's push subscription. For a routine activity, that can
  include the activity name and optional notes, so do not put sensitive journal or medical detail in a reminder-enabled
  activity. The push provider receives each notification payload in order to deliver it.
- Salah is optional: with it off nothing about prayer is shown, scheduled or logged.
