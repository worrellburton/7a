-- Lock business_info writes to super admins only. The Information
-- page is the canonical NAP source — every directory listing, GBP
-- profile, and third-party form pulls from these fields, so a
-- typo by a regular admin would propagate everywhere.
--
-- Reads stay open to all admins (they need to copy the values into
-- listing forms); only super admins can mutate.
alter table public.business_info enable row level security;

drop policy if exists business_info_write_admin on public.business_info;
drop policy if exists business_info_write_super_admin on public.business_info;
create policy business_info_write_super_admin
  on public.business_info
  for all
  using (is_super_admin())
  with check (is_super_admin());
