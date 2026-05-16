import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/rename-value
//
// Bulk-edit a dropdown option across every partner row. Mirrors
// /api/contacts/rename-value — see that route for the shape. Today
// partners has only scalar dropdown columns (specialty, type); if
// either gets migrated to text[] later, add it to ARRAY_COLUMNS and
// the array branch picks it up.

export const dynamic = 'force-dynamic';

const SCALAR_COLUMNS = new Set(['specialty', 'type']);
const ALL_COLUMNS = new Set([...SCALAR_COLUMNS]);

interface Body { column?: string; from?: string; to?: string | null }

function trim(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* allow empty */ }
  const column = typeof body.column === 'string' ? body.column : '';
  const from = trim(body.from);
  const to = body.to === null ? null : trim(body.to);

  if (!ALL_COLUMNS.has(column)) return NextResponse.json({ error: 'invalid column' }, { status: 400 });
  if (!from) return NextResponse.json({ error: 'from is required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { error, count } = await admin
    .from('partners')
    .update({ [column]: to }, { count: 'exact' })
    .ilike(column, from);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: count ?? 0 });
}
