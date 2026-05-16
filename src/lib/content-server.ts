// Shared helpers for the /api/content/* routes.
//
//   * requireSuperAdmin — uniform 401/403 gate so every endpoint
//     enforces the same access rule (super admin only).
//   * makeSlug — deterministic slug derived from a title or the
//     first ~6 words of the prompt. Falls back to a short id when
//     neither is available.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

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
  if (!data?.is_super_admin) {
    return { error: NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 }), user: null };
  }
  return { error: null, user };
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
