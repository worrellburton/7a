import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/policies/import
//   body: { rows: PolicyInput[] }
//
// Bulk-create policies from a CSV the client parsed locally. We
// re-validate every row server-side so a malformed CSV can't bypass
// the section / name / content requirements, then insert in chunks
// of 50 (policies carry full body text so each row is heavy). Returns
// { created, skipped, errors[] } so the import modal can surface
// row-level feedback.
//
// Department lookup: the CSV uses department NAMES (humans don't have
// uuids). We resolve names → ids in one query before insert, and
// flag any unrecognised department as a row error rather than
// silently dropping the link.

export const dynamic = 'force-dynamic';

interface PolicyInput {
  section?: string;
  name?: string;
  policy_number?: string | null;
  content?: string;
  purpose?: string | null;
  scope?: string | null;
  department?: string | null;
  date_created?: string | null;
  date_reviewed?: string | null;
  date_revised?: string | null;
}

function trim(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { rows?: PolicyInput[] } = {};
  try { body = (await req.json()) as { rows?: PolicyInput[] }; } catch { /* allow empty */ }
  const incoming = Array.isArray(body.rows) ? body.rows : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: 'rows is empty' }, { status: 400 });
  }
  if (incoming.length > 250) {
    return NextResponse.json({ error: 'CSV too large — split into batches of 250 or fewer policies' }, { status: 413 });
  }

  const admin = getAdminSupabase();

  // Resolve any department names to ids in one trip so we don't
  // do N round-trips for an N-row import.
  const deptNames = Array.from(new Set(
    incoming
      .map((r) => trim(r?.department, 200))
      .filter((v): v is string => !!v),
  ));
  const deptByName = new Map<string, string>();
  if (deptNames.length > 0) {
    const { data: depts } = await admin
      .from('departments')
      .select('id, name')
      .in('name', deptNames);
    for (const d of depts ?? []) {
      deptByName.set(((d as { name: string }).name || '').toLowerCase(), (d as { id: string }).id);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const inserts: Record<string, unknown>[] = [];
  const errors: { row: number; reason: string }[] = [];
  incoming.forEach((raw, idx) => {
    const section = trim(raw?.section, 120);
    const name = trim(raw?.name, 200);
    const content = trim(raw?.content, 100_000);
    if (!section) { errors.push({ row: idx + 1, reason: 'Missing section' }); return; }
    if (!name) { errors.push({ row: idx + 1, reason: 'Missing name' }); return; }
    if (!content) { errors.push({ row: idx + 1, reason: 'Missing content' }); return; }

    const deptName = trim(raw?.department, 200);
    let department_id: string | null = null;
    if (deptName) {
      const found = deptByName.get(deptName.toLowerCase());
      if (!found) {
        errors.push({ row: idx + 1, reason: `Department "${deptName}" not found — leave the column blank or create it first` });
        return;
      }
      department_id = found;
    }

    inserts.push({
      section,
      name,
      policy_number: trim(raw?.policy_number, 60),
      content,
      purpose: trim(raw?.purpose, 4000),
      scope: trim(raw?.scope, 4000),
      date_created: isoDate(raw?.date_created) || today,
      date_reviewed: isoDate(raw?.date_reviewed) || today,
      date_revised: isoDate(raw?.date_revised),
      version: 1,
      department_id,
    });
  });

  if (inserts.length === 0) {
    return NextResponse.json({ created: 0, skipped: incoming.length, errors }, { status: 400 });
  }

  const CHUNK = 50;
  let created = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error, data } = await admin.from('policies').insert(slice).select('id');
    if (error) {
      errors.push({ row: i + 1, reason: `Batch starting at row ${i + 1} failed: ${error.message}` });
      continue;
    }
    created += data?.length ?? 0;
  }

  return NextResponse.json({
    created,
    skipped: incoming.length - created,
    errors,
  });
}
