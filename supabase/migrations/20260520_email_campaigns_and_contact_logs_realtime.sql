-- Add contact_logs + email-campaign tables to the supabase_realtime
-- publication so any user with the page open sees a recipient row
-- flip to "sent" the moment the send loop processes it, and the
-- contact's activity log surfaces the "Sent email campaign: ..." log
-- entry live across users.

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contact_logs') then
    execute 'alter publication supabase_realtime add table public.contact_logs';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'email_campaigns') then
    execute 'alter publication supabase_realtime add table public.email_campaigns';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'email_campaign_recipients') then
    execute 'alter publication supabase_realtime add table public.email_campaign_recipients';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'email_campaign_sends') then
    execute 'alter publication supabase_realtime add table public.email_campaign_sends';
  end if;
end $$;
