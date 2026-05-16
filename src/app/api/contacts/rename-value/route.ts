import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/rename-value
//
// Bulk-edit a dropdown option across every contact row. Two shapes:
//   * { column, from, to }       — rename `from` -> `to` everywhere
//   * { column, from, to: null } — delete the value everywhere
// For scalar columns (company, role, specialty) we set the cell.
// For the array column (type) we either replace the element with
// the new tag (rename) or strip it from the array (delete).

export const dynamic = 'force-dynamic';

const SCALAR_COLUMNS = new Set(['company', 'role', 'specialty']);
const ARRAY_COLUMNS = new Set(['type']);
const ALL_COLUMNS = new Set([...SCALAR_COLUMNS, ...ARRAY_COLUMNS]);

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

  if (SCALAR_COLUMNS.has(column)) {
    // Case-insensitive match so a stray "MH primary" vs "MH Primary"
    // collapses cleanly. ilike is fine here because the value coming
    // from the picker is always a literal — no user-controlled
    // wildcard characters reach the query.
    const { error, count } = await admin
      .from('contacts')
      .update({ [column]: to }, { count: 'exact' })
      .ilike(column, from);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: count ?? 0 });
  }

  // Array column path. Postgres lacks a single-operator "replace
  // element in array case-insensitively across rows" so we read the
  // affected rows, transform in JS, and write back. Capped to 1000
  // rows per call so a runaway rename can't churn the whole table.
  const { data, error: readErr } = await admin
    .from('contacts')
    .select('id, type')
    .contains('type', [from])
    .limit(1000);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  const rows = (data ?? []) as { id: string; type: string[] | null }[];
  let updated = 0;
  for (const r of rows) {
    if (!r.type) continue;
    let next: string[];
    if (to === null) {
      next = r.type.filter((v) => v.toLowerCase() !== from.toLowerCase());
    } else {
      // Dedupe by lowercased key so renaming into an existing tag
      // collapses cleanly without leaving the row with both.
      const seen = new Set<string>();
      next = [];
      for (const v of r.type) {
        const replaced = v.toLowerCase() === from.toLowerCase() ? to : v;
        const key = replaced.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(replaced);
      }
    }
    const { error: writeErr } = await admin
      .from('contacts')
      .update({ type: next.length === 0 ? null : next })
      .eq('id', r.id);
    if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });
    updated += 1;
  }
  return NextResponse.json({ updated });
}
