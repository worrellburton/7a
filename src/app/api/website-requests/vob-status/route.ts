import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/vob-status
//   body: { id, status }
//
// Update the triage status of a single VOB submission. The
// allowed values are pinned here (and in the DB CHECK constraint)
// so a typo on either side fails fast.

export const dynamic = 'force-dynamic';

const ALLOWED = ['new', 'qualifying', 'short_term', 'closed'] as const;
type Allowed = typeof ALLOWED[number];

type Body = { id?: string; status?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!status || !(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `status must be one of ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .update({ status: status as Allowed })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ id: data.id, status: data.status });
}
