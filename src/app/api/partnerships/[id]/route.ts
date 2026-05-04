import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/partnerships/[id]  — patch a partner row
// DELETE /api/partnerships/[id]  — remove a partner

export const dynamic = 'force-dynamic';

const FACILITY_TYPES = new Set(['Detox', 'RTC', 'Outpatient', 'Extended Care']);

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const patch: Record<string, unknown> = { updated_by: user.id };
  if ('name' in body) patch.name = trim(body.name, 200);
  if ('type' in body) patch.type = typeof body.type === 'string' ? body.type.trim() : null;
  if ('specialty' in body) patch.specialty = trim(body.specialty, 120);
  if ('location' in body) patch.location = trim(body.location, 200);
  if ('poc' in body) patch.poc = trim(body.poc, 200);
  if ('contact_info' in body) patch.contact_info = trim(body.contact_info, 300);
  if ('admissions_line' in body) patch.admissions_line = trim(body.admissions_line, 60);
  if ('cash_pay_rate' in body) {
    const n = body.cash_pay_rate;
    patch.cash_pay_rate = typeof n === 'number' && Number.isFinite(n) ? n : null;
  }
  if ('insurance' in body) patch.insurance = arrayOfStrings(body.insurance);
  if ('website' in body) patch.website = trim(body.website, 300);
  if ('notes' in body) patch.notes = trim(body.notes, 4000);
  if ('comments' in body) patch.comments = trim(body.comments, 4000);
  if ('rep' in body) patch.rep = trim(body.rep, 200);

  // Levels-of-care has type-conditional rules. If the patch changes
  // the type to a non-facility, force levels_of_care to null. If
  // levels_of_care is included for a non-facility type, ignore it.
  if ('levels_of_care' in body || 'type' in body) {
    const admin0 = getAdminSupabase();
    const { data: existing } = await admin0
      .from('partners')
      .select('type')
      .eq('id', id)
      .maybeSingle();
    const effectiveType = (patch.type as string) ?? (existing?.type as string | undefined) ?? '';
    if (FACILITY_TYPES.has(effectiveType)) {
      if ('levels_of_care' in body) patch.levels_of_care = arrayOfStrings(body.levels_of_care);
    } else {
      patch.levels_of_care = null;
    }
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('partners')
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
  const { error } = await admin.from('partners').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
