-- /feather/billing is now the Mercury accounts-receivable mirror —
-- super-admin only. Flip the existing page_permissions row so the
-- sidebar hides it from non-admins immediately; the code-side default
-- (PagePermissions.tsx) plus the runtime is_super_admin gate in the
-- page and /api/billing/receivables enforce the rest.
update page_permissions
set admin_only = true
where path = '/feather/billing';
