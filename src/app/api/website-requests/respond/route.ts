import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/website-requests/respond
//   body: { kind: 'vob' | 'contact', id: string, clear?: boolean }
//
// Admin-only marker that "I responded to this submission." Writes
// responded_at = now() and responded_by = admin user id onto the
// appropriate row. Passing `clear: true` nulls both (in case someone
// clicks by accident).
//
// Returns the updated responded_at / responded_by / responder_name.

export const dynamic = 'force-dynamic';

type Body = {
  kind?: 'vob' | 'contact';
  id?: string;
  clear?: boolean;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase
    .from('users')
    .select('is_admin, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { kind, id, clear } = body;

  if (!id || (kind !== 'vob' && kind !== 'contact')) {
    return NextResponse.json({ error: 'Missing or invalid kind/id' }, { status: 400 });
  }

  const table = kind === 'vob' ? 'vob_requests' : 'contact_submissions';
  const admin = getAdminSupabase();

  const patch = clear
    ? { responded_at: null, responded_by: null }
    : { responded_at: new Date().toISOString(), responded_by: user.id };

  const { data, error } = await admin
    .from(table)
    .update(patch)
    .eq('id', id)
    .select('id, responded_at, responded_by')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    responded_at: data.responded_at,
    responded_by: data.responded_by,
    responder_name: clear ? null : (me.full_name ?? null),
    responder_avatar_url: clear ? null : (me.avatar_url ?? null),
  });
}
