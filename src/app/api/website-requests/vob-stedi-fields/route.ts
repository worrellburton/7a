import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/vob-stedi-fields
//   body: { id, fields: Partial<StediFields> }
//
// Updates the insurance-card / Stedi-eligibility fields on a single
// VOB row. Each field is independently optional so the inline editor
// can save piecemeal — sending null clears the column.

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'member_id',
  'group_number',
  'payer_id',
  'payer_name',
  'subscriber_relationship',
  'subscriber_first_name',
  'subscriber_last_name',
  'subscriber_dob',
] as const;

type Field = (typeof ALLOWED_FIELDS)[number];

type Body = {
  id?: string;
  fields?: Partial<Record<Field, string | null>>;
};

function clean(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, 200);
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const { id, fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in fields) update[k] = clean(fields[k]);
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('vob_requests')
    .update(update)
    .eq('id', id)
    .select(ALLOWED_FIELDS.join(', '))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ id, fields: data });
}
