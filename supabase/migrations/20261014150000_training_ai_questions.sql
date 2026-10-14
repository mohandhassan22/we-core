create table if not exists public.training_ai_questions (
  id uuid primary key default gen_random_uuid(),
  module_slug text not null,
  question text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null default '',
  question_hash text not null unique,
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists training_ai_questions_module_idx on public.training_ai_questions(module_slug);
alter table public.training_ai_questions enable row level security;
-- no policies: only the edge function (service role) reads/writes this table
