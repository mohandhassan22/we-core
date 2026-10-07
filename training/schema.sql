create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text not null default 'وحدة تدريبية',
  summary text not null,
  body jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_videos (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  title text not null,
  url text not null,
  provider text not null default 'drive',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.training_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  question_key text not null unique,
  question text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.training_modules(id) on delete cascade,
  completed boolean not null default false,
  best_score integer not null default 0,
  last_score integer not null default 0,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  primary key (user_id, module_id)
);

create or replace function public.training_is_manager_for(target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles viewer
    join public.profiles employee on employee.id = target_user
    where viewer.id = auth.uid()
      and (
        viewer.role in ('admin','supervisor','area_manager')
        or (
          viewer.role in ('branch_manager','branch-manager','manager','store-manager')
          and (viewer.branch_id = employee.branch_id or viewer.branch = employee.branch)
        )
      )
  );
$$;

grant execute on function public.training_is_manager_for(uuid) to authenticated;

alter table public.training_modules enable row level security;
alter table public.training_videos enable row level security;
alter table public.training_questions enable row level security;
alter table public.training_progress enable row level security;

drop policy if exists training_modules_read on public.training_modules;
create policy training_modules_read on public.training_modules for select to authenticated using (is_active = true);
drop policy if exists training_videos_read on public.training_videos;
create policy training_videos_read on public.training_videos for select to authenticated using (is_active = true);
drop policy if exists training_questions_read on public.training_questions;
create policy training_questions_read on public.training_questions for select to authenticated using (is_active = true);
drop policy if exists training_progress_read on public.training_progress;
create policy training_progress_read on public.training_progress for select to authenticated using (user_id = auth.uid() or public.training_is_manager_for(user_id));
drop policy if exists training_progress_insert on public.training_progress;
create policy training_progress_insert on public.training_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists training_progress_update on public.training_progress;
create policy training_progress_update on public.training_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.training_modules, public.training_videos, public.training_questions to authenticated;
grant select, insert, update on public.training_progress to authenticated;

create or replace function public.get_training_team_progress()
returns table (
  user_id uuid,
  full_name text,
  username text,
  branch text,
  modules_completed bigint,
  modules_total bigint,
  progress_pct integer,
  avg_score numeric
) language sql stable security definer set search_path = public as $$
  with viewer as (
    select id, role, branch_id, branch from public.profiles where id = auth.uid()
  ), active_modules as (
    select count(*)::bigint as total from public.training_modules where is_active = true
  )
  select employee.id,
         coalesce(employee.full_name, employee.username, 'موظف')::text,
         employee.username::text,
         employee.branch::text,
         count(progress.module_id) filter (where progress.completed)::bigint,
         active_modules.total,
         case when active_modules.total = 0 then 0 else round((count(progress.module_id) filter (where progress.completed)) * 100.0 / active_modules.total)::integer end,
         coalesce(round(avg(nullif(progress.best_score, 0)), 1), 0)::numeric
  from public.profiles employee
  cross join viewer
  cross join active_modules
  left join public.training_progress progress on progress.user_id = employee.id
  where employee.id <> viewer.id
    and (
      viewer.role in ('admin','supervisor','area_manager')
      or (viewer.role in ('branch_manager','branch-manager','manager','store-manager') and (viewer.branch_id = employee.branch_id or viewer.branch = employee.branch))
    )
  group by employee.id, employee.full_name, employee.username, employee.branch, active_modules.total
  order by 7 desc, employee.full_name nulls last;
$$;

grant execute on function public.get_training_team_progress() to authenticated;

