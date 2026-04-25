import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/google/oauth/status — admin only.
// Reports whether a Google refresh token is on file and which source
// it came from (DB vs the legacy env-var fallback). Used by the
// "Reconnect Google" UI to show the last-connected timestamp.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
