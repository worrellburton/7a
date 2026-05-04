import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// POST /api/incoming-users/[id]/classify
//   body: { kind: 'staff' | 'guest' | 'alumni', status?: 'active' | 'denied' }
//
// Super-admin only. Sets users.user_kind plus optionally flips
// users.status (e.g. promote pending staff to active, mark someone
// denied). The team page filters on user_kind = 'staff', so flipping
// to guest/alumni also hides them from the public team grid.

export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = new Set(['staff', 'guest', 'alumni']);
const ALLOWED_STATUSES = new Set(['active', 'on_hold', 'denied']);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if ('response' in auth) return auth.response;
  const { id } = await ctx.params;

  let body: { kind?: string; status?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const kind = typeof body.kind === 'string' ? body.kind.trim() : '';
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: 'kind must be staff, guest, or alumni' }, { status: 400 });
  }
  const patch: Record<string, unknown> = { user_kind: kind };

  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }

  // Guests + alumni shouldn't appear on the public-facing team grid.
  // Force public_team off when classifying away from staff so the
  // marketing site picks up the change immediately.
  if (kind !== 'staff') patch.public_team = false;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('users')
    .update(patch)
    .eq('id', id)
    .select('id, user_kind, status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
