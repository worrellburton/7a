-- "Code" admin type: a user flagged is_code_admin may access the
-- Landing → Code page (alongside super admins). Orthogonal to
-- is_admin / is_super_admin / is_alumni_admin — a Code admin is NOT a
-- general admin, and a general admin is NOT automatically a Code admin.
alter table public.users
  add column if not exists is_code_admin boolean not null default false;

comment on column public.users.is_code_admin is
  'Code admin: may access the Landing → Code page (alongside super admins). Orthogonal to is_admin / is_super_admin / is_alumni_admin.';
