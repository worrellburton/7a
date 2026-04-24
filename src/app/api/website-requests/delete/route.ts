import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/website-requests/delete
//   body: { kind: 'vob' | 'contact', id: string }
//
// Admin-only hard delete of a single submission row. For VOB rows we
// also remove the associated insurance-card files from the private
// `vob-cards` bucket so orphan blobs don't pile up.

export const dynamic = 'force-dynamic';

type Body = { kind?: 'vob' | 'contact'; id?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { kind, id } = body;
  if (!id || (kind !== 'vob' && kind !== 'contact')) {
    return NextResponse.json({ error: 'Missing or invalid kind/id' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  if (kind === 'vob') {
    // Grab card paths first so we can also clear the storage blobs.
    const { data: row } = await admin
      .from('vob_requests')
      .select('card_front_path, card_back_path')
      .eq('id', id)
      .maybeSingle();
    const paths = [row?.card_front_path, row?.card_back_path].filter((p): p is string => !!p);
    if (paths.length > 0) {
      await admin.storage.from('vob-cards').remove(paths);
    }
  }

  const table = kind === 'vob' ? 'vob_requests' : 'contact_submissions';
  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id });
}
