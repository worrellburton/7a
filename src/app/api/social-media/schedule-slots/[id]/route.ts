import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// DELETE /api/social-media/schedule-slots/[id]
//
// Slots are global on this team — every staff user sees every slot
// and any super admin should be able to clean up the cadence library.
// Earlier versions filtered the DELETE on (id, created_by=user.id)
// only, which meant a non-creator's click looked successful (the
// route still returned 200 ok) but the row stayed in the DB and
// reappeared on the next reload. Now:
//   · super admins delete any slot
//   · regular users still only delete their own
//   · we .select() the deleted row so we can return 404 when the
//     filter matched zero rows, giving the UI something to surface
//     instead of silently swallowing the click.

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isSuperAdmin = meRow?.is_super_admin === true;

  let query = admin.from('social_media_schedule_slots').delete().eq('id', id);
  if (!isSuperAdmin) {
    query = query.eq('created_by', user.id);
  }
  const { data, error } = await query.select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Slot not found, or you do not have permission to delete it. Only the creator or a super admin can delete a schedule.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
