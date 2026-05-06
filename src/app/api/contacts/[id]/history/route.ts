import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/[id]/history
//
// Returns every contact_log entry for one contact (newest first),
// joined with the logging user's display name + avatar so the
// modal can render the full timeline without a second round-trip.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: logs, error } = await admin
    .from('contact_logs')
    .select('id, method, comments, contacted_by, contacted_at')
    .eq('contact_id', id)
    .order('contacted_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (logs ?? []) as Array<{
    id: string;
    method: string;
    comments: string | null;
    contacted_by: string | null;
    contacted_at: string;
  }>;

  const userIds = Array.from(new Set(rows.map((r) => r.contacted_by).filter((v): v is string => !!v)));
  const nameById = new Map<string, { name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
      nameById.set(u.id, { name: u.full_name, avatar_url: u.avatar_url });
    }
  }

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      contacted_by_name: r.contacted_by ? (nameById.get(r.contacted_by)?.name ?? null) : null,
      contacted_by_avatar_url: r.contacted_by ? (nameById.get(r.contacted_by)?.avatar_url ?? null) : null,
    })),
  });
}
