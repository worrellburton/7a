import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Social Media is super-admin-only. Posting on the Ayrshare account
// publishes under the Seven Arrows brand, so we limit the surface
// to users with users.is_super_admin = true. Every route under
// /api/social-media/* calls this gate; the only exception is the
// cron at /api/cron/social-media/analytics, which authenticates via
// CRON_SECRET (no user context).

type Allowed = { user: User; isSuperAdmin: true; response?: undefined };
type Denied = { response: NextResponse; user?: undefined; isSuperAdmin?: undefined };

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
