-- Admin: live presence tracking (who is online / who just left and for how long)
-- + admin access to Storage buckets (upload / list / delete from the admin page).

-- ───────── 1) user_sessions ─────────
create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at     timestamptz,
  page         text
);

create index if not exists user_sessions_user_started_idx on public.user_sessions (user_id, started_at desc);
create index if not exists user_sessions_last_seen_idx    on public.user_sessions (last_seen_at desc);

alter table public.user_sessions enable row level security;

drop policy if exists user_sessions_insert_own on public.user_sessions;
create policy user_sessions_insert_own on public.user_sessions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_sessions_update_own on public.user_sessions;
create policy user_sessions_update_own on public.user_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_sessions_select_own_or_admin on public.user_sessions;
create policy user_sessions_select_own_or_admin on public.user_sessions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Timestamps are always server-side so client clock drift can't skew durations.
create or replace function public.user_sessions_touch()
returns trigger
language plpgsql
as $$
begin
  new.started_at   := old.started_at;
  new.last_seen_at := now();
  if new.ended_at is not null and old.ended_at is null then
    new.ended_at := now();
  elsif old.ended_at is not null then
    new.ended_at := old.ended_at;
  end if;
  return new;
end;
$$;

drop trigger if exists user_sessions_touch_trg on public.user_sessions;
create trigger user_sessions_touch_trg
  before update on public.user_sessions
  for each row execute function public.user_sessions_touch();

-- ───────── 2) admin_presence() ─────────
create or replace function public.admin_presence(p_hours int default 24)
returns table (
  user_id      uuid,
  full_name    text,
  username     text,
  role         text,
  branch       text,
  started_at   timestamptz,
  last_seen_at timestamptz,
  ended_at     timestamptz,
  page         text,
  server_now   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select s.user_id, p.full_name, p.username, p.role, p.branch,
           s.started_at, s.last_seen_at, s.ended_at, s.page, now()
    from public.user_sessions s
    left join public.profiles p on p.id = s.user_id
    where s.last_seen_at >= now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 168)))
    order by s.user_id, s.started_at;
end;
$$;

revoke all on function public.admin_presence(int) from public, anon;
grant execute on function public.admin_presence(int) to authenticated;

-- ───────── 3) Storage: admin can manage files in every bucket ─────────
drop policy if exists admin_storage_select on storage.objects;
create policy admin_storage_select on storage.objects
  for select to authenticated using (public.is_admin());

drop policy if exists admin_storage_insert on storage.objects;
create policy admin_storage_insert on storage.objects
  for insert to authenticated with check (public.is_admin());

drop policy if exists admin_storage_update on storage.objects;
create policy admin_storage_update on storage.objects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_storage_delete on storage.objects;
create policy admin_storage_delete on storage.objects
  for delete to authenticated using (public.is_admin());
