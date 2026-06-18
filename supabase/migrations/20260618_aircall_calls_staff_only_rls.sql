-- Restrict aircall_calls reads to staff. The table mirrors Aircall call
-- activity — caller numbers / names, recording URLs, transcripts (PHI) —
-- so it must never be readable by alumni / guest accounts. The previous
-- policy allowed ANY authenticated user (qual = true), which leaked the
-- data straight to the browser Supabase client (and Realtime) regardless
-- of the staff-gated /api/aircall/* routes. Service-role writers (webhook
-- / backfill) bypass RLS and are unaffected.

drop policy if exists "aircall_calls readable by authenticated" on public.aircall_calls;

drop policy if exists aircall_calls_select_staff on public.aircall_calls;
create policy aircall_calls_select_staff
  on public.aircall_calls for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.is_admin = true
             or u.is_super_admin = true
             or coalesce(u.user_kind, 'staff') = 'staff')
    )
  );
