-- User-delete unblocker: convert every NO ACTION FK that points at
-- public.users into ON DELETE SET NULL, so removing a teammate via
-- /app/team (which runs supabase.auth.admin.deleteUser, which
-- cascades to public.users via users_id_fkey) doesn't trip over
-- audit rows the deleted user authored. The 'Database error
-- deleting user' toast was exactly that: a downstream FK with
-- NO ACTION blocking the cascade.
--
-- All target columns were verified nullable (information_schema
-- check, 2026-05-20) so SET NULL is safe — historical rows stay
-- put, the user pointer just goes blank. Cached display name /
-- avatar snapshots on rows like contact_logs.by_name keep the
-- historical attribution legible even after the user vanishes.

do $$
declare
  fk record;
begin
  for fk in
    select
      tc.constraint_name,
      tc.table_schema as fk_schema,
      tc.table_name   as fk_table,
      kcu.column_name as fk_column
    from information_schema.referential_constraints rc
    join information_schema.table_constraints tc
      on tc.constraint_name = rc.constraint_name
      and tc.constraint_schema = rc.constraint_schema
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name
      and kcu.constraint_schema = tc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = rc.unique_constraint_name
      and ccu.constraint_schema = rc.unique_constraint_schema
    where ccu.table_schema = 'public'
      and ccu.table_name   = 'users'
      and rc.delete_rule   = 'NO ACTION'
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      fk.fk_schema, fk.fk_table, fk.constraint_name
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references public.users(id) on delete set null',
      fk.fk_schema, fk.fk_table, fk.constraint_name, fk.fk_column
    );
  end loop;
end$$;
