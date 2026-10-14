create table if not exists public.training_ai_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  topic text not null,
  q text not null,
  o jsonb not null,
  a integer not null check (a between 0 and 3),
  w text not null default '',
  q_hash text not null unique,
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists training_ai_questions_mt_idx on public.training_ai_questions(module_id, topic, used_count);
alter table public.training_ai_questions enable row level security;
-- no policies on purpose: only the edge function (service role) reads/writes it.
