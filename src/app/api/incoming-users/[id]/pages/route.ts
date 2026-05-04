import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// GET  /api/incoming-users/[id]/pages   — current allow-list
// PUT  /api/incoming-users/[id]/pages   — replace allow-list
//   body: { paths: string[] }
//
// Super-admin only. For Guest users, the super admin picks which
// /app/* pages they can view. We model that as positive-allow rows
// in user_page_permissions (can_view=true). Anything not on the
// list is implicitly denied (PageGuard merges the override with the
// page's adminOnly + dept rules — for guests we default-deny by
// listing the explicit allowed paths).

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if ('response' in auth) return auth.response;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('user_page_permissions')
    .select('path, can_view')
    .eq('user_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const allowed = (data ?? []).filter((r) => r.can_view).map((r) => r.path as string);
  return NextResponse.json({ paths: allowed });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if ('response' in auth) return auth.response;
  const { id } = await ctx.params;

  let body: { paths?: string[] } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === 'string' && p.startsWith('/app'))
    : [];

  const admin = getAdminSupabase();
  // Wipe + replace. Simple, idempotent.
  const { error: dErr } = await admin
    .from('user_page_permissions')
    .delete()
    .eq('user_id', id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  if (paths.length > 0) {
    const rows = paths.map((path) => ({ user_id: id, path, can_view: true }));
    const { error: iErr } = await admin
      .from('user_page_permissions')
      .insert(rows);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, paths });
}
