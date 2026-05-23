import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getServerSupabase, getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// Server-route auth + permission gates. Until this lib existed, the
// "auth.getUser() → users.select('is_admin, is_super_admin,
// department_id') → check membership" pattern was hand-rolled in
// ~30 route handlers, each ~15 lines, each with subtly different
// error messages and select-column lists. One missing condition
// (e.g. forgetting the is_super_admin OR clause) could quietly
// open up a write. This file centralises the gate so every route
// runs the same check and one fix patches all of them.
//
// All helpers return either:
//   - a NextResponse to short-circuit with (401 / 403), or
//   - a `gate` object with the user + admin Supabase clients and
//     the resolved flags so the route can carry on.
//
// Usage:
//
//   const gate = await requireAdmin(req);
//   if (gate instanceof NextResponse) return gate;
//   // ...gate.user, gate.userId, gate.admin available below

// Marketing & Admissions department UUID. Used by gates that allow
// either an admin OR a marketing-department member to read a
// reporting surface (recipients-analytics, contact insights, etc.).
export const MARKETING_DEPT_ID = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';

// ──── Resolved gate context ────────────────────────────────────

export interface GateContext {
  /** Authenticated Supabase user (auth.users row). */
  user: User;
  /** Convenience alias. */
  userId: string;
  /** Service-role admin client for downstream queries that need to
   *  bypass RLS — most routes already use this for their main work. */
  admin: SupabaseClient;
  /** Whether the user has is_admin = true on public.users. */
  isAdmin: boolean;
  /** Whether the user has is_super_admin = true. */
  isSuperAdmin: boolean;
  /** Department UUID the user belongs to, if any. */
  departmentId: string | null;
}

// ──── Building blocks ──────────────────────────────────────────

async function resolveContext(req?: NextRequest): Promise<{ ctx: GateContext } | { error: NextResponse }> {
  // `req` is optional because some routes don't have access to it
  // (e.g. handlers that read the cookie via getServerSupabase
  // rather than the Authorization header). When req is supplied we
  // prefer the request-bound path so Bearer-token calls keep
  // working; otherwise fall back to the cookie session.
  let user: User | null = null;
  if (req) {
    user = await getUserFromRequest(req);
  } else {
    const supabase = await getServerSupabase();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = getAdminSupabase();
  const { data: row } = await admin
    .from('users')
    .select('is_admin, is_super_admin, department_id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    ctx: {
      user,
      userId: user.id,
      admin,
      isAdmin: row?.is_admin === true,
      isSuperAdmin: row?.is_super_admin === true,
      departmentId: (row?.department_id as string | null | undefined) ?? null,
    },
  };
}

// ──── Public gates ─────────────────────────────────────────────

/** Require a signed-in user. Doesn't check any role beyond that. */
export async function requireUser(req?: NextRequest): Promise<GateContext | NextResponse> {
  const res = await resolveContext(req);
  if ('error' in res) return res.error;
  return res.ctx;
}

/** Require is_admin OR is_super_admin. The UI's "Super Admin"
 *  toggle actually writes users.is_admin, so accept either column. */
export async function requireAdmin(
  req?: NextRequest,
  forbiddenMessage = 'Only admins can do that.',
): Promise<GateContext | NextResponse> {
  const res = await resolveContext(req);
  if ('error' in res) return res.error;
  if (!res.ctx.isAdmin && !res.ctx.isSuperAdmin) {
    return NextResponse.json({ error: forbiddenMessage }, { status: 403 });
  }
  return res.ctx;
}

/** Require is_super_admin specifically — for ops-only routes the
 *  is_admin path shouldn't reach. */
export async function requireSuperAdmin(
  req?: NextRequest,
  forbiddenMessage = 'Super admin only.',
): Promise<GateContext | NextResponse> {
  const res = await resolveContext(req);
  if ('error' in res) return res.error;
  if (!res.ctx.isSuperAdmin) {
    return NextResponse.json({ error: forbiddenMessage }, { status: 403 });
  }
  return res.ctx;
}

/** Require admin status OR membership in a specific department.
 *  Used by reporting surfaces that the corresponding department
 *  should be able to read (e.g. Marketing reading email-campaign
 *  analytics, Admissions reading intake reports). */
export async function requireAdminOrDepartment(
  departmentId: string,
  req?: NextRequest,
  forbiddenMessage = 'Forbidden',
): Promise<GateContext | NextResponse> {
  const res = await resolveContext(req);
  if ('error' in res) return res.error;
  const allowed = res.ctx.isAdmin || res.ctx.isSuperAdmin || res.ctx.departmentId === departmentId;
  if (!allowed) {
    return NextResponse.json({ error: forbiddenMessage }, { status: 403 });
  }
  return res.ctx;
}
