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
  // When present, this partner is a PROMOTION of an existing outreach
  // contact — the partner row links to it and the promotion is logged
  // on the contact's unified history.
  contact_id?: string | null;
  name?: string;
  type?: string;
  rating?: string | null;
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
  // Rating mirrors contacts.rating — same vocabulary so the partner
  // and outreach surfaces don't drift apart. NULL clears.
  const ratingRaw = trim(body.rating, 20);
  const rating = ratingRaw && ['Tier 1', 'Tier 2', 'Tier 3'].includes(ratingRaw) ? ratingRaw : null;
  return {
    name,
    type,
    rating,
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

  // Resolve last-contacted-by display names + avatars so the grid
  // can show them without a second round-trip — same pattern as
  // /api/contacts.
  const rows = (data ?? []) as Array<Record<string, unknown> & { last_contact_by?: string | null }>;
  const userIds = Array.from(
    new Set(rows.map((r) => r.last_contact_by).filter((v): v is string => !!v)),
  );
  const userMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
      userMap.set(u.id, {
        full_name: (u.full_name as string | null) ?? null,
        avatar_url: (u.avatar_url as string | null) ?? null,
      });
    }
  }
  const enriched = rows.map((r) => ({
    ...r,
    last_contact_by_name: r.last_contact_by ? userMap.get(r.last_contact_by)?.full_name ?? null : null,
    last_contact_by_avatar_url: r.last_contact_by ? userMap.get(r.last_contact_by)?.avatar_url ?? null : null,
  }));
  return NextResponse.json({ rows: enriched, total: enriched.length });
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

  // Resolve the linked contact. Three paths:
  //   1. Explicit contact_id (the "promote a contact" flow) — verify
  //      it exists.
  //   2. Name/poc match against existing contacts — link, don't dupe.
  //   3. Nothing matches — create the contact so every partner also
  //      lives in the outreach rolodex.
  let contactId: string | null = null;
  if (typeof body.contact_id === 'string' && body.contact_id) {
    const { data: c } = await admin.from('contacts').select('id').eq('id', body.contact_id).maybeSingle();
    if (!c) return NextResponse.json({ error: 'contact_id does not match an existing contact' }, { status: 400 });
    contactId = body.contact_id;
  } else {
    const probe = payload.poc || payload.name;
    const { data: match } = await admin
      .from('contacts')
      .select('id')
      .ilike('name', probe)
      .limit(1)
      .maybeSingle();
    if (match) {
      contactId = (match as { id: string }).id;
    } else {
      const { data: created, error: cErr } = await admin
        .from('contacts')
        .insert({
          name: payload.poc || payload.name,
          company: payload.poc ? payload.name : null,
          role: payload.type,
          location: payload.location,
          source: 'partner',
        })
        .select('id')
        .maybeSingle();
      if (cErr || !created) return NextResponse.json({ error: cErr?.message ?? 'Could not create contact' }, { status: 500 });
      contactId = (created as { id: string }).id;
    }
  }

  const { data, error } = await admin
    .from('partners')
    .insert({ ...payload, contact_id: contactId, created_by: user.id, updated_by: user.id })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The promotion itself counts as a touchpoint on the unified
  // history — a 'Data Entry' log crediting whoever added the partner.
  const now = new Date().toISOString();
  await admin.from('contact_logs').insert({
    contact_id: contactId,
    method: 'Data Entry',
    comments: `Promoted to partner: ${payload.name}`,
    contacted_by: user.id,
    contacted_at: now,
  });
  await admin
    .from('contacts')
    .update({ last_contact_at: now, last_contact_by: user.id, last_contact_method: 'Data Entry', last_contact_comments: `Promoted to partner: ${payload.name}` })
    .eq('id', contactId);

  return NextResponse.json(data, { status: 201 });
}
