-- New canonical directory-status enum:
--   claim_in_process / claimed / submitted / pending / live /
--   paid_list / no_option / requires_official_docs / skip
-- Plus 'todo' as the implicit default for never-touched rows.
--
-- Migrates legacy keys atomically in one CASE so the
-- pending → submitted / pending_review → pending swap is collision-safe
-- (CASE evaluates against the OLD value of every row, so there's no
-- order-dependence between the two renames).

alter table public.directory_states
  drop constraint if exists directory_states_status_check;

alter table public.directory_states
  add constraint directory_states_status_check
  check (status in (
    'todo','claim_in_process','claimed','submitted','pending','live',
    'paid_list','no_option','requires_official_docs','skip',
    -- legacy keys kept temporarily so the data migration below can run
    'pending_review','listed','need_credentials'
  ));

update public.directory_states
set status = case status
  when 'pending'          then 'submitted'
  when 'pending_review'   then 'pending'
  when 'need_credentials' then 'requires_official_docs'
  when 'listed'           then 'live'
  else status
end
where status in ('pending','pending_review','need_credentials','listed');

alter table public.directory_states
  drop constraint directory_states_status_check;

alter table public.directory_states
  add constraint directory_states_status_check
  check (status in (
    'todo','claim_in_process','claimed','submitted','pending','live',
    'paid_list','no_option','requires_official_docs','skip'
  ));
