-- RLS smoke test. Paste into the Supabase SQL editor. It simulates three people and ALWAYS rolls back
-- (the final RAISE EXCEPTION aborts the transaction and prints the results), so it leaves no data behind.
-- Needs: a user named Mahmoud.Kader who manages the area containing branch "العباسية", branch "الدقي" in another area,
-- and at least two employees. Adjust the names/usernames below for your data.
do $$
declare
  out text := '';
  mgr uuid; a uuid; b uuid; pid uuid; n int; br_a uuid; br_b uuid;
begin
  select id into mgr from profiles where username = 'Mahmoud.Kader';
  select id into br_a from branches where name like '%العباسية%' limit 1;
  select id into br_b from branches where name like '%الدقي%' limit 1;
  select id into a from profiles where lower(btrim(role)) in ('agent','agant','user') and id <> mgr order by username limit 1;
  select id into b from profiles where lower(btrim(role)) in ('agent','agant','user') and id not in (mgr, a) order by username limit 1;
  update profiles set branch_id = br_a where id = a;   -- employee inside the manager's area
  update profiles set branch_id = br_b where id = b;   -- employee in another area

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', mgr, 'role', 'authenticated')::text, true);

  begin insert into target_periods(user_id,month,year,start_date,end_date,target_days) values (a,10,2026,'2026-10-01','2026-10-31',20) returning id into pid;
        out := out || E'1 manager creates a period for HIS employee: OK (expected)\n';
  exception when others then out := out || E'1 FAIL ' || sqlerrm || E'\n'; end;

  begin insert into target_periods(user_id,month,year,start_date,end_date,target_days) values (b,10,2026,'2026-10-01','2026-10-31',20);
        out := out || E'2 manager creates a period for ANOTHER area: UNEXPECTED OK  <-- BAD\n';
  exception when others then out := out || E'2 other-area employee: denied (expected)\n'; end;

  begin insert into targets(period_id,item,target_value) values (pid,'pt12',30),(pid,'data',10);
        out := out || E'3 manager writes targets: OK (expected)\n';
  exception when others then out := out || E'3 FAIL ' || sqlerrm || E'\n'; end;

  begin insert into targets(period_id,item,target_value) values (pid,'bogus',1);
        out := out || E'4 invalid item accepted  <-- BAD\n';
  exception when others then out := out || E'4 invalid item rejected (expected)\n'; end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  begin insert into target_periods(user_id,month,year,start_date,end_date,target_days) values (a,11,2026,'2026-11-01','2026-11-30',20);
        out := out || E'5 employee creates his own period  <-- BAD\n';
  exception when others then out := out || E'5 employee cannot create periods (expected)\n'; end;

  begin insert into daily_performance(period_id,user_id,performance_date,pt12) values (pid,a,'2026-10-05',3);
        out := out || E'6 employee logs a day inside his period: OK (expected)\n';
  exception when others then out := out || E'6 FAIL ' || sqlerrm || E'\n'; end;

  begin insert into daily_performance(period_id,user_id,performance_date,pt12) values (pid,a,'2026-12-05',3);
        out := out || E'7 date outside the period accepted  <-- BAD\n';
  exception when others then out := out || E'7 date outside the period: denied (expected)\n'; end;

  begin insert into daily_performance(period_id,user_id,performance_date,pt12) values (pid,b,'2026-10-06',3);
        out := out || E'8 logging for ANOTHER user accepted  <-- BAD\n';
  exception when others then out := out || E'8 logging for another user: denied (expected)\n'; end;

  begin update profiles set role = 'admin' where id = a;
        out := out || E'9 employee changed his own role  <-- BAD\n';
  exception when others then out := out || E'9 role escalation: denied (expected)\n'; end;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from target_periods;    out := out || E'10 other-area employee sees periods: ' || n || E' (expect 0)\n';
  select count(*) into n from daily_performance; out := out || E'11 other-area employee sees perf rows: ' || n || E' (expect 0)\n';

  reset role;
  select count(*) into n from audit_logs where created_at > now() - interval '1 minute';
  out := out || E'12 server-side audit rows: ' || n || E' (expect >= 4)\n';

  raise exception E'RLS TEST RESULTS (rolled back):\n%', out;
end $$;
