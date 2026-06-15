import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// Server-side access gate for the chat feature.
//
// Chat is an ALUMNI-ONLY space: the peer community room + alumni-to-alumni
// DMs. ONLY user_kind='alumni' may read or post — every employee is
// excluded, super admins included (no moderator exception).
//
// This is the authoritative enforcement; the sidebar (canSeePage) and the
// route (PageGuard) gates are UX so employees never see the link or land
// on an empty page, but THIS is what actually withholds the data.

export interface ChatGate {
  user: { id: string };
  userKind: string | null;
  isSuperAdmin: boolean;
}

export async function requireChatAccess(req: NextRequest): Promise<ChatGate | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('users')
    .select('user_kind, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const userKind = (data as { user_kind?: string | null } | null)?.user_kind ?? null;
  const isSuperAdmin = (data as { is_super_admin?: boolean } | null)?.is_super_admin === true;
  if (userKind !== 'alumni') {
    return NextResponse.json({ error: 'Chat is for alumni only' }, { status: 403 });
  }
  return { user, userKind, isSuperAdmin };
}

// True when `otherId` is an alumnus. Used to keep DMs alumni-to-alumni:
// an alum can only message another alum, never an employee.
export async function isAlumniUser(otherId: string): Promise<boolean> {
  if (!otherId) return false;
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('users')
    .select('user_kind')
    .eq('id', otherId)
    .maybeSingle();
  return (data as { user_kind?: string | null } | null)?.user_kind === 'alumni';
}
