import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/[id]/log-contact
//
// Records an interaction in public.partner_logs AND bumps the
// denormalised last_contact_* columns on public.partners so the
// grid stays cheap to read. Same shape as the contacts equivalent
// at /api/contacts/[id]/log-contact.

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set([
  'Phone',
  'In Person',
  'Left Message',
  'Text Message',
  'Email',
  'Smoke Signals',
  'Walkie Talkie',
  'Tin Can Phone',
]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { method?: string; comments?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const method = typeof body.method === 'string' ? body.method.trim() : '';
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` }, { status: 400 });
  }
  const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;

  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { error: logErr } = await admin.from('partner_logs').insert({
    partner_id: id,
    method,
    comments,
    contacted_by: user.id,
    contacted_at: now,
  });
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  const { data, error: updErr } = await admin
    .from('partners')
    .update({
      last_contact_at: now,
      last_contact_by: user.id,
      last_contact_method: method,
      last_contact_comments: comments,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json(data);
}
