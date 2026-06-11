import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/partnerships/[id]/history
//
// Partner and contact history are ONE stream. This returns the
// UNIFIED contact_logs timeline for the partner's linked contact
// (newest first) — so touchpoints logged from /feather/contacts and
// from /feather/partnerships appear in the same history on both
// pages. Falls back to legacy partner_logs only for a partner that
// somehow has no linked contact.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: partner } = await admin
    .from('partners')
    .select('contact_id')
    .eq('id', id)
    .maybeSingle();
  const contactId = (partner as { contact_id: string | null } | null)?.contact_id ?? null;

  const { data: logs, error } = contactId
    ? await admin
        .from('contact_logs')
        .select('id, method, comments, contacted_by, contacted_at')
        .eq('contact_id', contactId)
        .order('contacted_at', { ascending: false })
    : await admin
        .from('partner_logs')
        .select('id, method, comments, contacted_by, contacted_at')
        .eq('partner_id', id)
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
