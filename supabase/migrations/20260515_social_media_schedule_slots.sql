-- Recurring schedule slots for the social-media Schedule Posts tab.
--
-- See content.tsx ScheduleSlotsPanel for the consumer. A slot is a
-- UI-only recurrence definition; actual posts are still routed
-- through the existing /api/social-media/post Ayrshare endpoint
-- with a scheduleDate matching the dropped occurrence.

create table if not exists public.social_media_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rrule_kind text not null check (rrule_kind in ('daily', 'every-other-day', 'weekly', 'biweekly')),
  days_of_week int[],
  hour int not null check (hour between 0 and 23),
  minute int not null check (minute between 0 and 59),
  anchor_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists social_media_schedule_slots_owner_idx
  on public.social_media_schedule_slots (created_by);

alter table public.social_media_schedule_slots enable row level security;

drop policy if exists social_media_schedule_slots_select on public.social_media_schedule_slots;
create policy social_media_schedule_slots_select
  on public.social_media_schedule_slots for select
  to authenticated using (true);

drop policy if exists social_media_schedule_slots_insert on public.social_media_schedule_slots;
create policy social_media_schedule_slots_insert
  on public.social_media_schedule_slots for insert
  to authenticated with check (auth.uid() = created_by);

drop policy if exists social_media_schedule_slots_delete on public.social_media_schedule_slots;
create policy social_media_schedule_slots_delete
  on public.social_media_schedule_slots for delete
  to authenticated using (auth.uid() = created_by);

alter publication supabase_realtime add table public.social_media_schedule_slots;
