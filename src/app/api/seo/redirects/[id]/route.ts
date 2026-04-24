import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// PATCH /api/seo/redirects/[id]  — partial update of one redirect
// DELETE /api/seo/redirects/[id] — permanent delete

export const dynamic = 'force-dynamic';

async function guardAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const };
}

function normalisePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const patch: Record<string, unknown> = {};
  if ('from_path' in body) {
    const v = normalisePath(body.from_path);
    if (!v) return NextResponse.json({ error: 'from_path invalid' }, { status: 400 });
    patch.from_path = v;
  }
  if ('to_path' in body) {
    const v = normalisePath(body.to_path);
    if (!v) return NextResponse.json({ error: 'to_path invalid' }, { status: 400 });
    patch.to_path = v;
  }
  if ('status_code' in body) {
    const code = Number(body.status_code);
    if (![301, 302, 307, 308].includes(code)) {
      return NextResponse.json({ error: 'status_code must be 301/302/307/308' }, { status: 400 });
    }
    patch.status_code = code;
  }
  if ('enabled' in body) patch.enabled = !!body.enabled;
  if ('notes' in body) patch.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('redirects')
    .update(patch)
    .eq('id', id)
    .select('id, from_path, to_path, status_code, enabled, notes, hits, last_hit_at, created_at, updated_at')
    .maybeSingle();

  if (error) {
    const status = /duplicate key|unique/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  revalidateTag('redirects', { expire: 0 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = getAdminSupabase();
  const { error } = await admin.from('redirects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag('redirects', { expire: 0 });
  return NextResponse.json({ ok: true });
}
