-- "Text me whenever" opt-in for alumni. When true (and the phone is
-- shown publicly), the map + peer-support surfaces show a "Text
-- anytime" affordance with an sms: deep-link in addition to the
-- tap-to-call card. Defaults false so it's strictly opt-in.
alter table public.alumni_profiles
  add column if not exists text_ok boolean not null default false;
