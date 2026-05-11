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
  if ('role' in body) patch.role = trim(body.role, 200);
  if ('phone' in body) patch.phone = trim(body.phone, 60);
  if ('email' in body) patch.email = trim(body.email, 200);
  if ('location' in body) patch.location = trim(body.location, 200);
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
