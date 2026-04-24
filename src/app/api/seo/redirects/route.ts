import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/redirects  — admin-only full list for the admin UI.
// POST /api/seo/redirects — create a new redirect.

export const dynamic = 'force-dynamic';

async function guardAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const guard = await guardAdmin();
  if ('error' in guard) return guard.error;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('redirects')
    .select('id, from_path, to_path, status_code, enabled, notes, hits, last_hit_at, created_at, updated_at')
    .order('from_path', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], total: data?.length ?? 0 });
}

function normalisePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if ('error' in guard) return guard.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const from_path = normalisePath(body.from_path);
  const to_path = normalisePath(body.to_path);
  const status_code = Number(body.status_code ?? 301);
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

  if (!from_path || !to_path) {
    return NextResponse.json({ error: 'from_path and to_path are required' }, { status: 400 });
  }
  if (![301, 302, 307, 308].includes(status_code)) {
    return NextResponse.json({ error: 'status_code must be 301, 302, 307, or 308' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('redirects')
    .insert({ from_path, to_path, status_code, notes, enabled: true })
    .select('id, from_path, to_path, status_code, enabled, notes, hits, last_hit_at, created_at, updated_at')
    .maybeSingle();

  if (error) {
    const status = /duplicate key|unique/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  revalidateTag('redirects', { expire: 0 });
  return NextResponse.json(data, { status: 201 });
}
