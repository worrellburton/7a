-- Restructure the relationship between public.contacts and
-- public.partners so a partner row becomes an OPTIONAL ATTACHMENT on an
-- existing outreach contact rather than a separate entity that
-- duplicates the contact's surface info.
--
-- Before this migration:
--   - "Upgrade to Partner" moved a contact row into the partners table
--     (delete contact, insert partner).
--   - "Downgrade to Contact" moved a partner row into contacts (delete
--     partner, insert contact).
--   - The two tables drifted apart and any per-contact engagement
--     history was orphaned by the moves.
--
-- After:
--   - Every partner row carries a contact_id FK pointing at the source
--     contact. Both rows live independently; the partner is purely the
--     "we send referrals back and forth with this person's facility"
--     metadata.
--   - "Add partner" on /app/outreach creates the partner row alongside
--     the existing contact (no delete).
--   - "Remove partner" on /app/partnerships deletes the partner row,
--     contact survives.
--
-- The backfill loop pairs every existing partner with either a matching
-- contact (case-insensitive on poc-then-name) or a freshly-created
-- contact whose `source = 'auto-from-partner-backfill'` so the audit
-- trail of "this row came from the migration" stays visible in the
-- grid.

alter table public.partners
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

create index if not exists partners_contact_id_idx
  on public.partners(contact_id)
  where contact_id is not null;

do $$
declare
  p record;
  matched_id uuid;
begin
  for p in
    select id, name, poc, type, specialty, location, contact_info
    from public.partners
    where contact_id is null
  loop
    matched_id := null;

    if p.poc is not null and length(trim(p.poc)) > 0 then
      select id into matched_id
      from public.contacts
      where lower(trim(name)) = lower(trim(p.poc))
      limit 1;
    end if;

    if matched_id is null then
      select id into matched_id
      from public.contacts
      where lower(trim(name)) = lower(trim(p.name))
      limit 1;
    end if;

    if matched_id is null then
      insert into public.contacts (
        name, company, role, location, notes, source, source_partner_id
      )
      values (
        coalesce(nullif(trim(p.poc), ''), p.name),
        case when nullif(trim(p.poc), '') is not null then p.name else null end,
        p.type,
        p.location,
        case when p.specialty is not null then 'Specialty: ' || p.specialty else null end,
        'auto-from-partner-backfill',
        p.id
      )
      returning id into matched_id;
    end if;

    update public.partners
    set contact_id = matched_id
    where id = p.id;
  end loop;
end $$;
