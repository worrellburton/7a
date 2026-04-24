import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/delete
//   body: { kind: 'vob' | 'contact', id: string }
//
// Accessible to admins and Marketing & Admissions department
// members. Hard delete of a single submission row. For VOB rows we
// also remove the associated insurance-card files from the private
// `vob-cards` bucket so orphan blobs don't pile up.

export const dynamic = 'force-dynamic';

type Body = { kind?: 'vob' | 'contact'; id?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

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
