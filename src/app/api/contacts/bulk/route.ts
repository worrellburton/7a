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
    type?: string | null;
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
  const slice = inbound.slice(0, 30);

  const rows: Array<Record<string, unknown>> = [];
  for (const c of slice) {
    const name = trim(c?.name, 200);
    if (!name) continue;
    rows.push({
      name,
      company: trim(c?.company, 200),
      company_website: trim(c?.company_website, 500),
      type: trim(c?.type, 60),
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
  return NextResponse.json({ inserted: data ?? [], count: (data ?? []).length }, { status: 201 });
}
