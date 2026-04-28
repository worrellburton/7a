import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/vob-admin-notes
//   body: { id, notes }
//
// Save the admin-facing notes column on a VOB row. Separate from
// the customer-submitted `notes` field (that one comes off the
// website form and is read-only here) and from per-attempt notes
// (those live in attempts[].note). Empty / whitespace-only notes
// are stored as null so the column reads cleanly in the table.

export const dynamic = 'force-dynamic';

type Body = { id?: string; notes?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { id, notes } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // 4000 chars is generous for a per-VOB scratchpad.
  const trimmed = (notes ?? '').trim().slice(0, 4000);
  const value = trimmed.length === 0 ? null : trimmed;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .update({ admin_notes: value })
    .eq('id', id)
    .select('id, admin_notes')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ id: data.id, admin_notes: data.admin_notes ?? null });
}
