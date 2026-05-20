-- Email Campaigns — feather's marketing-email build → preview →
-- recipients → send flow. Built across 10 phases (this file
-- ships phase 1: schema + page registration). The flow mirrors
-- /app/social-media/create: marketer types a paragraph of intent,
-- picks images, toggles "use logos" / "link to website", optionally
-- features a blog + an employee, then Claude builds an HTML email
-- which can be iterated, saved, addressed to contacts (subject is
-- auto-calculated), finalized, and sent via Resend.
--
-- Tables:
--   email_campaigns           — the campaign row itself (one per build)
--   email_campaign_recipients — fanout list of contact_id ↔ campaign
--                               with per-recipient send status
--   email_campaign_sends      — append-only audit of every Resend
--                               send attempt for traceability

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),

  -- Authoring input (Phase 3)
  prompt text not null default '',
  image_urls text[] not null default '{}',
  use_logos boolean not null default false,
  link_to_website boolean not null default false,
  featured_blog_id uuid references public.blogs(id) on delete set null,
  featured_employee_id uuid references public.users(id) on delete set null,

  -- Generated artifacts (Phase 4-5)
  generated_html text,
  generated_subject text,
  last_iteration_note text,
  iteration_count int not null default 0,

  -- Phase 6+ — selected recipients + send lifecycle
  status text not null default 'draft'
    check (status in ('draft', 'recipients', 'finalizing', 'sending', 'sent', 'failed')),
  sent_at timestamptz,

  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_campaigns_created_at_idx
  on public.email_campaigns(created_at desc);
create index if not exists email_campaigns_status_idx
  on public.email_campaigns(status);

drop trigger if exists email_campaigns_set_updated_at on public.email_campaigns;
create trigger email_campaigns_set_updated_at
  before update on public.email_campaigns
  for each row execute function public.set_updated_at();

alter table public.email_campaigns enable row level security;

drop policy if exists email_campaigns_select_authed on public.email_campaigns;
create policy email_campaigns_select_authed
  on public.email_campaigns for select to authenticated using (true);

drop policy if exists email_campaigns_write_authed on public.email_campaigns;
create policy email_campaigns_write_authed
  on public.email_campaigns for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null,
  send_status text not null default 'pending'
    check (send_status in ('pending', 'sent', 'failed', 'skipped')),
  send_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists email_campaign_recipients_unique
  on public.email_campaign_recipients(campaign_id, contact_id);
create index if not exists email_campaign_recipients_campaign_idx
  on public.email_campaign_recipients(campaign_id);

alter table public.email_campaign_recipients enable row level security;

drop policy if exists email_campaign_recipients_select_authed on public.email_campaign_recipients;
create policy email_campaign_recipients_select_authed
  on public.email_campaign_recipients for select to authenticated using (true);

drop policy if exists email_campaign_recipients_write_authed on public.email_campaign_recipients;
create policy email_campaign_recipients_write_authed
  on public.email_campaign_recipients for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

create table if not exists public.email_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  recipient_id uuid references public.email_campaign_recipients(id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text,
  ok boolean not null default false,
  status_code int,
  response text,
  sent_at timestamptz not null default now()
);
create index if not exists email_campaign_sends_campaign_idx
  on public.email_campaign_sends(campaign_id, sent_at desc);

alter table public.email_campaign_sends enable row level security;

drop policy if exists email_campaign_sends_select_authed on public.email_campaign_sends;
create policy email_campaign_sends_select_authed
  on public.email_campaign_sends for select to authenticated using (true);

drop policy if exists email_campaign_sends_write_authed on public.email_campaign_sends;
create policy email_campaign_sends_write_authed
  on public.email_campaign_sends for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- Register the page so it appears in the sidebar nav.
-- adminOnly=false to match the social-media authoring posture
-- inside Marketing; departmentId = Marketing & Admissions so it
-- groups with the other marketing tools.
insert into public.page_permissions (path, admin_only, section, sort_order, allowed_departments, department_id)
values ('/app/email-campaigns', false, 'nav', 26, '{}'::uuid[], 'dfde0b96-c605-40dd-84e5-281af2f6d8e9')
on conflict (path) do update set
  admin_only = excluded.admin_only,
  section = excluded.section,
  sort_order = excluded.sort_order,
  allowed_departments = excluded.allowed_departments,
  department_id = excluded.department_id;
