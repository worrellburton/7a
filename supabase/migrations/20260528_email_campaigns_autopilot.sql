-- Always-on autopilot for the "Add new contacts to scheduled
-- campaigns" feature. A Postgres trigger fires on every contact
-- insert: if the new row has a valid email and isn't unsubscribed,
-- it inserts a row into email_campaign_recipients for every
-- currently-scheduled campaign whose recipient set was locked
-- before this contact existed. The unique index on
-- (campaign_id, contact_id) keeps the operation idempotent.

create table if not exists public.email_campaign_autopilot_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  contact_name text,
  contact_email text,
  campaign_ids uuid[] not null default '{}',
  campaign_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists email_campaign_autopilot_log_created_idx
  on public.email_campaign_autopilot_log (created_at desc);

alter table public.email_campaign_autopilot_log enable row level security;

drop policy if exists email_campaign_autopilot_log_select_authed on public.email_campaign_autopilot_log;
create policy email_campaign_autopilot_log_select_authed
  on public.email_campaign_autopilot_log for select to authenticated
  using (auth.uid() is not null);

create or replace function public.autopilot_add_to_scheduled_campaigns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_ids uuid[];
  v_count int;
begin
  if new.email is null or new.email = '' or new.unsubscribed_at is not null then
    return new;
  end if;

  -- Snapshot the set of campaigns this contact qualifies for.
  -- We exclude campaigns the contact is already on so a re-run
  -- doesn't log a phantom "added 0" event.
  select array_agg(c.id)
  into v_campaign_ids
  from public.email_campaigns c
  where c.status = 'scheduled'
    and (c.recipients_locked_at is null or c.recipients_locked_at < new.created_at)
    and not exists (
      select 1 from public.email_campaign_recipients ecr
      where ecr.campaign_id = c.id and ecr.contact_id = new.id
    );

  if v_campaign_ids is null or array_length(v_campaign_ids, 1) = 0 then
    return new;
  end if;

  insert into public.email_campaign_recipients (campaign_id, contact_id, email, send_status)
  select cid, new.id, new.email, 'pending' from unnest(v_campaign_ids) as cid
  on conflict (campaign_id, contact_id) do nothing;

  v_count := array_length(v_campaign_ids, 1);

  insert into public.email_campaign_autopilot_log (
    contact_id, contact_name, contact_email, campaign_ids, campaign_count
  ) values (
    new.id,
    coalesce(new.name, new.email),
    new.email,
    v_campaign_ids,
    v_count
  );

  return new;
end;
$$;

drop trigger if exists contacts_autopilot_scheduled on public.contacts;
create trigger contacts_autopilot_scheduled
  after insert on public.contacts
  for each row execute function public.autopilot_add_to_scheduled_campaigns();
