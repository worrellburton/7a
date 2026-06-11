import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requirePageAccess } from '@/lib/page-access';

// GET /api/google/oauth/status — readable by any user the
// /feather/analytics page is open to. Reports whether a Google refresh
// token is on file and which source it came from (DB vs the legacy
// env-var fallback). The Analytics page renders the "Connect
// Google" banner based on this, so non-admin viewers who have been
// granted /feather/analytics need to read the status too (only the
// /oauth/start + /oauth/callback writes stay admin-only).

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin, isSuperAdmin, error: authError } = await requirePageAccess('/feather/analytics');
  if (authError) return authError;

  const admin = getAdminSupabase();
  const { data } = await admin
    .from('google_oauth_tokens')
    .select('updated_at, scope, updated_by')
    .eq('id', 'primary')
    .maybeSingle();

  const hasDb = !!data;
  const hasEnv = !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const redirectConfigured = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_REDIRECT_URI);

  return NextResponse.json({
    connected: hasDb || hasEnv,
    source: hasDb ? 'db' : hasEnv ? 'env' : null,
    updated_at: data?.updated_at ?? null,
    scope: data?.scope ?? null,
    can_reconnect: redirectConfigured,
  });
}
