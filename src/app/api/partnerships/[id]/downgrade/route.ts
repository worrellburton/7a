import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/partnerships/[id]/downgrade
//
// "Remove partner" in the new contact-centric model. Deletes the
// partner row; the linked contact (partners.contact_id) stays in
// place on /feather/outreach so admissions doesn't lose the person's
// engagement history. Previously this route created a new contact
// when downgrading — now there's always already a contact attached,
// so we just drop the partner row and report which contact survived.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const admin = getAdminSupabase();

  const { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, contact_id')
    .eq('id', id)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const { error: dErr } = await admin.from('partners').delete().eq('id', id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  // Surface the contact_id so the client can re-focus the outreach
  // grid on the now-orphaned contact if it wants to.
  void user;
  return NextResponse.json({ ok: true, contact_id: partner.contact_id ?? null });
}
