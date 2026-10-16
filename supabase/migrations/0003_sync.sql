-- VAYVOR: multi-device sync.
--
-- One generic table holds every synced record (training, food, prayer logs, settings, ...), keyed by
-- (user, collection, id). The app is local-first: this is a backup/sync target, never the only copy.
--
-- Writes happen ONLY through public.push_mutation(), which gives:
--   * optimistic concurrency: a mutation applies only if its base revision matches (otherwise 'conflict'),
--   * idempotent retries: a mutation id applied once is never applied twice,
--   * soft deletes (tombstones) so deletes sync and can be undone.
-- Clients get read-only table access guarded by row-level security. Nothing here uses a service role.
--
-- The earlier tables from 0001/0002 are left untouched (archive, don't drop): nothing in the new client uses them.

create sequence if not exists public.records_seq;

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (char_length(collection) between 1 and 64),
  id         text        not null check (char_length(id) between 1 and 200),
  data       jsonb,
  rev        bigint      not null default 1,
  seq        bigint      not null default nextval('public.records_seq'),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);
create index if not exists records_user_seq on public.records (user_id, seq);

create table if not exists public.mutation_log (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  mid        text        not null check (char_length(mid) between 1 and 100),
  applied_at timestamptz not null default now(),
  primary key (user_id, mid)
);

alter table public.records enable row level security;
alter table public.mutation_log enable row level security;

drop policy if exists "read own records" on public.records;
create policy "read own records" on public.records
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own mutation log" on public.mutation_log;
create policy "read own mutation log" on public.mutation_log
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.records, public.mutation_log from public, anon, authenticated;
grant select on public.records, public.mutation_log to authenticated;
revoke all on sequence public.records_seq from public, anon, authenticated;

create or replace function public.push_mutation(
  p_collection text,
  p_id         text,
  p_op         text,
  p_data       jsonb,
  p_base_rev   bigint,
  p_mid        text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur public.records%rowtype;
  inserted int;
  new_rev bigint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_op not in ('put', 'delete') then
    raise exception 'unknown operation %', p_op using errcode = '22023';
  end if;
  if p_data is not null and pg_column_size(p_data) > 1048576 then
    raise exception 'record too large' using errcode = '54000';
  end if;

  insert into public.mutation_log (user_id, mid) values (uid, p_mid) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    select * into cur from public.records where user_id = uid and collection = p_collection and id = p_id;
    return jsonb_build_object('status', 'duplicate', 'rev', coalesce(cur.rev, 0));
  end if;

  select * into cur from public.records
   where user_id = uid and collection = p_collection and id = p_id for update;

  if not found then
    if p_op = 'delete' then
      return jsonb_build_object('status', 'applied', 'rev', 0);
    end if;
    insert into public.records (user_id, collection, id, data) values (uid, p_collection, p_id, p_data);
    return jsonb_build_object('status', 'applied', 'rev', 1);
  end if;

  if cur.rev <> p_base_rev then
    -- Not applied: forget the mutation id so the client can resolve and retry.
    delete from public.mutation_log where user_id = uid and mid = p_mid;
    return jsonb_build_object('status', 'conflict', 'rev', cur.rev, 'data', cur.data, 'deleted', cur.deleted_at is not null);
  end if;

  new_rev := cur.rev + 1;
  update public.records
     set data = case when p_op = 'put' then p_data else data end,
         deleted_at = case when p_op = 'delete' then now() else null end,
         rev = new_rev,
         seq = nextval('public.records_seq'),
         updated_at = now()
   where user_id = uid and collection = p_collection and id = p_id;
  return jsonb_build_object('status', 'applied', 'rev', new_rev);
end;
$$;

revoke all on function public.push_mutation(text, text, text, jsonb, bigint, text) from public, anon;
grant execute on function public.push_mutation(text, text, text, jsonb, bigint, text) to authenticated;
