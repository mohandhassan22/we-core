-- WE Target Manager: security + hierarchy + manager-written targets.
-- ALREADY APPLIED to production project iygwhapcpdmsasqlfelv on 2026-10-03 (four migrations, in this order).
-- Kept here as the record / to rebuild a fresh project. NOT idempotent: do not re-run on production.

-- ============================================================
-- 1) profiles: no more role/email escalation from the browser
-- ============================================================
drop policy if exists "authenticated can insert profiles" on public.profiles;
drop policy if exists "authenticated can update profiles" on public.profiles;
create policy "users update own profile name" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke truncate, references, trigger on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
-- NOTE: SELECT stays open to anon because login.js still reads email by username.
--       TODO: switch login.js to the hyper-task get_email action, then drop the anon SELECT policies.

-- ============================================================
-- 2) hierarchy: area -> area manager, branch -> branch manager
-- ============================================================
alter table public.areas    add column if not exists manager_id uuid references public.profiles(id) on delete set null;
alter table public.branches add column if not exists manager_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_areas_manager      on public.areas(manager_id);
create index if not exists idx_branches_manager   on public.branches(manager_id);
create index if not exists idx_branches_area      on public.branches(area_id);
create index if not exists idx_profiles_branch_id on public.profiles(branch_id);
create index if not exists idx_periods_user       on public.target_periods(user_id, year, month);
create index if not exists idx_perf_user_date     on public.daily_performance(user_id, performance_date);

-- role normalisation WITHOUT rewriting profiles.role (the site may depend on the raw values)
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.role is null then 'agent'
    when lower(btrim(p.role)) = 'admin' then 'admin'
    when lower(btrim(p.role)) in ('area_manager','area manager') then 'area_manager'
    when lower(btrim(p.role)) in ('branch_manager','store manager','manager') then 'branch_manager'
    when lower(btrim(p.role)) in ('agent','agant','user') then 'agent'
    else 'other' end
  from public.profiles p where p.id = auth.uid();
$$;
create or replace function public.my_managed_area_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.areas where manager_id = auth.uid(); $$;
create or replace function public.my_visible_branch_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select b.id from public.branches b
  where b.manager_id = auth.uid()
     or b.area_id in (select id from public.areas where manager_id = auth.uid())
     or b.id = (select branch_id from public.profiles where id = auth.uid()); $$;
create or replace function public.my_visible_area_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.areas where manager_id = auth.uid()
  union
  select b.area_id from public.branches b where b.id in (select public.my_visible_branch_ids()) and b.area_id is not null; $$;
create or replace function public.can_view_user(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    target = auth.uid() or public.is_admin()
    or exists (select 1 from public.profiles p
               join public.branches b on b.id = p.branch_id
               left join public.areas a on a.id = b.area_id
               where p.id = target and (b.manager_id = auth.uid() or a.manager_id = auth.uid()))); $$;

-- ============================================================
-- 3) who may WRITE targets: the employee's branch manager / area manager (or admin), never the employee
-- ============================================================
create or replace function public.can_manage_user(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or (target <> auth.uid() and exists (
      select 1 from public.profiles p
      join public.branches b on b.id = p.branch_id
      left join public.areas a on a.id = b.area_id
      where p.id = target and (b.manager_id = auth.uid() or a.manager_id = auth.uid())))); $$;

revoke all on function public.app_role(), public.my_managed_area_ids(), public.my_visible_branch_ids(),
  public.my_visible_area_ids(), public.can_view_user(uuid), public.can_manage_user(uuid) from public, anon;
grant execute on function public.app_role(), public.my_managed_area_ids(), public.my_visible_branch_ids(),
  public.my_visible_area_ids(), public.can_view_user(uuid), public.can_manage_user(uuid) to authenticated;

-- integrity
alter table public.target_periods
  add constraint target_periods_user_month_year_key unique (user_id, month, year),
  add constraint target_periods_month_chk check (month between 1 and 12),
  add constraint target_periods_days_chk check (target_days between 1 and 31),
  add constraint target_periods_dates_chk check (end_date >= start_date);
alter table public.targets
  add constraint targets_item_chk check (item in ('pt12','super_kix','tazbeet','data','adsl','fixed','we_pay')),
  add constraint targets_value_chk check (target_value >= 0);
alter table public.daily_performance
  add constraint daily_perf_nonneg_chk check (pt12>=0 and super_kix>=0 and tazbeet>=0 and data>=0 and adsl>=0 and fixed>=0 and we_pay>=0);

-- policies (RLS was already enabled on these tables)
create policy areas_select    on public.areas    for select to authenticated using (public.is_admin() or id in (select public.my_visible_area_ids()));
create policy branches_select on public.branches for select to authenticated using (public.is_admin() or id in (select public.my_visible_branch_ids()));

create policy periods_select on public.target_periods for select to authenticated using (public.can_view_user(user_id));
create policy periods_insert on public.target_periods for insert to authenticated with check (public.can_manage_user(user_id));
create policy periods_update on public.target_periods for update to authenticated using (public.can_manage_user(user_id)) with check (public.can_manage_user(user_id));
create policy periods_delete on public.target_periods for delete to authenticated using (public.can_manage_user(user_id));

create policy targets_select on public.targets for select to authenticated
  using (exists (select 1 from public.target_periods tp where tp.id = targets.period_id and public.can_view_user(tp.user_id)));
create policy targets_insert on public.targets for insert to authenticated
  with check (exists (select 1 from public.target_periods tp where tp.id = targets.period_id and public.can_manage_user(tp.user_id)));
create policy targets_update on public.targets for update to authenticated
  using (exists (select 1 from public.target_periods tp where tp.id = targets.period_id and public.can_manage_user(tp.user_id)))
  with check (exists (select 1 from public.target_periods tp where tp.id = targets.period_id and public.can_manage_user(tp.user_id)));
create policy targets_delete on public.targets for delete to authenticated
  using (exists (select 1 from public.target_periods tp where tp.id = targets.period_id and public.can_manage_user(tp.user_id)));

-- the employee records HIS OWN days, against HIS OWN period, inside its dates
create policy perf_select on public.daily_performance for select to authenticated using (public.can_view_user(user_id));
create policy perf_insert on public.daily_performance for insert to authenticated
  with check (public.is_admin() or (user_id = auth.uid() and exists (select 1 from public.target_periods tp
    where tp.id = daily_performance.period_id and tp.user_id = auth.uid()
      and daily_performance.performance_date between tp.start_date and tp.end_date)));
create policy perf_update on public.daily_performance for update to authenticated
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or (user_id = auth.uid() and exists (select 1 from public.target_periods tp
    where tp.id = daily_performance.period_id and tp.user_id = auth.uid()
      and daily_performance.performance_date between tp.start_date and tp.end_date)));
create policy perf_delete on public.daily_performance for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- audit_logs: clients may only write under their own id; the triggers below write the real trail
create policy audit_insert on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- 4) server-side audit trail (cannot be forged from the browser)
-- ============================================================
create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_logs(user_id, action, details)
  values (auth.uid(), tg_table_name || '.' || lower(tg_op),
          jsonb_build_object('row_id', r->>'id', 'subject_user', r->>'user_id', 'period_id', coalesce(r->>'period_id', r->>'id')));
  return coalesce(new, old);
end $$;
revoke all on function public.log_change() from public, anon, authenticated;
create trigger trg_audit_periods after insert or update or delete on public.target_periods    for each row execute function public.log_change();
create trigger trg_audit_targets after insert or update or delete on public.targets           for each row execute function public.log_change();
create trigger trg_audit_perf    after insert or update or delete on public.daily_performance for each row execute function public.log_change();
