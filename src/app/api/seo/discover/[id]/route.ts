import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_VALUES = ['new', 'watching', 'curated', 'ignore'] as const;

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase
    .from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const, supabase };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  let body: { status?: (typeof STATUS_VALUES)[number]; notes?: string | null } = {};
  try { body = (await req.json()) as typeof body; } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const update: Record<string, string | null> = {};
  if (body.status !== undefined) {
    if (!STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of ${STATUS_VALUES.join(', ')}` }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from('seo_keyword_discoveries')
    .update(update)
    .eq('id', id)
    .select('id, suggestion, seed, relevance, status, notes, first_seen_at, last_seen_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ discovery: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const { error } = await auth.supabase.from('seo_keyword_discoveries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
