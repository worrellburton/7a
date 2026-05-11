import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/[id]/upgrade-to-partner
//
// Attach a partner record to an outreach contact. Previously this
// route MOVED the contact into the partners table; the new model
// keeps the contact in place and just creates a partner row with
// partners.contact_id pointing back at it. "Add partner" in the UI.
//
// The client supplies partner-only fields (type, specialty, admissions
// line, levels of care, etc.); we splice in the contact's existing
// phone / email / location, create the partner row, and stop. If the
// contact already has a partner attached, we 409 — call DELETE on the
// existing partner first to swap.
//
// Conditional rule: levels_of_care is only honoured for facility-type
// partners (Detox/RTC/Outpatient/Extended Care) — same shape the
// partners CHECK constraint enforces.

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

interface UpgradeBody {
  name?: string;
  type?: string;
  specialty?: string | null;
  admissions_line?: string | null;
  cash_pay_rate?: number | null;
  insurance?: string[];
  levels_of_care?: string[] | null;
  website?: string | null;
  rep?: string | null;
  poc?: string | null;
  contact_info?: string | null;
  location?: string | null;
  notes?: string | null;
  comments?: string | null;
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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: UpgradeBody = {};
  try { body = (await req.json()) as UpgradeBody; } catch { /* allow empty */ }

  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: 'type is required and must be a valid Partner type' }, { status: 400 });
  }
  const isFacility = FACILITY_TYPES.has(type);

  const admin = getAdminSupabase();

  // Reject double-attaches. The UI hides the "Add partner" affordance
  // when partners.contact_id already matches this contact, but a stale
  // tab or a direct API call could still try.
  const { data: existing } = await admin
    .from('partners')
    .select('id')
    .eq('contact_id', id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Contact already has a linked partner' }, { status: 409 });
  }

  const { data: contact, error: cErr } = await admin
    .from('contacts')
    .select('id, name, company, role, phone, phone_cell, phone_office, email, location, notes')
    .eq('id', id)
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  // Compose contact_info from the best phone/email pair we have on the
  // contact. Cell first, then office, then legacy phone.
  const bestPhone = contact.phone_cell || contact.phone_office || contact.phone || null;
  const baseContactInfo = [bestPhone, contact.email].filter(Boolean).join(' · ') || null;

  const partnerPayload = {
    contact_id: id,
    name: trim(body.name, 200) ?? contact.company ?? contact.name,
    type,
    specialty: trim(body.specialty, 120),
    location: trim(body.location, 200) ?? contact.location ?? null,
    poc: trim(body.poc, 200) ?? contact.name,
    contact_info: trim(body.contact_info, 300) ?? baseContactInfo,
    admissions_line: trim(body.admissions_line, 60),
    cash_pay_rate:
      typeof body.cash_pay_rate === 'number' && Number.isFinite(body.cash_pay_rate)
        ? body.cash_pay_rate
        : null,
    insurance: arrayOfStrings(body.insurance),
    levels_of_care: isFacility ? arrayOfStrings(body.levels_of_care) : null,
    website: trim(body.website, 300),
    notes: trim(body.notes, 4000) ?? contact.notes ?? null,
    comments: trim(body.comments, 4000),
    rep: trim(body.rep, 200),
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: partner, error: pErr } = await admin
    .from('partners')
    .insert(partnerPayload)
    .select('id')
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Contact stays in place — no delete.
  return NextResponse.json({ ok: true, partner_id: partner?.id ?? null });
}
