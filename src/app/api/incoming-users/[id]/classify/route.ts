import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperOrAlumniAdmin } from '@/lib/api-gates';

// POST /api/incoming-users/[id]/classify
//   body: { kind: 'staff' | 'guest' | 'alumni', status?: 'active' | 'denied' }
//
// Super admin, OR alumni admin for exactly one move: kind='alumni'
// with status 'active' (welcoming an incoming alumnus in). Every
// other transition — staff approval, guest classification, denials —
// stays super-admin. Sets users.user_kind plus optionally flips
// users.status. The team page filters on user_kind = 'staff', so
// flipping to guest/alumni also hides them from the public team grid.

export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = new Set(['staff', 'guest', 'alumni']);
const ALLOWED_STATUSES = new Set(['active', 'on_hold', 'denied']);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperOrAlumniAdmin(req);
  if (gate instanceof NextResponse) return gate;
  const alumniScoped = gate.isAlumniAdmin && !gate.isSuperAdmin;
  const { id } = await ctx.params;

  let body: { kind?: string; status?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const kind = typeof body.kind === 'string' ? body.kind.trim() : '';
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: 'kind must be staff, guest, or alumni' }, { status: 400 });
  }
  // Alumni admins may make exactly two moves on an external sign-in:
  //   • Mark alumni  → kind='alumni' (status active/unset)
  //   • Decline      → kind='guest', status='denied' (same pipeline the
  //                    super-admin Decline uses)
  // Everything else (staff approval, guest-as-active classification) stays
  // super-admin-only.
  if (alumniScoped) {
    const isMarkAlumni = kind === 'alumni' && (body.status === undefined || body.status === 'active');
    const isDecline = kind === 'guest' && body.status === 'denied';
    if (!isMarkAlumni && !isDecline) {
      return NextResponse.json(
        { error: 'Alumni admins can only mark accounts as alumni or decline them.' },
        { status: 403 },
      );
    }
  }
  const patch: Record<string, unknown> = { user_kind: kind };

  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }

  // Guests + alumni shouldn't appear on the public-facing team grid.
  // Force public_team off when classifying away from staff so the
  // marketing site picks up the change immediately.
  if (kind !== 'staff') patch.public_team = false;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('users')
    .update(patch)
    .eq('id', id)
    .select('id, user_kind, status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
