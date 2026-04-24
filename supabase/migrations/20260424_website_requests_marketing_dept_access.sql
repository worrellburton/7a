-- Open /app/website-requests to the whole Marketing & Admissions department.
--
-- Previously the page was admin-only, which blanked it out for the
-- marketing/admissions teammates who actually own these submissions
-- (VOBs + contact forms). This row mirrors the new code defaults in
-- src/lib/PagePermissions.tsx and src/lib/website-requests-auth.ts.
--
-- Idempotent: safe to re-run.

insert into public.page_permissions (path, admin_only, section, sort_order, allowed_departments, department_id)
values (
  '/app/website-requests',
  false,
  'nav',
  23,
  array['dfde0b96-c605-40dd-84e5-281af2f6d8e9']::text[],
  'dfde0b96-c605-40dd-84e5-281af2f6d8e9'
)
on conflict (path) do update set
  admin_only = excluded.admin_only,
  allowed_departments = excluded.allowed_departments,
  department_id = excluded.department_id;