insert into public.training_modules (slug, eyebrow, title, summary, body, sort_order)
values
('start-here','الخطوة الأولى','أساسيات التعامل مع العميل','ابدأ بفهم المستندات، التفعيل، وطريقة تحويل المعلومة إلى إجابة واضحة للعميل.','["اسأل عن احتياج العميل قبل اقتراح الباقة.","راجع المستندات المطلوبة حسب نوع العميل.","استخدم 111 أو my.te.eg في خطوات التفعيل عند الحاجة.","اشرح السعر والصلاحية والمحاسبة بعد انتهاء الباقة بلغة بسيطة."]'::jsonb,1),
('mobile','وحدة 01','باقات الموبايل والدفع المسبق','تعرّف على Super Kix وWE Mix وTazbeet وWE Club واختار الأنسب حسب استخدام العميل.','["Super Kix صالحة 28 يومًا وتُقاس بالكيكس.","WE Club لها مستند عضوية إضافي مثل كارنيه النادي أو النقابة.","اسأل العميل هل يريد دقائق أكثر أم إنترنت أكثر قبل الترشيح.","لا تذكر رقمًا أو شرطًا إلا إذا كان موجودًا في دليل WE-Core المحدث."]'::jsonb,2),
('home-internet','وحدة 02','WE Space والخط الأرضي','افهم السرعات والسعات والصلاحيات وخطوات الطلب والتركيب للإنترنت المنزلي والخط الأرضي.','["باقات WE Space تختلف حسب السرعة والسعة والسعر.","وضح للعميل الفرق بين السعر الأساسي والسعر شامل الضريبة.","اطلب الإمكانية الفنية قبل وعد العميل بالتركيب.","تأكد من شرح سياسة عدم التجديد وفترة الاستقبال فقط."]'::jsonb,3),
('air-devices','وحدة 03','WE Air والأجهزة','تعلّم كيف تشرح الإنترنت الهوائي، التغطية، الراوتر، والباقات الإضافية.','["WE Air مناسب للمكان الذي لا تتوفر فيه الخدمة الأرضية أو يحتاج إلى تركيب سريع.","التغطية مرتبطة بالمكان الذي تم تحديده عند التفعيل.","اسأل عن عدد المستخدمين والاستخدام الثقيل قبل ترشيح السعة.","وضح طريقة الإدارة من My WE أو my.te.eg أو الفرع."]'::jsonb,4),
('bss-service','وحدة 04','BSS وخدمة العميل','راجع خطوات التحقق، إنشاء الطلب، ونقل الرقم من فيديوهات BSS الموجودة في WE-Core.','["ابدأ بـ Check Availability قبل إنشاء خدمة تعتمد على الإمكانية.","التقط بيانات العميل بدقة ولا تتخطى خطوة التحقق.","استخدم فيديوهات BSS كمرجع مرئي للخطوات المتكررة.","إذا لم تعرف الإجراء، قل للعميل إنك ستراجع الدليل بدل التخمين."]'::jsonb,5)
on conflict (slug) do update set eyebrow=excluded.eyebrow,title=excluded.title,summary=excluded.summary,body=excluded.body,sort_order=excluded.sort_order,updated_at=now();

insert into public.training_videos (module_id, title, url, provider, sort_order)
select id, 'Check Availability Recipe', 'https://drive.google.com/file/d/13fBoQ7qfjApEdD25J2hQLPLhD-QBiVLW/preview', 'drive', 1 from public.training_modules where slug='bss-service'
  and not exists (select 1 from public.training_videos v where v.url like '%13fBoQ7qfjApEdD25J2hQLPLhD-QBiVLW%');
insert into public.training_videos (module_id, title, url, provider, sort_order)
select id, 'Create ADSL', 'https://drive.google.com/file/d/1AQ617EGtYA6GpxDG_PHQkyxmtx5CqzIz/preview', 'drive', 2 from public.training_modules where slug='home-internet'
  and not exists (select 1 from public.training_videos v where v.url like '%1AQ617EGtYA6GpxDG_PHQkyxmtx5CqzIz%');
