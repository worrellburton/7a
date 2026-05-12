import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/contacts/[id]  — patch a contact row
// DELETE /api/contacts/[id]  — remove a contact

export const dynamic = 'force-dynamic';

function trim(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const patch: Record<string, unknown> = {};
  if ('name' in body) patch.name = trim(body.name, 200);
  if ('company' in body) patch.company = trim(body.company, 200);
  if ('company_website' in body) patch.company_website = trim(body.company_website, 500);
  if ('type' in body) patch.type = trim(body.type, 60);
  if ('specialty' in body) patch.specialty = trim(body.specialty, 200);
  if ('rating' in body) {
    const r = trim(body.rating, 20);
    if (r === null || r === 'Tier 1' || r === 'Tier 2' || r === 'Tier 3') patch.rating = r;
  }
  if ('role' in body) patch.role = trim(body.role, 200);
  if ('phone' in body) patch.phone = trim(body.phone, 60);
  if ('phone_cell' in body) patch.phone_cell = trim(body.phone_cell, 60);
  if ('phone_office' in body) patch.phone_office = trim(body.phone_office, 60);
  if ('email' in body) patch.email = trim(body.email, 200);
  if ('location' in body) patch.location = trim(body.location, 200);
  if ('formatted_address' in body) patch.formatted_address = trim(body.formatted_address, 400);
  if ('place_id' in body) patch.place_id = trim(body.place_id, 200);
  if ('tz' in body) patch.tz = trim(body.tz, 100);
  if ('lat' in body) patch.lat = typeof body.lat === 'number' ? body.lat : null;
  if ('lng' in body) patch.lng = typeof body.lng === 'number' ? body.lng : null;
  if ('notes' in body) patch.notes = trim(body.notes, 4000);

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contacts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { error } = await admin.from('contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
