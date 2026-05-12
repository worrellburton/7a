-- Backfill outreach contacts from their linked partner row. Once
-- specialty / type / location / website existed on `contacts`, every
-- partner that had a `contact_id` link held the canonical values but
-- the contact row was empty. COALESCE-style update so admissions can't
-- have anything they typed on the contact side overwritten — partner
-- data only fills blanks.
update public.contacts c
set
  specialty = coalesce(nullif(c.specialty, ''), p.specialty),
  type = coalesce(nullif(c.type, ''), p.type),
  location = coalesce(nullif(c.location, ''), p.location),
  company_website = coalesce(nullif(c.company_website, ''), p.website)
from public.partners p
where p.contact_id = c.id
  and (
    (p.specialty is not null and (c.specialty is null or c.specialty = '')) or
    (p.type is not null and (c.type is null or c.type = '')) or
    (p.location is not null and (c.location is null or c.location = '')) or
    (p.website is not null and (c.company_website is null or c.company_website = ''))
  );
