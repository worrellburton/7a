-- Subject classification on Contact Us form submissions. The
-- modal now exposes a "General Inquiry" / "Admissions" dropdown
-- that routes the email to a different inbox via Resend; this
-- column persists the user's selection so the admin Forms tab
-- can show + filter by subject.
alter table public.contact_submissions
  add column if not exists subject text;

-- Constrain to the two valid values plus null for legacy rows.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_submissions_subject_chk'
  ) then
    alter table public.contact_submissions
      add constraint contact_submissions_subject_chk
      check (subject is null or subject in ('general_inquiry', 'admissions'));
  end if;
end$$;
