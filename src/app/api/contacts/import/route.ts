import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/import
//   body: { rows: ContactInput[] }
//
// Bulk-create contacts from a CSV the client parsed locally. We
// re-validate every row server-side so a malformed CSV can't bypass
// the `name is required` rule, then insert in chunks so a single
// failure doesn't roll back the whole upload. Returns
// { created, skipped, errors[] } so the import modal can surface
// row-level feedback.

export const dynamic = 'force-dynamic';

interface ContactInput {
  name?: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  notes?: string | null;
}

function trim(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { rows?: ContactInput[] } = {};
  try { body = (await req.json()) as { rows?: ContactInput[] }; } catch { /* allow empty */ }
  const incoming = Array.isArray(body.rows) ? body.rows : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: 'rows is empty' }, { status: 400 });
  }
  if (incoming.length > 500) {
    return NextResponse.json({ error: 'CSV too large — split into batches of 500 or fewer rows' }, { status: 413 });
  }

  const inserts: Record<string, unknown>[] = [];
  const errors: { row: number; reason: string }[] = [];
  incoming.forEach((raw, idx) => {
    const name = trim(raw?.name, 200);
    if (!name) {
      errors.push({ row: idx + 1, reason: 'Missing name' });
      return;
    }
    inserts.push({
      name,
      role: trim(raw.role, 200),
      phone: trim(raw.phone, 60),
      email: trim(raw.email, 200),
      location: trim(raw.location, 200),
      notes: trim(raw.notes, 4000),
      created_by: user.id,
    });
  });

  if (inserts.length === 0) {
    return NextResponse.json({ created: 0, skipped: incoming.length, errors }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const CHUNK = 100;
  let created = 0;
  const insertedIds: string[] = [];
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error, data } = await admin.from('contacts').insert(slice).select('id');
    if (error) {
      errors.push({ row: i + 1, reason: `Batch starting at row ${i + 1} failed: ${error.message}` });
      continue;
    }
    created += data?.length ?? 0;
    for (const row of (data ?? []) as Array<{ id: string }>) insertedIds.push(row.id);
  }

  // Per-row 'Data Entry' touchpoint so each imported contact shows
  // up in the outreach activity feed + home log-rain attributed to
  // the importer. Insert logs in chunks too so a 500-row CSV
  // doesn't blow the request body limit.
  if (insertedIds.length > 0) {
    const nowIso = new Date().toISOString();
    const LOG_CHUNK = 100;
    for (let i = 0; i < insertedIds.length; i += LOG_CHUNK) {
      const slice = insertedIds.slice(i, i + LOG_CHUNK);
      const { error: logErr } = await admin.from('contact_logs').insert(
        slice.map((id) => ({
          contact_id: id,
          method: 'Data Entry',
          comments: 'Contact added via CSV import.',
          contacted_by: user.id,
          contacted_at: nowIso,
          duration_seconds: 0,
        })),
      );
      if (logErr) {
        console.warn('[contacts/import] data-entry log insert failed:', logErr.message);
        // Don't include in user-facing errors[] — the contacts
        // themselves landed; only the activity feed is impacted.
      }
    }
    await admin.from('contacts').update({
      last_contact_at: nowIso,
      last_contact_by: user.id,
      last_contact_method: 'Data Entry',
      last_contact_comments: 'Contact added via CSV import.',
    }).in('id', insertedIds);
  }

  return NextResponse.json({
    created,
    skipped: incoming.length - created,
    errors,
  });
}
