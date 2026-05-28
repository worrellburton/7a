-- /app/outreach was renamed to /app/contacts (the dir moved + the
-- PagePermissions registry now lists the new path). Repoint any
-- stored overrides + activity-feed deep links so deny/allow rules
-- and the global activity feed don't quietly stop matching when the
-- code lands.
update public.user_page_permissions
set path = '/app/contacts'
where path = '/app/outreach';

update public.activity_log
set target_path = '/app/contacts'
where target_path = '/app/outreach';
