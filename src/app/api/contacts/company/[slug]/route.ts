import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import { getAdminSupabase } from '@/lib/supabase-server';
import { companySlug, normalizeCompanyKey } from '@/lib/company';

// GET   /api/contacts/company/[slug] — the company page payload:
//   profile (find-or-create), member contacts, unified log timeline,
//   and rolled-up engagement stats.
// PATCH /api/contacts/company/[slug] — edit company-level fields
//   (notes, owner, follow_up). Body keys map 1:1 to company_profiles.
//
// A "company" is the normalized contacts.company string — there's no
// companies table — so the slug is resolved by recomputing slugs over
// the distinct company names and matching. Cheap (a few hundred names)
// and never stale.

export const dynamic = 'force-dynamic';

interface ResolvedCompany {
  companyKey: string;
  displayName: string;
}

async function resolveCompany(admin: ReturnType<typeof getAdminSupabase>, slug: string): Promise<ResolvedCompany | null> {
  // Fast path: a saved profile already knows this slug.
  const { data: profile } = await admin
    .from('company_profiles')
    .select('company_key, display_name')
    .eq('slug', slug)
    .maybeSingle();
  if (profile) {
    return { companyKey: profile.company_key as string, displayName: profile.display_name as string };
  }
  // Otherwise recompute slugs across the distinct company names.
  const { data: rows } = await admin
    .from('contacts')
    .select('company')
    .not('company', 'is', null);
  const seen = new Map<string, string>(); // key -> first display name
  for (const r of (rows ?? []) as Array<{ company: string | null }>) {
    const name = (r.company ?? '').trim();
    if (!name) continue;
    const key = normalizeCompanyKey(name);
    if (!seen.has(key)) seen.set(key, name);
  }
  for (const [key, name] of seen) {
    if (companySlug(name) === slug) return { companyKey: key, displayName: name };
  }
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const { slug } = await ctx.params;

  const admin = getAdminSupabase();
  const resolved = await resolveCompany(admin, slug);
  if (!resolved) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const { companyKey, displayName } = resolved;

  // Member contacts — every contact whose NORMALIZED company matches.
  // We fetch all non-null-company rows and filter on the normalized key
  // in JS so casing/whitespace variants ("ACME  Inc" vs "Acme Inc")
  // collapse into one company instead of fragmenting it.
  const { data: contactRows, error: cErr } = await admin
    .from('contacts')
    .select('id, name, role, company, company_website, email, phone, phone_cell, phone_office, location, formatted_address, rating, type, specialty, notes, lat, lng, last_contact_at, last_contact_by, last_contact_method, follow_up_at, unsubscribed_at')
    .not('company', 'is', null);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  const contacts = ((contactRows ?? []) as Array<Record<string, unknown> & { company: string | null }>)
    .filter((c) => normalizeCompanyKey(c.company) === companyKey);
  const contactIds = contacts.map((c) => c.id as string);

  // Find-or-create the profile row so the page always has somewhere to
  // hang notes/owner/follow-up. created lazily on first open.
  let { data: profileRow } = await admin
    .from('company_profiles')
    .select('*')
    .eq('company_key', companyKey)
    .maybeSingle();
  if (!profileRow) {
    const { data: created } = await admin
      .from('company_profiles')
      .insert({ company_key: companyKey, display_name: displayName, slug })
      .select('*')
      .maybeSingle();
    profileRow = created ?? null;
  }

  // Unified log timeline across every member contact.
  let logs: Array<Record<string, unknown>> = [];
  if (contactIds.length > 0) {
    const { data: logRows } = await admin
      .from('contact_logs')
      .select('id, contact_id, method, comments, contacted_by, contacted_at, duration_seconds')
      .in('contact_id', contactIds)
      .order('contacted_at', { ascending: false })
      .limit(200);
    logs = (logRows ?? []) as Array<Record<string, unknown>>;
  }

  // Resolve display names + avatars for everyone referenced (log
  // authors, contact owners, company owner) in one round-trip.
  const userIds = new Set<string>();
  for (const l of logs) if (l.contacted_by) userIds.add(l.contacted_by as string);
  for (const c of contacts) if (c.last_contact_by) userIds.add(c.last_contact_by as string);
  if (profileRow?.owner_id) userIds.add(profileRow.owner_id as string);
  const userMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (userIds.size > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
      userMap.set(u.id, { full_name: u.full_name ?? null, avatar_url: u.avatar_url ?? null });
    }
  }

  const enrichedLogs = logs.map((l) => ({
    ...l,
    contacted_by_name: l.contacted_by ? userMap.get(l.contacted_by as string)?.full_name ?? null : null,
    contacted_by_avatar_url: l.contacted_by ? userMap.get(l.contacted_by as string)?.avatar_url ?? null : null,
  }));

  // Rolled-up engagement: newest touch across the whole company.
  const lastContactAt = contacts.reduce<string | null>((acc, c) => {
    const v = c.last_contact_at as string | null;
    if (!v) return acc;
    if (!acc || new Date(v).getTime() > new Date(acc).getTime()) return v;
    return acc;
  }, null);

  const website = (contacts.find((c) => (c.company_website as string | null)?.trim())?.company_website as string | null) ?? null;
  const owner = profileRow?.owner_id ? userMap.get(profileRow.owner_id as string) ?? null : null;

  // Which member contacts are already partners — so the UI knows
  // whether this company is (partly) promoted and can mark those rows.
  let partnerContactIds: string[] = [];
  if (contactIds.length > 0) {
    const { data: partnerRows } = await admin
      .from('partners')
      .select('contact_id')
      .in('contact_id', contactIds);
    partnerContactIds = ((partnerRows ?? []) as Array<{ contact_id: string | null }>)
      .map((p) => p.contact_id)
      .filter((v): v is string => !!v);
  }
  const partnerIdSet = new Set(partnerContactIds);

  return NextResponse.json({
    company: {
      key: companyKey,
      displayName,
      slug,
      website,
      contactCount: contacts.length,
      lastContactAt,
      logCount: logs.length,
      partnerCount: partnerIdSet.size,
    },
    profile: profileRow,
    owner: owner ? { id: profileRow!.owner_id, ...owner } : null,
    contacts: contacts.map((c) => ({
      ...c,
      is_partner: partnerIdSet.has(c.id as string),
      last_contact_by_name: c.last_contact_by ? userMap.get(c.last_contact_by as string)?.full_name ?? null : null,
    })),
    logs: enrichedLogs,
  });
}

interface PatchBody {
  notes?: string | null;
  owner_id?: string | null;
  follow_up_at?: string | null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const { slug } = await ctx.params;

  const admin = getAdminSupabase();
  const resolved = await resolveCompany(admin, slug);
  if (!resolved) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  let body: PatchBody = {};
  try { body = (await req.json()) as PatchBody; } catch { /* allow empty */ }
  const patch: Record<string, unknown> = {};
  if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes.slice(0, 8000) : null;
  if ('owner_id' in body) patch.owner_id = body.owner_id || null;
  if ('follow_up_at' in body) patch.follow_up_at = body.follow_up_at || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

  // Upsert on company_key so a PATCH before the GET lazily created the
  // row still works.
  const { data, error } = await admin
    .from('company_profiles')
    .upsert(
      { company_key: resolved.companyKey, display_name: resolved.displayName, slug, ...patch },
      { onConflict: 'company_key' },
    )
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
