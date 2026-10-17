-- Regional Manager: a title above Supervisor.
-- A regional manager sees (read-only) every area assigned to him through areas.regional_manager_id,
-- and from there all branches / employees / targets / daily performance, exactly like the other roles.

alter table public.profiles add column if not exists region text;
alter table public.areas add column if not exists regional_manager_id uuid references public.profiles(id) on delete set null;
create index if not exists areas_regional_manager_idx on public.areas (regional_manager_id);

create or replace function public.my_visible_area_ids()
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select id from public.areas where manager_id = auth.uid() or supervisor_id = auth.uid() or regional_manager_id = auth.uid()
  union
  select b.area_id from public.branches b where b.id in (select public.my_visible_branch_ids()) and b.area_id is not null;
$function$;

create or replace function public.my_visible_branch_ids()
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select b.id from public.branches b
  where b.manager_id = auth.uid()
     or b.area_id in (select id from public.areas where manager_id = auth.uid() or supervisor_id = auth.uid() or regional_manager_id = auth.uid())
     or b.id = (select branch_id from public.profiles where id = auth.uid());
$function$;

create or replace function public.can_view_user(target uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null and (
    target = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.profiles p
      join public.branches b on b.id = p.branch_id
      left join public.areas a on a.id = b.area_id
      where p.id = target
        and (b.manager_id = auth.uid() or a.manager_id = auth.uid() or a.supervisor_id = auth.uid() or a.regional_manager_id = auth.uid())
    )
  );
$function$;

-- The two existing regional managers (their role used to be a free-text string and fell back to "agent")
update public.profiles set role = 'regional_manager', region = 'East Cairo' where lower(username) = 'ahmed.elananey';
update public.profiles set role = 'regional_manager', region = 'West Cairo' where lower(username) = 'mohamad.elsisi';

-- Mahmoud Eltazy's area belongs to Mohamad Elsisi (West Cairo)
update public.areas
   set regional_manager_id = (select id from public.profiles where lower(username) = 'mohamad.elsisi')
 where supervisor_id = (select id from public.profiles where lower(username) = 'mahmoud.eltazy');
