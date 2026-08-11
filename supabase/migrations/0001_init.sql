-- New Life — initial schema
-- Mirrors the current localStorage shape (use-tracker-state, use-schedule-state,
-- use-workout-mode) so the client hooks can be swapped over without a data
-- model rewrite. Run this once against a fresh Supabase project, then set
-- VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the app's environment.

-- Per-user app settings (workout mode + which tab is active).
create table if not exists public.user_settings (
  id uuid primary key references auth.users (id) on delete cascade,
  workout_mode text not null default 'week' check (workout_mode in ('week', 'day')),
  active_workout_tab text not null default 'a',
  updated_at timestamptz not null default now()
);

-- One row per user per calendar day.
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  cardio_done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- Per-exercise entry within a day (weight logged + done toggle).
create table if not exists public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  exercise_id text not null,
  done boolean not null default false,
  weight text,
  unique (daily_log_id, exercise_id)
);

-- Per-supplement checkbox within a day.
create table if not exists public.supplement_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  supplement_id text not null,
  done boolean not null default false,
  unique (daily_log_id, supplement_id)
);

-- Best weight/reps ever logged per exercise — powers PR tracking on /progress.
create table if not exists public.pr_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  best_weight numeric,
  best_reps int,
  achieved_at date not null default current_date,
  unique (user_id, exercise_id)
);

-- Editable schedule steps (Fajr, gym, work, etc.) — mirrors ScheduleStep.
create table if not exists public.schedule_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text,
  label text not null,
  start_time text not null,
  end_time text,
  approx boolean not null default false,
  highlight boolean not null default false,
  note text,
  sort_order int not null
);

alter table public.user_settings enable row level security;
alter table public.daily_logs enable row level security;
alter table public.exercise_entries enable row level security;
alter table public.supplement_entries enable row level security;
alter table public.pr_records enable row level security;
alter table public.schedule_steps enable row level security;

create policy "own settings" on public.user_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own daily logs" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own exercise entries" on public.exercise_entries
  for all using (
    auth.uid() = (select user_id from public.daily_logs where id = daily_log_id)
  ) with check (
    auth.uid() = (select user_id from public.daily_logs where id = daily_log_id)
  );

create policy "own supplement entries" on public.supplement_entries
  for all using (
    auth.uid() = (select user_id from public.daily_logs where id = daily_log_id)
  ) with check (
    auth.uid() = (select user_id from public.daily_logs where id = daily_log_id)
  );

create policy "own pr records" on public.pr_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own schedule steps" on public.schedule_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a settings row the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
