-- Keep Full Month targets aligned with the actual calendar month length.
-- Also preserve existing branch item values when an edit payload omits a key.
create or replace function public.save_branch_target(p_id uuid, p_branch_id uuid, p_start date, p_end date, p_days integer, p_type text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_branch_name text;
  v_n int;
  v_item text;
  v_bt uuid;
  v_existing_items jsonb := '{}'::jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_target_days int;
  v_is_full_month boolean := lower(coalesce(p_type, 'Full Month')) = 'full month';
  v_month int := extract(month from p_end);
  v_year int := extract(year from p_end);
  items text[] := array['pt12','super_kix','tazbeet','data','adsl','fixed','we_pay','we_gold'];
begin
  select b.name into v_branch_name from branches b where b.id = p_branch_id;
  if v_branch_name is null then raise exception 'الفرع غير موجود'; end if;
  if not (public.is_admin() or exists (select 1 from branches where id = p_branch_id and manager_id = auth.uid())) then
    raise exception 'غير مصرح: تحديد التارجت لمدير الفرع فقط';
  end if;
  if p_end < p_start then raise exception 'تاريخ النهاية قبل البداية'; end if;
  select count(*) into v_n from profiles where branch_id = p_branch_id and role = 'agent';
  if v_n = 0 then raise exception 'لا يوجد موظفون (Agent) في هذا الفرع'; end if;

  if p_id is not null then
    select items into v_existing_items from branch_targets where id = p_id and branch_id = p_branch_id;
  end if;
  v_target_days := case
    when v_is_full_month then (p_end - p_start) + 1
    else greatest(least(coalesce(p_days, (p_end - p_start) + 1), 31), 1)
  end;

  foreach v_item in array items loop
    v_clean := v_clean || jsonb_build_object(
      v_item,
      floor(greatest(coalesce((p_items->>v_item)::numeric, (v_existing_items->>v_item)::numeric, 0), 0))
    );
  end loop;

  if p_id is not null then
    update branch_targets
       set month = v_month, year = v_year, start_date = p_start, end_date = p_end,
           target_days = v_target_days, period_type = coalesce(p_type, 'Full Month'),
           items = v_clean, updated_at = now()
     where id = p_id and branch_id = p_branch_id
     returning id into v_bt;
  end if;

  if v_bt is null then
    insert into branch_targets(branch_id, month, year, period_type, start_date, end_date, target_days, items, created_by)
    values (p_branch_id, v_month, v_year, coalesce(p_type, 'Full Month'), p_start, p_end, v_target_days, v_clean, auth.uid())
    on conflict (branch_id, month, year) do update set
      period_type = excluded.period_type, start_date = excluded.start_date, end_date = excluded.end_date,
      target_days = excluded.target_days, items = excluded.items, updated_at = now()
    returning id into v_bt;
  end if;

  perform public.redistribute_branch_target(v_bt);
  return jsonb_build_object('id', v_bt, 'employees', v_n, 'items', v_clean, 'target_days', v_target_days);
end
$function$;

-- Repair existing full-month records (October 2026 included) and re-sync employee periods.
update public.branch_targets
set target_days = (end_date - start_date) + 1, updated_at = now()
where period_type = 'Full Month'
  and start_date = date_trunc('month', start_date)::date
  and end_date = (date_trunc('month', start_date) + interval '1 month - 1 day')::date;

update public.target_periods tp
set target_days = bt.target_days, updated_at = now()
from public.branch_targets bt
where bt.id = tp.branch_target_id;

do $$
declare r record;
begin
  for r in select id from public.branch_targets where start_date = date '2026-10-01' and end_date = date '2026-10-31' loop
    perform public.redistribute_branch_target(r.id);
  end loop;
end $$;
