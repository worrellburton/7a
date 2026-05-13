import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/contacts/[id]/history/[logId] — edit one history entry
// DELETE /api/contacts/[id]/history/[logId] — remove one history entry
//
// Editing or deleting a contact_log is gated to the rep who created
// it (contacted_by = user.id). After either operation, we re-read
// the newest remaining log for the contact and sync the denormalised
// last_contact_* columns on `contacts` so the grid's "last contact"
// chip doesn't go stale. If no logs remain after a delete, those
// columns are cleared back to null.

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set(['Phone', 'In Person', 'Left Message', 'Text Message']);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; logId: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, logId } = await ctx.params;

  let body: { method?: unknown; comments?: unknown; duration_seconds?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const admin = getAdminSupabase();

  // Author-only edit. Admins are intentionally NOT allowed to ghost-
  // edit someone else's entry — if they need to correct a record the
  // expected path is to ask the original rep, or delete + re-log.
  const { data: existing } = await admin
    .from('contact_logs')
    .select('id, contact_id, contacted_by, method, comments, duration_seconds')
    .eq('id', logId)
    .eq('contact_id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.contacted_by !== user.id) {
    return NextResponse.json({ error: 'You can only edit entries you logged' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.method === 'string') {
    const m = body.method.trim();
    if (!ALLOWED_METHODS.has(m)) {
      return NextResponse.json({ error: 'method must be Phone, In Person, Left Message, or Text Message' }, { status: 400 });
    }
    patch.method = m;
  }
  if (body.comments === null || typeof body.comments === 'string') {
    patch.comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 4000) : null;
  }
  if (body.duration_seconds !== undefined) {
    const raw = typeof body.duration_seconds === 'number'
      ? body.duration_seconds
      : typeof body.duration_seconds === 'string' && body.duration_seconds.trim()
      ? Number(body.duration_seconds)
      : NaN;
    if (!Number.isFinite(raw) || raw < 0 || raw > 60 * 60 * 12) {
      return NextResponse.json({ error: 'duration_seconds must be 0–43200' }, { status: 400 });
    }
    patch.duration_seconds = Math.round(raw);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error: updErr } = await admin
    .from('contact_logs')
    .update(patch)
    .eq('id', logId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await syncLastContactColumns(admin, id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; logId: string }> }) {
  const user = await getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, logId } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from('contact_logs')
    .select('id, contact_id, contacted_by')
    .eq('id', logId)
    .eq('contact_id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.contacted_by !== user.id) {
    return NextResponse.json({ error: 'You can only delete entries you logged' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('contact_logs').delete().eq('id', logId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await syncLastContactColumns(admin, id);

  return NextResponse.json({ ok: true });
}

// Re-read the newest remaining log for a contact and write its
// fields back onto `contacts.last_contact_*`. Called after both
// PATCH and DELETE so the denormalised view always matches reality;
// if the contact now has zero logs, those columns are cleared.
async function syncLastContactColumns(admin: ReturnType<typeof getAdminSupabase>, contactId: string): Promise<void> {
  const { data: newest } = await admin
    .from('contact_logs')
    .select('method, comments, contacted_at, contacted_by')
    .eq('contact_id', contactId)
    .order('contacted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  await admin
    .from('contacts')
    .update({
      last_contact_at: newest?.contacted_at ?? null,
      last_contact_by: newest?.contacted_by ?? null,
      last_contact_method: newest?.method ?? null,
      last_contact_comments: newest?.comments ?? null,
    })
    .eq('id', contactId);
}
