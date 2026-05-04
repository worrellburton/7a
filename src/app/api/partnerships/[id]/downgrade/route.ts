import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/[id]/downgrade
//
// Demote a partner to a plain contact. Maps PoC/contact_info/location
// onto a fresh row in public.contacts (with source_partner_id linking
// back), then removes the partner row from the active grid. Audit
// trail lives in the contact's `source` field + the foreign key.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, name, poc, contact_info, location, type, specialty')
    .eq('id', id)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const contactPayload = {
    name: partner.poc?.trim() ? partner.poc : partner.name,
    contact_info: partner.contact_info ?? null,
    location: partner.location ?? null,
    notes: `Downgraded from partner: ${partner.name}${partner.type ? ` (${partner.type})` : ''}${partner.specialty ? ` · ${partner.specialty}` : ''}`,
    source: 'downgrade-from-partner',
    source_partner_id: partner.id,
    created_by: user.id,
  };

  const { data: contact, error: cErr } = await admin
    .from('contacts')
    .insert(contactPayload)
    .select('id')
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const { error: dErr } = await admin.from('partners').delete().eq('id', id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, contact_id: contact?.id ?? null });
}
