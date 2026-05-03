import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// GET /api/incoming-users
//
// Super-admin only. Returns:
//   - pendingStaff:   @sevenarrowsrecovery.com sign-ins still on hold
//   - externalNew:    sign-ins from outside @sevenarrowsrecovery
//                     who haven't been classified yet (user_kind=staff
//                     by default; we surface them as external when
//                     the email domain doesn't match)
//   - guests:         already-classified guests (with their page perms)
//   - alumni:         already-classified alumni
//
// Lives in /app/incoming-users (the popup-menu surface) and replaces
// the team-page "Pending Approval" strip for super admins.

export const dynamic = 'force-dynamic';

const SA_DOMAIN = '@sevenarrowsrecovery.com';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  is_admin: boolean | null;
  is_super_admin: boolean | null;
  user_kind: 'staff' | 'guest' | 'alumni';
  department_id: string | null;
  last_sign_in: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if ('response' in auth) return auth.response;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('users')
    .select('id, full_name, email, avatar_url, status, is_admin, is_super_admin, user_kind, department_id, last_sign_in, last_seen_at, created_at')
    .order('last_sign_in', { ascending: false, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data ?? []) as UserRow[];
  const isSa = (u: UserRow) => (u.email || '').toLowerCase().endsWith(SA_DOMAIN);

  const pendingStaff = all.filter((u) => u.status === 'on_hold' && isSa(u));
  const externalNew = all.filter(
    (u) => !isSa(u) && u.user_kind === 'staff' && (u.status === 'on_hold' || u.status === null),
  );
  const guests = all.filter((u) => u.user_kind === 'guest');
  const alumni = all.filter((u) => u.user_kind === 'alumni');

  // Per-page permissions for current guests so the UI can show
  // "Allowed pages: X" without an extra round-trip per row.
  const guestIds = guests.map((g) => g.id);
  const guestPagesMap: Record<string, string[]> = {};
  if (guestIds.length > 0) {
    const { data: perms } = await admin
      .from('user_page_permissions')
      .select('user_id, path, can_view')
      .in('user_id', guestIds)
      .eq('can_view', true);
    for (const p of perms ?? []) {
      const id = p.user_id as string;
      const path = p.path as string;
      (guestPagesMap[id] ||= []).push(path);
    }
  }

  return NextResponse.json({
    pendingStaff,
    externalNew,
    guests: guests.map((g) => ({ ...g, allowedPages: guestPagesMap[g.id] ?? [] })),
    alumni,
  });
}
