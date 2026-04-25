-- Add the /app/landing page (drag-drop hero timeline editor) to the
-- Marketing & Admissions department's sidebar. Mirrors the new entry
-- in src/lib/PagePermissions.tsx so the runtime DB override matches
-- the code default.
insert into public.page_permissions (path, admin_only, section, sort_order, allowed_departments, department_id)
values (
  '/app/landing',
  false,
  'nav',
  24,
  array['dfde0b96-c605-40dd-84e5-281af2f6d8e9']::uuid[],
  'dfde0b96-c605-40dd-84e5-281af2f6d8e9'
)
on conflict (path) do update set
  admin_only = excluded.admin_only,
  section = excluded.section,
  sort_order = excluded.sort_order,
  allowed_departments = excluded.allowed_departments,
  department_id = excluded.department_id;
