// Shared helpers for the /api/content/* routes.
//
//   * requireSuperAdmin — 401/403 gate. Originally super-admin-only;
//     relaxed to also let any user with a true
//     user_page_permissions row for /app/content through, so the
//     Content tab on /app/admin/user-permissions can promote a
//     teammate into the content pipeline (view + post + publish)
//     with a single toggle, no code deploy.
//   * makeSlug — deterministic slug derived from a title or the
//     first ~6 words of the prompt. Falls back to a short id when
//     neither is available.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

const CONTENT_PAGE_PATH = '/app/content';

export async function requireSuperAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }), user: null };
  if (data?.is_super_admin) {
    return { error: null, user };
  }
  // Per-user content-page override. The /app/admin/user-permissions
  // Content tab toggles this row on/off. can_view=true grants the
  // full content surface (view the page + create / edit / publish
  // blogs); can_view=false / missing locks them out.
  const { data: override } = await admin
    .from('user_page_permissions')
    .select('can_view')
    .eq('user_id', user.id)
    .eq('path', CONTENT_PAGE_PATH)
    .maybeSingle();
  if (override?.can_view === true) {
    return { error: null, user };
  }
  return { error: NextResponse.json({ error: 'Forbidden — content access required' }, { status: 403 }), user: null };
}

export function makeSlug(source: string): string {
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 8)
    .join('-');
  if (base) return base;
  return `blog-${Math.random().toString(36).slice(2, 8)}`;
}
