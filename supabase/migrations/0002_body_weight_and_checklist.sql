-- Two additions needed by the client that weren't in the original schema:
-- 1. Daily body weight / calories check-in (powers the adaptive-TDEE estimate).
-- 2. The shopping checklist, stored as a simple id->checked map on user_settings.
alter table public.daily_logs
  add column if not exists body_weight_kg numeric,
  add column if not exists calories_logged integer;

alter table public.user_settings
  add column if not exists shopping_checklist jsonb not null default '{}'::jsonb;
