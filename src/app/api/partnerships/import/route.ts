import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/import
//   body: { rows: PartnerInput[] }
//
// Bulk-create partners from a CSV the client parsed locally. We
// re-validate every row server-side so a malformed CSV can't bypass
// the conditional Levels-of-care rule. Returns { created, skipped,
// errors[] } so the import modal can surface row-level feedback.

export const dynamic = 'force-dynamic';

const FACILITY_TYPES = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care']);
const ALLOWED_TYPES = new Set([
  'Detox',
  'RTC',
  'Outpatient',
  'Extended Care',
  'Interventionist',
  'Therapist',
]);

interface PartnerInput {
  name?: string;
  type?: string;
  specialty?: string | null;
  location?: string | null;
  poc?: string | null;
  contact_info?: string | null;
  admissions_line?: string | null;
  cash_pay_rate?: number | null;
  insurance?: string[];
  levels_of_care?: string[] | null;
  website?: string | null;
  notes?: string | null;
  comments?: string | null;
  rep?: string | null;
}

function trim(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function arrayOfStrings(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && !!v.trim())
    .map((v) => v.trim())
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { rows?: PartnerInput[] } = {};
  try { body = (await req.json()) as { rows?: PartnerInput[] }; } catch { /* allow empty */ }
  const incoming = Array.isArray(body.rows) ? body.rows : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: 'rows is empty' }, { status: 400 });
  }
  if (incoming.length > 500) {
    return NextResponse.json({ error: 'CSV too large — split into batches of 500 or fewer rows' }, { status: 413 });
  }

  // Validate + normalise. Track skipped + errors per-row so the
  // client can show "Row 7 missing name" instead of a 400 for the
  // whole upload.
  const inserts: Record<string, unknown>[] = [];
  const errors: { row: number; reason: string }[] = [];
  incoming.forEach((raw, idx) => {
    const name = trim(raw.name, 200);
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    if (!name) {
      errors.push({ row: idx + 1, reason: 'Missing name' });
      return;
    }
    if (!ALLOWED_TYPES.has(type)) {
      errors.push({ row: idx + 1, reason: `Type "${type || '(blank)'}" must be one of Detox, RTC, Outpatient, Extended Care, Interventionist, Therapist` });
      return;
    }
    const isFacility = FACILITY_TYPES.has(type);
    const insurance = arrayOfStrings(raw.insurance);
    const levels = arrayOfStrings(raw.levels_of_care);
    inserts.push({
      name,
      type,
      specialty: trim(raw.specialty, 120),
      location: trim(raw.location, 200),
      poc: trim(raw.poc, 200),
      contact_info: trim(raw.contact_info, 300),
      admissions_line: trim(raw.admissions_line, 60),
      cash_pay_rate:
        typeof raw.cash_pay_rate === 'number' && Number.isFinite(raw.cash_pay_rate)
          ? raw.cash_pay_rate
          : null,
      insurance,
      levels_of_care: isFacility ? levels : null,
      website: trim(raw.website, 300),
      notes: trim(raw.notes, 4000),
      comments: trim(raw.comments, 4000),
      rep: trim(raw.rep, 200),
      created_by: user.id,
      updated_by: user.id,
    });
  });

  if (inserts.length === 0) {
    return NextResponse.json({ created: 0, skipped: incoming.length, errors }, { status: 400 });
  }

  const admin = getAdminSupabase();
  // Insert in chunks so a single failure on row N doesn't roll back
  // the whole upload. Realtime updates the open grid as each batch
  // lands.
  const CHUNK = 100;
  let created = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error, data } = await admin.from('partners').insert(slice).select('id');
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
