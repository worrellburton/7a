import { NextRequest, NextResponse } from 'next/server';
import { requireSuperOrAlumniAdmin } from '@/lib/api-gates';
import { apiError } from '@/lib/api-responses';

// POST /api/alumni-admin/approve  { id: <user_id> }
//
// Flips public.users.status='active' on a single alumni row. Accepts
// Super Admin OR Alumni Admin via the shared gate. Built because
// the regular users-table UPDATE RLS policy is keyed on is_admin()
// (the column, via the SQL function of the same name) — an Alumni
// Admin who isn't is_admin gets denied by RLS when the client tries
// to write through the browser Supabase client. This route uses the
// service-role admin client behind the gate so the write succeeds,
// then enforces target.user_kind='alumni' as the only extra guard
// — Alumni Admins can never use this to mutate a staff or guest row.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireSuperOrAlumniAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const targetId = typeof body.id === 'string' ? body.id : null;
  if (!targetId) return apiError('validation', 'id is required');

  const { admin, userId: callerId, isSuperAdmin } = gate;

  const { data: target, error: lookupErr } = await admin
    .from('users')
    .select('id, user_kind, status, full_name, email')
    .eq('id', targetId)
    .maybeSingle();
  if (lookupErr) return apiError('server_error', lookupErr.message);
  if (!target) return apiError('not_found', 'User not found');
  if (target.user_kind !== 'alumni') {
    return apiError('forbidden', 'This endpoint only approves alumni accounts.');
  }

  if (target.status === 'active') {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  const { error: updErr } = await admin
    .from('users')
    .update({ status: 'active' })
    .eq('id', targetId);
  if (updErr) return apiError('server_error', updErr.message);

  // Audit row so a future "who approved this alumni" question has
  // a clear answer on the admin Activity feed. The activity_log
  // table uses user_id / target_kind / metadata column names
  // (not actor_id / target_type / payload).
  await admin.from('activity_log').insert({
    type: 'alumni.approved',
    user_id: callerId,
    target_kind: 'user',
    target_id: targetId,
    target_label: target.full_name || target.email || 'alumni',
    metadata: {
      via: isSuperAdmin ? 'super_admin' : 'alumni_admin',
      previous_status: target.status,
    },
  }).then((r) => {
    if (r.error) console.warn('[alumni-admin/approve] activity_log insert failed:', r.error.message);
  });

  return NextResponse.json({ ok: true });
}
