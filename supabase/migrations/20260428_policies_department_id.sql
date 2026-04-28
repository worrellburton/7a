-- Add an optional department association to policies so the
-- Policies admin can filter + group by department alongside the
-- existing "section" text column.
--
-- on delete set null: deleting a department should not cascade-wipe
-- the policies under it. The UI renders an em-dash for null, which
-- is also the existing-row default after this migration.

alter table public.policies
  add column if not exists department_id uuid
  references public.departments(id) on delete set null;

create index if not exists policies_department_id_idx
  on public.policies (department_id);
