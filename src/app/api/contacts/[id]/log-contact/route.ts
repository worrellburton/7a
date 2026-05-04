import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/[id]/log-contact
//
// Records an interaction in public.contact_logs AND bumps the
// denormalised last_contact_* columns on public.contacts so the
// grid stays cheap to read. The grid uses optimistic UI on the
// client side; this route is the source of truth.

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set(['Phone', 'In Person', 'Left Message']);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { method?: string; comments?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const method = typeof body.method === 'string' ? body.method.trim() : '';
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: 'method must be Phone, In Person, or Left Message' }, { status: 400 });
  }
  const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;

  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { error: logErr } = await admin.from('contact_logs').insert({
    contact_id: id,
    method,
    comments,
    contacted_by: user.id,
    contacted_at: now,
  });
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  const { data, error: updErr } = await admin
    .from('contacts')
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
