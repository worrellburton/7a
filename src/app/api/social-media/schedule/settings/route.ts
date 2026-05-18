import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// GET  /api/social-media/schedule/settings — read the scheduler
//      master toggle. Visible to any authenticated user via RLS so
//      the UI can disable / glow without a super-admin gate.
// PUT  /api/social-media/schedule/settings — flip the toggle.
//      Super-admin only since arming the scheduler causes real
//      posts to fire to the org's connected channels.

export const dynamic = 'force-dynamic';

const ROW_ID = 1;

export async function GET() {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('social_media_schedule_settings')
    .select('is_enabled, updated_at, updated_by')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    is_enabled: !!data?.is_enabled,
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  });
}

interface PutBody { is_enabled?: boolean }

export async function PUT(req: NextRequest) {
  void req;
  const supabase = await getServerSupabase();
  const gate = await requireSuperAdmin(supabase);
  if (gate.response) return gate.response;

  let body: PutBody = {};
  try { body = (await req.json()) as PutBody; } catch { /* allow empty */ }
  if (typeof body.is_enabled !== 'boolean') {
    return NextResponse.json({ error: 'is_enabled must be a boolean' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('social_media_schedule_settings')
    .upsert(
      { id: ROW_ID, is_enabled: body.is_enabled, updated_at: new Date().toISOString(), updated_by: gate.user.id },
      { onConflict: 'id' },
    )
    .select('is_enabled, updated_at, updated_by')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    is_enabled: data.is_enabled,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  });
}
