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
  role?: string | null;
  phone?: string | null;
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

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contacts')
    .select('id, name, company, company_website, role, phone, email, location, formatted_address, place_id, tz, lat, lng, notes, source, source_partner_id, last_contact_at, last_contact_by, last_contact_method, last_contact_comments, created_at, updated_at')
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
    role: string | null;
    phone: string | null;
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
    created_at: string;
    updated_at: string;
  };
  const rows = (data ?? []) as Row[];
  const ids = Array.from(new Set(rows.map((r) => r.last_contact_by).filter((v): v is string => !!v)));
  const userMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (ids.length > 0) {
    const { data: usrs } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', ids);
    for (const u of usrs ?? []) {
      userMap.set(u.id as string, {
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
      role: trim(body.role, 200),
      phone: trim(body.phone, 60),
      email: trim(body.email, 200),
      location: trim(body.location, 200),
      notes: trim(body.notes, 4000),
      created_by: user.id,
    })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
