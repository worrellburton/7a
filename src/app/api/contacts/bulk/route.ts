import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/bulk — accept-into-DB endpoint for the "Add with
// Claude" flow. Browser sends an array of fully-validated suggested
// contacts (the user checked the ones they wanted); we trim, source-tag
// as 'add-with-claude' so admissions can later filter on provenance,
// and INSERT in one round trip. Returns the inserted rows so the grid
// can prepend them without a full refetch.

export const dynamic = 'force-dynamic';

interface BulkBody {
  contacts?: Array<{
    name?: string;
    company?: string | null;
    company_website?: string | null;
    type?: string | string[] | null;
    specialty?: string | null;
    role?: string | null;
    phone?: string | null;
    email?: string | null;
    location?: string | null;
    notes?: string | null;
  }>;
}

function trim(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function normaliseTypeArray(value: unknown): string[] | null {
  let raw: unknown[];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string') raw = value.split(',');
  else return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const t = v.trim().slice(0, 60);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length === 0 ? null : out;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: BulkBody = {};
  try { body = (await req.json()) as BulkBody; } catch { /* allow empty */ }
  const inbound = Array.isArray(body.contacts) ? body.contacts : [];
  if (inbound.length === 0) {
    return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
  }
  // Hard cap so a runaway client can't insert thousands of rows.
  const slice = inbound.slice(0, 50);

  const rows: Array<Record<string, unknown>> = [];
  for (const c of slice) {
    const name = trim(c?.name, 200);
    if (!name) continue;
    rows.push({
      name,
      company: trim(c?.company, 200),
      company_website: trim(c?.company_website, 500),
      type: normaliseTypeArray(c?.type),
      specialty: trim(c?.specialty, 200),
      role: trim(c?.role, 200),
      phone: trim(c?.phone, 60),
      email: trim(c?.email, 200),
      location: trim(c?.location, 200),
      notes: trim(c?.notes, 4000),
      source: 'add-with-claude',
      created_by: user.id,
    });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'no valid contacts to insert' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contacts')
    .insert(rows)
    .select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Credit the adder with one 'New Contact' log per inserted
  // contact so the outreach activity feed + home log-rain shows
  // the add as a touchpoint. Failures are logged but never roll
  // back the contacts that landed — losing a log row is less bad
  // than orphaning the records.
  const insertedRows = (data ?? []) as Array<{ id: string }>;
  if (insertedRows.length > 0) {
    const nowIso = new Date().toISOString();
    const logRows = insertedRows.map((r) => ({
      contact_id: r.id,
      method: 'New Contact',
      comments: 'Contact added.',
      contacted_by: user.id,
      contacted_at: nowIso,
      duration_seconds: 0,
    }));
    const { error: logErr } = await admin.from('contact_logs').insert(logRows);
    if (logErr) console.warn('[contacts/bulk] new-contact log insert failed:', logErr.message);
    const ids = insertedRows.map((r) => r.id);
    await admin.from('contacts').update({
      last_contact_at: nowIso,
      last_contact_by: user.id,
      last_contact_method: 'New Contact',
      last_contact_comments: 'Contact added.',
    }).in('id', ids);
  }

  return NextResponse.json({ inserted: data ?? [], count: (data ?? []).length }, { status: 201 });
}
