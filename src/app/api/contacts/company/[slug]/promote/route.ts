import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import { getAdminSupabase } from '@/lib/supabase-server';
import { normalizeCompanyKey, companySlug } from '@/lib/company';

// POST /api/contacts/company/[slug]/promote
//   body: { contact_id: string, type: string }
//
// Promotes a company to a partner. The chosen contact (a POC at the
// company) anchors the partner row — partner.contact_id links to it,
// mirroring the contacts↔partners promote flow — and the company name
// becomes the partner name. Stamps the promotion onto company_profiles
// and writes the touch onto the contact's unified log history.

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care', 'Interventionist', 'Therapist']);

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;
  const { slug } = await ctx.params;

  let body: { contact_id?: string; type?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const contactId = typeof body.contact_id === 'string' ? body.contact_id : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (!contactId) return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
  if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ error: 'a valid partner type is required' }, { status: 400 });

  const admin = getAdminSupabase();

  const { data: contact, error: cErr } = await admin
    .from('contacts')
    .select('id, name, company, company_website, email, phone, phone_office, location, rating, specialty')
    .eq('id', contactId)
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 });

  const companyName = (contact.company as string | null)?.trim() || (contact.name as string);
  const companyKey = normalizeCompanyKey(companyName);

  // Don't double-promote: if this exact contact is already a partner,
  // surface that rather than creating a duplicate row.
  const { data: existing } = await admin
    .from('partners')
    .select('id')
    .eq('contact_id', contactId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'That contact is already a partner.' }, { status: 409 });
  }

  const rating = ['Tier 1', 'Tier 2', 'Tier 3'].includes((contact.rating as string) ?? '') ? (contact.rating as string) : null;
  const contactInfo = [contact.email, contact.phone || contact.phone_office].filter(Boolean).join(' · ') || null;

  const { data: partner, error: pErr } = await admin
    .from('partners')
    .insert({
      name: companyName,
      type,
      // The POC is the contact's own name when it differs from the
      // company; otherwise leave it for the editor to fill.
      poc: (contact.name as string) !== companyName ? (contact.name as string) : null,
      contact_info: contactInfo,
      location: (contact.location as string | null) ?? null,
      website: (contact.company_website as string | null) ?? null,
      specialty: (contact.specialty as string | null) ?? null,
      rating,
      contact_id: contactId,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id, name')
    .maybeSingle();
  if (pErr || !partner) return NextResponse.json({ error: pErr?.message ?? 'Could not create partner' }, { status: 500 });

  // Stamp the promotion onto the company profile (find-or-create).
  await admin
    .from('company_profiles')
    .upsert(
      {
        company_key: companyKey,
        display_name: companyName,
        slug: companySlug(companyName),
        promoted_partner_id: partner.id,
        promoted_at: new Date().toISOString(),
        promoted_by: user.id,
      },
      { onConflict: 'company_key' },
    );

  // Log the promotion on the unified history + bump the contact.
  const now = new Date().toISOString();
  await admin.from('contact_logs').insert({
    contact_id: contactId,
    method: 'Data Entry',
    comments: `Promoted company to partner: ${companyName}`,
    contacted_by: user.id,
    contacted_at: now,
  });
  await admin
    .from('contacts')
    .update({ last_contact_at: now, last_contact_by: user.id, last_contact_method: 'Data Entry', last_contact_comments: `Promoted company to partner: ${companyName}` })
    .eq('id', contactId);

  return NextResponse.json({ ok: true, partner_id: partner.id }, { status: 201 });
}
