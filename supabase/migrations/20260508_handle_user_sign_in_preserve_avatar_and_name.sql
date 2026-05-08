-- Stop the sign-in trigger from clobbering user-edited profile fields.
-- Until now, every successful Google sign-in fired the trigger on
-- auth.users (UPDATE of last_sign_in_at) which then upserted
-- public.users with raw_user_meta_data->>avatar_url + full_name.
-- The ON CONFLICT clause unconditionally set avatar_url = excluded
-- and full_name = excluded, so the user's uploaded photo + any name
-- correction they'd made on /app/profile got blasted back to whatever
-- Google handed us. End-users described it as "my profile picture
-- keeps changing" — exactly that.
--
-- Fix: on the conflict path, only adopt the OAuth-provided avatar_url
-- and full_name when the existing public.users row has them NULL
-- (first sign-in / never edited). Once a user has either field set,
-- subsequent sign-ins leave them alone. INSERT path is unchanged so
-- brand-new users still get Google's name + avatar as their starting
-- defaults.
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
      -- Preserve any user-edited full_name / avatar_url even on the
      -- denied path. A denied user shouldn't get to sneak a profile
      -- pic update through, but neither should we trash whatever was
      -- there before they were denied.
      full_name    = coalesce(public.users.full_name, excluded.full_name),
      avatar_url   = coalesce(public.users.avatar_url, excluded.avatar_url),
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
    -- KEEP the existing user-edited values when they're set; only
    -- fall back to the OAuth-provided values for users who never
    -- customised. This is what stops the "my photo keeps changing"
    -- bug — see migration comment for the full story.
    full_name    = coalesce(public.users.full_name, excluded.full_name),
    avatar_url   = coalesce(public.users.avatar_url, excluded.avatar_url),
    provider     = excluded.provider,
    last_sign_in = excluded.last_sign_in;
  return new;
end;
$$;
