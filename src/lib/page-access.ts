// Server-side page-access gate for /api/* routes.
//
// Mirrors the per-user permission model the sidebar already
// honours (lib/PagePermissions.tsx). The original /api/google/*
// gate was "is_admin only", which meant a super admin could toggle
// "Analytics → visible" for a non-admin in /feather/admin/user-permissions
// but every data fetch the page made still returned 403 — the user
// saw a working sidebar entry whose page rendered as empty
// sections. requirePageAccess closes that gap: any user that the
// PermissionsModal would surface the page to also gets through the
// server gate.
//
// Order of grants (matches PlatformShell.canSeePage):
//   1. Authenticated user
//   2. is_super_admin OR is_admin
//   3. Explicit user_page_permissions row with can_view = true
//      for the given pagePath
//
// Anyone else gets a 403. RLS on user_page_permissions normally
// blocks non-admins from reading other users' rows, but the
// admin client here bypasses RLS to look up the calling user's
// own override.

import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import type { User } from '@supabase/supabase-js';

export interface PageAccessGrant {
  user: User;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  error: null;
}

export interface PageAccessDenied {
  user: null;
  isAdmin: false;
  isSuperAdmin: false;
  error: NextResponse;
}

export async function requirePageAccess(pagePath: string): Promise<PageAccessGrant | PageAccessDenied> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      isAdmin: false,
      isSuperAdmin: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: row } = await supabase
    .from('users')
    .select('is_admin, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = row?.is_admin === true;
  const isSuperAdmin = row?.is_super_admin === true;
  if (isAdmin || isSuperAdmin) {
    return { user, isAdmin, isSuperAdmin, error: null };
  }
  const admin = getAdminSupabase();
  const { data: override } = await admin
    .from('user_page_permissions')
    .select('can_view')
    .eq('user_id', user.id)
    .eq('path', pagePath)
    .maybeSingle();
  if (override?.can_view === true) {
    return { user, isAdmin: false, isSuperAdmin: false, error: null };
  }
  return {
    user: null,
    isAdmin: false,
    isSuperAdmin: false,
    error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  };
}
