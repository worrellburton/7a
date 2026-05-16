import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// DELETE /api/social-media/schedule-slots/[id]
// Owner-only. RLS on the table also enforces this.

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getAdminSupabase();
  const { error } = await admin
    .from('social_media_schedule_slots')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
