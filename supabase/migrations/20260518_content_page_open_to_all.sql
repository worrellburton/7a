-- /app/content was previously gated as admin_only so only admins
-- could see the blog pipeline in the sidebar. The page itself now
-- distinguishes between view (everyone signed in) and write (super
-- admin only), so the sidebar gate drops to false; PageGuard + the
-- in-page UI handle the rest. Every /api/content/* write route still
-- enforces requireSuperAdmin server-side.
update public.page_permissions
set admin_only = false
where path = '/app/content';
