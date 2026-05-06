import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { invalidateAppSettingsCache } from '@/lib/app-settings';

// Admin lever: GET reads, POST flips, ai_call_scoring_enabled.
// When false the AI side of calls is paused — CTM data still flows
// into public.calls, but no scoring runs and nothing new is queued.
//
// Reads run via the user's RLS-bound client (the `app_settings_select_authed`
// policy lets any authed user read), then we re-check is_admin for writes.
// Writes go through the service-role client so we can also stamp updated_by /
// updated_at without needing a separate RLS policy.

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null as null, isAdmin: false, supabase };
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  return { user, isAdmin: !!data?.is_admin, supabase };
}

export async function GET() {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('app_settings')
    .select('ai_call_scoring_enabled, ai_call_scoring_updated_at, ai_call_scoring_updated_by')
    .eq('id', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ai_call_scoring_enabled: data?.ai_call_scoring_enabled ?? true,
    ai_call_scoring_updated_at: data?.ai_call_scoring_updated_at ?? null,
    ai_call_scoring_updated_by: data?.ai_call_scoring_updated_by ?? null,
  });
}

export async function POST(req: NextRequest) {
  const { user, isAdmin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Body must be { enabled: boolean }' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('app_settings')
    .upsert(
      {
        id: true,
        ai_call_scoring_enabled: body.enabled,
        ai_call_scoring_updated_at: new Date().toISOString(),
        ai_call_scoring_updated_by: user.id,
      },
      { onConflict: 'id' },
    )
    .select('ai_call_scoring_enabled, ai_call_scoring_updated_at, ai_call_scoring_updated_by')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateAppSettingsCache();

  return NextResponse.json({
    ai_call_scoring_enabled: data.ai_call_scoring_enabled,
    ai_call_scoring_updated_at: data.ai_call_scoring_updated_at,
    ai_call_scoring_updated_by: data.ai_call_scoring_updated_by,
  });
}
