import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET    /api/partnerships          — list every partner (newest first)
// POST   /api/partnerships          — create a new partner
//
// Authenticated users only. The page itself is gated by the
// Marketing & Admissions department in PagePermissions, so the
// route's auth check is the second-line defense.

export const dynamic = 'force-dynamic';

const FACILITY_TYPES = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care']);

interface PartnerBody {
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

function normaliseBody(body: PartnerBody) {
  const name = trim(body.name, 200);
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const insurance = arrayOfStrings(body.insurance);
  const isFacility = FACILITY_TYPES.has(type);
  const levels_of_care = isFacility ? arrayOfStrings(body.levels_of_care) : null;
  return {
    name,
    type,
    specialty: trim(body.specialty, 120),
    location: trim(body.location, 200),
    poc: trim(body.poc, 200),
    contact_info: trim(body.contact_info, 300),
    admissions_line: trim(body.admissions_line, 60),
    cash_pay_rate: typeof body.cash_pay_rate === 'number' && Number.isFinite(body.cash_pay_rate) ? body.cash_pay_rate : null,
    insurance,
    levels_of_care,
    website: trim(body.website, 300),
    notes: trim(body.notes, 4000),
    comments: trim(body.comments, 4000),
    rep: trim(body.rep, 200),
  };
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('partners')
    .select('*')
    .order('specialty', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], total: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: PartnerBody = {};
  try { body = (await req.json()) as PartnerBody; } catch { /* allow empty */ }
  const payload = normaliseBody(body);

  if (!payload.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!payload.type) return NextResponse.json({ error: 'type is required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('partners')
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
