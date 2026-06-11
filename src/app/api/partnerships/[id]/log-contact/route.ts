import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/[id]/log-contact
//
// Partner and contact history are ONE stream: the canonical log row
// goes into contact_logs (via the partner's linked contact), so a
// touchpoint logged from /feather/partnerships shows up in the
// contact's history on /feather/contacts and vice versa. A
// partner_logs row is still written (back-compat for anything that
// reads it) with contact_log_id pointing at its canonical twin.
// Denormalised last_contact_* columns are bumped on BOTH rows.

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

  // Resolve the partner's linked contact — the canonical home for
  // the log. Partners created before the unification may lack one;
  // create it on the fly so the history always has a contact anchor.
  const { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, name, poc, type, location, contact_id')
    .eq('id', id)
    .maybeSingle();
  if (pErr || !partner) return NextResponse.json({ error: pErr?.message ?? 'Partner not found' }, { status: pErr ? 500 : 404 });

  let contactId = (partner as { contact_id: string | null }).contact_id;
  if (!contactId) {
    const p = partner as { name: string; poc: string | null; type: string | null; location: string | null };
    const { data: created, error: cErr } = await admin
      .from('contacts')
      .insert({
        name: (p.poc && p.poc.trim()) || p.name,
        company: p.poc && p.poc.trim() ? p.name : null,
        role: p.type,
        location: p.location,
        source: 'auto-from-partner-log',
        source_partner_id: id,
      })
      .select('id')
      .maybeSingle();
    if (cErr || !created) return NextResponse.json({ error: cErr?.message ?? 'Could not create contact' }, { status: 500 });
    contactId = (created as { id: string }).id;
    await admin.from('partners').update({ contact_id: contactId }).eq('id', id);
  }

  // Canonical log row — contact_logs.
  const { data: contactLog, error: clErr } = await admin
    .from('contact_logs')
    .insert({ contact_id: contactId, method, comments, contacted_by: user.id, contacted_at: now })
    .select('id')
    .maybeSingle();
  if (clErr) return NextResponse.json({ error: clErr.message }, { status: 500 });

  // Back-compat twin in partner_logs, pointed at its canonical row.
  const { error: logErr } = await admin.from('partner_logs').insert({
    partner_id: id,
    method,
    comments,
    contacted_by: user.id,
    contacted_at: now,
    contact_log_id: (contactLog as { id: string } | null)?.id ?? null,
  });
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Bump the contact's denormalised last-contact fields too, so the
  // contacts grid reflects the partner-side touchpoint immediately.
  await admin
    .from('contacts')
    .update({ last_contact_at: now, last_contact_by: user.id, last_contact_method: method, last_contact_comments: comments })
    .eq('id', contactId);

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
