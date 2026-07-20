import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

const SOCIAL_PATH = '/feather/social-media';
const forbidden = () =>
  NextResponse.json({ error: 'Forbidden — you do not have access to Social Media.' }, { status: 403 });

// Social Media is a two-tier surface:
//   - VIEWING + drafting + submitting-for-review is open to anyone
//     with access to the /feather/social-media page (Marketing dept
//     membership or a per-user grant) — use requireSocialViewAccess.
//   - PUBLISHING to the live Ayrshare/brand accounts (post, delete,
//     connect, posting toggle, queue slots) stays super-admin only —
//     use requireSuperAdmin.
// Every route under /api/social-media/* calls one of these; the only
// exception is the cron at /api/cron/social-media/analytics, which
// authenticates via CRON_SECRET (no user context).

type Allowed = { user: User; isSuperAdmin: true; response?: undefined };
type ViewAllowed = { user: User; isSuperAdmin: boolean; response?: undefined };
type Denied = { response: NextResponse; user?: undefined; isSuperAdmin?: undefined };

// Page-access gate for the read/draft surface. Mirrors the client's
// canSeePage for /feather/social-media exactly — so a user the sidebar
// surfaces the page to also passes the server gate — instead of the
// generic requirePageAccess, which only honours admin + per-user grants
// and would 403 a Marketing-department member on every fetch. Returns
// the same shape as requireSuperAdmin (`response` on denial, `user` on
// success) so route bodies only swap the call.
export async function requireSocialViewAccess(): Promise<ViewAllowed | Denied> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = getAdminSupabase();
  const { data: urow } = await admin
    .from('users')
    .select('is_admin, is_super_admin, user_kind, department_id')
    .eq('id', user.id)
    .maybeSingle();
  const isSuperAdmin = urow?.is_super_admin === true;
  if (urow?.is_admin === true || isSuperAdmin) {
    return { user, isSuperAdmin };
  }

  // Explicit per-user override wins over department rules either way.
  const { data: override } = await admin
    .from('user_page_permissions')
    .select('can_view')
    .eq('user_id', user.id)
    .eq('path', SOCIAL_PATH)
    .maybeSingle();
  if (override?.can_view === false) return { response: forbidden() };
  if (override?.can_view === true) return { user, isSuperAdmin: false };

  // Staff-only surface: alumni / guests never reach it via departments.
  if (urow?.user_kind && urow.user_kind !== 'staff') return { response: forbidden() };

  // Department gate — mirror isPageAllowedForDepartmentSet: empty
  // allowed_departments = all staff; else the user's primary department
  // or a granted extra department must be in the list.
  const { data: prow } = await admin
    .from('page_permissions')
    .select('admin_only, allowed_departments')
    .eq('path', SOCIAL_PATH)
    .maybeSingle();
  if (prow?.admin_only === true) return { response: forbidden() }; // admins already returned above
  const allowed: string[] = Array.isArray(prow?.allowed_departments) ? prow.allowed_departments : [];
  if (allowed.length === 0) return { user, isSuperAdmin: false };

  const depts = new Set<string>();
  if (urow?.department_id) depts.add(urow.department_id);
  const { data: extras } = await admin
    .from('user_extra_departments')
    .select('department_id')
    .eq('user_id', user.id);
  for (const e of (extras ?? []) as Array<{ department_id: string }>) depts.add(e.department_id);
  if (allowed.some((d) => depts.has(d))) return { user, isSuperAdmin: false };
  return { response: forbidden() };
}

export async function requireSuperAdmin(
  supabase: SupabaseClient,
): Promise<Allowed | Denied> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: row } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (row?.is_super_admin !== true) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden — super-admin access required.' },
        { status: 403 },
      ),
    };
  }
  return { user, isSuperAdmin: true };
}