insert into public.training_videos (module_id, title, url, provider, sort_order)
select id, 'Selling MiFi', 'https://drive.google.com/file/d/1gR4lmgxw3zEbFBBgNTmA__vKrIoR0-EJ/preview', 'drive', 1 from public.training_modules where slug='air-devices'
  and not exists (select 1 from public.training_videos v where v.url like '%1gR4lmgxw3zEbFBBgNTmA__vKrIoR0-EJ%');
insert into public.training_videos (module_id, title, url, provider, sort_order)
select id, 'WE Gold Selling Steps', 'https://drive.google.com/file/d/1Gt_Z6qi_NuNuyYAtZE6oNaXq742L4FAh/preview', 'drive', 1 from public.training_modules where slug='mobile'
  and not exists (select 1 from public.training_videos v where v.url like '%1Gt_Z6qi_NuNuyYAtZE6oNaXq742L4FAh%');

insert into public.training_questions (module_id, question_key, question, options, correct_index, explanation)
select m.id, x.key, x.question, x.options::jsonb, x.answer, x.explanation
from public.training_modules m
join (values
('mobile_1','ما مدة صلاحية باقات Super Kix؟','["7 أيام","28 يومًا","30 يومًا","90 يومًا"]',1,'باقات Super Kix صلاحيتها 28 يومًا.'),
('mobile_2','ما المستند الإضافي المطلوب لـ WE Club؟','["فاتورة كهرباء","شهادة ميلاد","كارنيه النادي أو النقابة","لا يوجد"]',2,'WE Club تحتاج البطاقة مع كارنيه النادي أو النقابة.'),
('mobile_3','ما السؤال الأفضل قبل ترشيح باقة موبايل؟','["ما لون هاتفك؟","هل تريد دقائق أكثر أم إنترنت أكثر؟","هل ستغير الفرع؟","ما اسم التطبيق؟"]',1,'فهم نمط الاستخدام يجعل الترشيح مناسبًا بدل التخمين.'),
('home_1','ما الذي يجب التأكد منه قبل وعد العميل بتركيب خدمة أرضية؟','["لون الراوتر","الإمكانية الفنية","عدد أفراد الأسرة","اسم الموظف"]',1,'التركيب مرتبط بتوفر الإمكانية الفنية.'),
('home_2','كيف تشرح السعر للعميل؟','["تذكر الرقم فقط","توضح الأساسي وهل هو شامل الضريبة","تخفي الضريبة","تقول السعر يتغير دائمًا"]',1,'الشفافية بين السعر الأساسي والسعر شامل الضريبة تمنع سوء الفهم.'),
('air_1','بماذا ترتبط جودة WE Air؟','["باسم العميل","بالمكان المحدد والتغطية","بعدد الفروع","بلون الشريحة"]',1,'الخدمة تعمل في المكان المحدد عند التفعيل لضمان أفضل جودة.'),
('bss_1','ما الخطوة المناسبة قبل إنشاء خدمة تعتمد على التغطية؟','["تخمين التغطية","Check Availability","تغيير كلمة المرور","إغلاق الطلب"]',1,'ابدأ بفحص الإمكانية قبل متابعة إنشاء الطلب.'),
('start_1','ماذا تفعل إذا لم تكن متأكدًا من شرط؟','["تخمن","تتجاهل العميل","تراجع دليل WE-Core أو تسأل المسؤول","تعطي رقمًا عشوائيًا"]',2,'الرجوع للمصدر أفضل من نقل معلومة غير مؤكدة.')
) as x(key,question,options,answer,explanation) on true
where m.slug in ('mobile','home-internet','air-devices','bss-service','start-here')
  and ((x.key like 'mobile_%' and m.slug='mobile') or (x.key like 'home_%' and m.slug='home-internet') or (x.key like 'air_%' and m.slug='air-devices') or (x.key like 'bss_%' and m.slug='bss-service') or (x.key like 'start_%' and m.slug='start-here'))
on conflict (question_key) do update set question=excluded.question, options=excluded.options, correct_index=excluded.correct_index, explanation=excluded.explanation, module_id=excluded.module_id;
