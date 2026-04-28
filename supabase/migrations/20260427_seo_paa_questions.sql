-- People-Also-Ask question pool. Mined from SerpAPI's
-- related_questions field on each priority-1 location/decision
-- keyword. Each question is a content opportunity: if we answer it
-- well on a page that's tied to the seed keyword, we earn the PAA
-- box ourselves.
create table if not exists public.seo_paa_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  seed_keyword_id text,
  seed_keyword_text text,
  snippet text,
  source_title text,
  source_link text,
  we_own boolean not null default false,
  status text not null default 'open',
  notes text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_paa_questions_q_seed_uniq
  on public.seo_paa_questions (
    md5(question), coalesce(seed_keyword_id, '__null__')
  );
create index if not exists seo_paa_questions_status_seen_idx
  on public.seo_paa_questions (status, last_seen_at desc);

alter table public.seo_paa_questions enable row level security;

drop policy if exists "seo_paa_questions admin select" on public.seo_paa_questions;
create policy "seo_paa_questions admin select"
  on public.seo_paa_questions
  for select
  using (is_admin());
drop policy if exists "seo_paa_questions admin insert" on public.seo_paa_questions;
create policy "seo_paa_questions admin insert"
  on public.seo_paa_questions
  for insert
  with check (is_admin());
drop policy if exists "seo_paa_questions admin update" on public.seo_paa_questions;
create policy "seo_paa_questions admin update"
  on public.seo_paa_questions
  for update
  using (is_admin())
  with check (is_admin());
drop policy if exists "seo_paa_questions admin delete" on public.seo_paa_questions;
create policy "seo_paa_questions admin delete"
  on public.seo_paa_questions
  for delete
  using (is_admin());

create or replace function public.seo_paa_questions_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists seo_paa_touch_trg on public.seo_paa_questions;
create trigger seo_paa_touch_trg
  before update on public.seo_paa_questions
  for each row execute function public.seo_paa_questions_touch_updated_at();
