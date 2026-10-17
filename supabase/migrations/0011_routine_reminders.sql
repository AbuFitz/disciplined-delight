-- VAYVOR: allow deliberately opted-in routine activities in the existing Web Push schedule.
-- The client still computes dates, one-off moves, pauses, completion state and quiet hours; the server only
-- stores and delivers the resulting short rolling window.

alter table public.scheduled_reminders
  drop constraint if exists scheduled_reminders_kind_check;
alter table public.scheduled_reminders
  add constraint scheduled_reminders_kind_check
  check (kind in ('prayer', 'training', 'food', 'routine'));
