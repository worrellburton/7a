import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/contacts  — list every contact, joined with the `last
//                       contacted by` user's display name + avatar
//                       so the grid can render them without a
//                       second round-trip.
// POST /api/contacts  — create a fresh contact

export const dynamic = 'force-dynamic';

interface ContactBody {
  name?: string;
  company?: string | null;
  company_website?: string | null;
  type?: string | string[] | null;
  specialty?: string | null;
  rating?: string | null;
  role?: string | null;
  phone?: string | null;
  phone_cell?: string | null;
  phone_office?: string | null;
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

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contacts')
    .select('id, name, company, company_website, type, specialty, rating, role, phone, phone_cell, phone_office, email, location, formatted_address, place_id, tz, lat, lng, notes, source, source_partner_id, last_contact_at, last_contact_by, last_contact_method, last_contact_comments, unsubscribed_at, unsubscribed_source, created_at, updated_at')
    .order('last_contact_at', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve last-contacted-by user names so the grid can show them
  // without a second request.
  type Row = {
    id: string;
    name: string;
    company: string | null;
    company_website: string | null;
    type: string[] | null;
    specialty: string | null;
    rating: string | null;
    role: string | null;
    phone: string | null;
    phone_cell: string | null;
    phone_office: string | null;
    email: string | null;
    location: string | null;
    formatted_address: string | null;
    place_id: string | null;
    tz: string | null;
    lat: number | null;
    lng: number | null;
    notes: string | null;
    source: string | null;
    source_partner_id: string | null;
    last_contact_at: string | null;
    last_contact_by: string | null;
    last_contact_method: string | null;
    last_contact_comments: string | null;
    unsubscribed_at: string | null;
    unsubscribed_source: string | null;
    created_at: string;
    updated_at: string;
  };
  const rows = (data ?? []) as Row[];
  const ids = Array.from(new Set(rows.map((r) => r.last_contact_by).filter((v): v is string => !!v)));
  const contactIds = rows.map((r) => r.id);
  // Fan out the two follow-up lookups in parallel and scope partners
  // to only the contacts in the current page so the response doesn't
  // shape with every partner row in the org.
  const [usrsRes, partnerLinksRes] = await Promise.all([
    ids.length > 0
      ? admin.from('users').select('id, full_name, avatar_url').in('id', ids)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
    contactIds.length > 0
      ? admin.from('partners').select('id, contact_id').in('contact_id', contactIds)
      : Promise.resolve({ data: [] as Array<{ id: string; contact_id: string }> }),
  ]);
  const userMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  for (const u of usrsRes.data ?? []) {
    userMap.set(u.id as string, {
      full_name: (u.full_name as string | null) ?? null,
      avatar_url: (u.avatar_url as string | null) ?? null,
    });
  }
  const partnerLinks = partnerLinksRes.data;
  const partnerByContact = new Map<string, string>();
  for (const p of (partnerLinks ?? []) as Array<{ id: string; contact_id: string }>) {
    if (p.contact_id) partnerByContact.set(p.contact_id, p.id);
  }
  const enriched = rows.map((r) => ({
    ...r,
    partner_id: partnerByContact.get(r.id) ?? null,
    last_contact_by_name: r.last_contact_by ? userMap.get(r.last_contact_by)?.full_name ?? null : null,
    last_contact_by_avatar_url: r.last_contact_by ? userMap.get(r.last_contact_by)?.avatar_url ?? null : null,
  }));
  return NextResponse.json({ rows: enriched, total: enriched.length });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ContactBody = {};
  try { body = (await req.json()) as ContactBody; } catch { /* allow empty */ }
  const name = trim(body.name, 200);
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contacts')
    .insert({
      name,
      company: trim(body.company, 200),
      company_website: trim(body.company_website, 500),
      type: normaliseTypeArray(body.type),
      specialty: trim(body.specialty, 200),
      role: trim(body.role, 200),
      phone: trim(body.phone, 60),
      phone_cell: trim(body.phone_cell, 60),
      phone_office: trim(body.phone_office, 60),
      email: trim(body.email, 200),
      location: trim(body.location, 200),
      notes: trim(body.notes, 4000),
      created_by: user.id,
    })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Credit the adder with a 'New Contact' touchpoint so the add
  // surfaces in the outreach activity feed (and the home log-rain).
  // Distinct from 'Data Entry' (PATCH path / filling fields on an
  // existing contact). Failure is logged but doesn't roll back the
  // contact — losing the log row is less bad than refusing to
  // create the contact.
  if (data?.id) {
    const nowIso = new Date().toISOString();
    const { error: logErr } = await admin.from('contact_logs').insert({
      contact_id: data.id,
      method: 'New Contact',
      comments: 'Contact added.',
      contacted_by: user.id,
      contacted_at: nowIso,
      duration_seconds: 0,
    });
    if (logErr) console.warn('[contacts] new-contact log insert failed:', logErr.message);
    await admin.from('contacts').update({
      last_contact_at: nowIso,
      last_contact_by: user.id,
      last_contact_method: 'New Contact',
      last_contact_comments: 'Contact added.',
    }).eq('id', data.id);

    // Also surface the new contact on the platform-wide /app/activity
    // feed (separate from the contact_logs row above, which only
    // drives the outreach log-rain + leaderboards).
    await admin.from('activity_log').insert({
      user_id: user.id,
      type: 'contact.created',
      target_kind: 'contact',
      target_id: data.id,
      target_label: data.name,
      target_path: '/app/contacts',
      metadata: { company: data.company ?? null },
    });
  }

  return NextResponse.json(data, { status: 201 });
}
