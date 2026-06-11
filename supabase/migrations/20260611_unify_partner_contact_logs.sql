-- Unify partner + contact history into ONE log stream (contact_logs).
--
-- 1. Every partner gets a contact_id (find-or-create, same matching
--    rules as the 20260511 backfill) so the two surfaces share a row.
-- 2. partner_logs.contact_log_id marks which historical partner logs
--    have been mirrored into contact_logs — the backfill below copies
--    every unmirrored log, and the log-contact API stamps it going
--    forward, so re-running is idempotent and nothing duplicates.
-- 3. contacts.last_contact_* is refreshed wherever a mirrored partner
--    log is newer than what the contact already showed.

alter table public.partner_logs
  add column if not exists contact_log_id uuid references public.contact_logs(id) on delete set null;

-- ── 1. Link stragglers ──────────────────────────────────────────
do $$
declare
  p record;
  matched_id uuid;
begin
  for p in
    select id, name, poc, type, specialty, location
    from public.partners
    where contact_id is null
  loop
    matched_id := null;
    if p.poc is not null and length(trim(p.poc)) > 0 then
      select id into matched_id from public.contacts
      where lower(trim(name)) = lower(trim(p.poc)) limit 1;
    end if;
    if matched_id is null then
      select id into matched_id from public.contacts
      where lower(trim(name)) = lower(trim(p.name)) limit 1;
    end if;
    if matched_id is null then
      insert into public.contacts (name, company, role, location, notes, source, source_partner_id)
      values (
        coalesce(nullif(trim(p.poc), ''), p.name),
        case when nullif(trim(p.poc), '') is not null then p.name else null end,
        p.type,
        p.location,
        case when p.specialty is not null then 'Specialty: ' || p.specialty else null end,
        'auto-from-partner-unify',
        p.id
      )
      returning id into matched_id;
    end if;
    update public.partners set contact_id = matched_id where id = p.id;
  end loop;
end $$;

-- ── 2. Mirror historical partner logs into contact_logs ─────────
do $$
declare
  l record;
  new_log_id uuid;
begin
  for l in
    select pl.id, pl.method, pl.comments, pl.contacted_by, pl.contacted_at, p.contact_id
    from public.partner_logs pl
    join public.partners p on p.id = pl.partner_id
    where pl.contact_log_id is null
      and p.contact_id is not null
  loop
    insert into public.contact_logs (contact_id, method, comments, contacted_by, contacted_at)
    values (l.contact_id, l.method, l.comments, l.contacted_by, l.contacted_at)
    returning id into new_log_id;
    update public.partner_logs set contact_log_id = new_log_id where id = l.id;
  end loop;
end $$;

-- ── 3. Refresh denormalised last-contact fields on contacts ─────
update public.contacts c
set last_contact_at = latest.contacted_at,
    last_contact_by = latest.contacted_by,
    last_contact_method = latest.method,
    last_contact_comments = latest.comments
from (
  select distinct on (contact_id)
    contact_id, contacted_at, contacted_by, method, comments
  from public.contact_logs
  order by contact_id, contacted_at desc
) latest
where latest.contact_id = c.id
  and (c.last_contact_at is null or latest.contacted_at > c.last_contact_at);
