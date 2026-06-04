// Shared helpers for the /api/content/* routes.
//
//   * requireSuperAdmin — 401/403 gate. Despite the name, accepts any
//     of FIVE access paths so the gate matches the page's actual
//     audience without per-route special-casing:
//       (a) is_super_admin=true (or is_admin=true)
//       (b) primary department_id = Marketing & Admissions
//       (c) extras in user_extra_departments include Marketing
//       (d) per-user row in user_page_permissions for /app/content
//           with can_view=true (set via the Content tab on
//           /app/admin/user-permissions)
//     A single helper means every /api/content/* route gates the
//     same way — adding a sixth path is a one-line change here.
//   * makeSlug — deterministic slug derived from a title or the
//     first ~6 words of the prompt. Falls back to a short id when
//     neither is available.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

const CONTENT_PAGE_PATH = '/app/content';
// Marketing & Admissions UUID. Mirrors the constant in api-gates.ts —
// duplicated here to keep the gate self-contained and avoid an import
// cycle. When this UUID ever changes, grep both files.
const MARKETING_DEPT_ID = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';

export async function requireSuperAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }
  const admin = getAdminSupabase();
  // (a) admin / super-admin bits + (b) primary department membership.
  const { data: row, error } = await admin
    .from('users')
    .select('is_admin, is_super_admin, department_id')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }), user: null };
  if (row?.is_super_admin || row?.is_admin) {
    return { error: null, user };
  }
  if (row?.department_id === MARKETING_DEPT_ID) {
    return { error: null, user };
  }
  // (c) extras the super-admin granted via the Departments tab.
  const { data: extras } = await admin
    .from('user_extra_departments')
    .select('department_id')
    .eq('user_id', user.id);
  if ((extras ?? []).some((r) => (r as { department_id: string }).department_id === MARKETING_DEPT_ID)) {
    return { error: null, user };
  }
  // (d) per-user content-page override. The Content tab on
  // /app/admin/user-permissions toggles this row on/off. can_view=true
  // grants the full content surface (view + create / edit / publish).
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
