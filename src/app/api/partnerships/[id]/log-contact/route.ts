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

  let body: { method?: string; comments?: string; follow_up_days?: number | null } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const method = typeof body.method === 'string' ? body.method.trim() : '';
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` }, { status: 400 });
  }
  const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;

  // Optional follow-up: null/0 leaves the existing follow_up_at
  // untouched; a positive integer (capped at 365) writes
  // now() + days. Negative or NaN values are rejected as bad input.
  let followUpAt: string | null | undefined = undefined;
  if (body.follow_up_days === null) {
    followUpAt = null;
  } else if (typeof body.follow_up_days === 'number' && Number.isFinite(body.follow_up_days)) {
    const days = Math.floor(body.follow_up_days);
    if (days > 0 && days <= 365) {
      followUpAt = new Date(Date.now() + days * 86400000).toISOString();
    } else if (days === 0) {
      followUpAt = null;
    } else {
      return NextResponse.json({ error: 'follow_up_days must be between 1 and 365' }, { status: 400 });
    }
  }

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

  const update: Record<string, unknown> = {
    last_contact_at: now,
    last_contact_by: user.id,
    last_contact_method: method,
    last_contact_comments: comments,
  };
  if (followUpAt !== undefined) update.follow_up_at = followUpAt;

  const { data, error: updErr } = await admin
    .from('partners')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json(data);
}
