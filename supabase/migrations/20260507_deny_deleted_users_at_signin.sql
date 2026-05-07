-- Persistent block-list for users who've been deleted from the team.
-- Email is the canonical identity (an auth.users row gets re-created
-- on every Google sign-in with a brand-new uuid, so an id-keyed
-- ban list wouldn't survive a re-login).
CREATE TABLE IF NOT EXISTS public.denied_emails (
  email      text PRIMARY KEY,                 -- stored lowercase
  reason     text,
  banned_at  timestamptz NOT NULL DEFAULT now(),
  banned_by  uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.denied_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS denied_emails_select_super_admin ON public.denied_emails;
CREATE POLICY denied_emails_select_super_admin
  ON public.denied_emails FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_super_admin = true
  ));

DROP POLICY IF EXISTS denied_emails_insert_super_admin ON public.denied_emails;
CREATE POLICY denied_emails_insert_super_admin
  ON public.denied_emails FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_super_admin = true
  ));

DROP POLICY IF EXISTS denied_emails_delete_super_admin ON public.denied_emails;
CREATE POLICY denied_emails_delete_super_admin
  ON public.denied_emails FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_super_admin = true
  ));

-- Replace the sign-in trigger so that any email in denied_emails
-- gets a public.users row stamped status='denied' (the existing
-- PlatformShell gate then renders a "you've been removed" splash and
-- signs the user out). Without this branch the trigger blindly
-- recreates an 'on_hold' / 'active' row every sign-in, which is what
-- let Mario walk back in after we deleted him.
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
declare
  v_denied boolean;
begin
  select exists(
    select 1 from public.denied_emails d
    where d.email = lower(new.email)
  ) into v_denied;

  if v_denied then
    insert into public.users (id, email, full_name, avatar_url, provider, last_sign_in, status)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
      coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
      new.last_sign_in_at,
      'denied'
    )
    on conflict (id) do update set
      email        = excluded.email,
      full_name    = excluded.full_name,
      avatar_url   = excluded.avatar_url,
      provider     = excluded.provider,
      last_sign_in = excluded.last_sign_in,
      status       = 'denied';
    return new;
  end if;

  insert into public.users (id, email, full_name, avatar_url, provider, last_sign_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.last_sign_in_at
  )
  on conflict (id) do update set
    email        = excluded.email,
    full_name    = excluded.full_name,
    avatar_url   = excluded.avatar_url,
    provider     = excluded.provider,
    last_sign_in = excluded.last_sign_in;
  return new;
end;
$$;

-- Drop the reset_denied_user_on_signin trigger entirely. It was
-- flipping status='denied' back to 'on_hold' on every sign-in,
-- which made the denied state un-stick. The denied_emails check
-- in handle_user_sign_in is the canonical block now.
DROP TRIGGER IF EXISTS reset_denied_user_on_signin ON auth.users;
DROP FUNCTION IF EXISTS public.reset_denied_user_on_signin();
