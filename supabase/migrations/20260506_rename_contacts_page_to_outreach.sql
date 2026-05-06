-- Rename the navbar entry from /app/contacts to /app/outreach.
-- The page lives at src/app/app/outreach/ now and the label was
-- changed to "Outreach". This keeps the saved page_permissions row
-- + any user_page_permissions overrides pointing at the new path
-- so existing admin choices (admin-only, departments, sort order)
-- carry over without manual re-config.

-- 1. Move the row in page_permissions.
update public.page_permissions
   set path = '/app/outreach'
 where path = '/app/contacts'
   and not exists (select 1 from public.page_permissions where path = '/app/outreach');

-- If a row at /app/outreach already exists (e.g. inserted by the
-- defaults loader), drop the stale /app/contacts row.
delete from public.page_permissions where path = '/app/contacts';

-- 2. Carry per-user overrides forward.
update public.user_page_permissions
   set path = '/app/outreach'
 where path = '/app/contacts'
   and not exists (
     select 1 from public.user_page_permissions sub
      where sub.user_id = user_page_permissions.user_id
        and sub.path = '/app/outreach'
   );

delete from public.user_page_permissions where path = '/app/contacts';
