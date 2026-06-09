import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import { readFlag } from '@/lib/app-flags';

// GET  /api/social-media/posting-toggle  → { enabled: boolean }
// PUT  /api/social-media/posting-toggle  → { enabled: boolean } (super admin only)
//
// Flips the global kill switch the POST route reads. The flag's
// read-side stays open (the page just needs to know the state)
// and the write-side enforces super-admin via the same gate the
// rest of /api/social-media uses.

export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = await readFlag<boolean>('social_posting_enabled', false);
  return NextResponse.json({ enabled });
}

export async function PUT(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  let body: { enabled?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const enabled = body.enabled === true;

  const admin = getAdminSupabase();
  const { error } = await admin.from('app_flags').upsert({
    key: 'social_posting_enabled',
    value: enabled,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled });
}
