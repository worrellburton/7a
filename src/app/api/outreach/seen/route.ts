import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/outreach/seen — returns the caller's last_outreach_seen_at
// POST /api/outreach/seen — set last_outreach_seen_at. Body { at?: string }
//                          stamps it to the supplied ISO string, or
//                          falls back to now() server-side.
//
// Drives the "new since you were last here" highlight on /feather/outreach:
// any contact whose updated_at is greater than the user's seen_at
// renders in a primary tone and bubbles to the top of the sort.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('users')
    .select('last_outreach_seen_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ seen_at: (data?.last_outreach_seen_at as string | null) ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { at?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const at = typeof body.at === 'string' && !Number.isNaN(Date.parse(body.at))
    ? new Date(body.at).toISOString()
    : new Date().toISOString();

  const admin = getAdminSupabase();
  const { error } = await admin
    .from('users')
    .update({ last_outreach_seen_at: at })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ seen_at: at });
}
