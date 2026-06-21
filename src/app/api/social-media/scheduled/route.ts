import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

// GET /api/social-media/scheduled
//
// Authoritative list of scheduled-but-not-yet-sent posts, sourced from
// OUR OWN records (activity_log) rather than Ayrshare's /history — which
// proved unreliable at surfacing future-dated posts. Every successful
// schedule writes a `social.scheduled` row (with the Ayrshare post id +
// scheduleDate); every cancel writes a `social.schedule_canceled` row.
// This endpoint returns the future-dated scheduled rows minus the
// canceled ones, so the Scheduled Posts panel can never silently hide a
// post that's queued to fire.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  // Read with the admin client so activity_log RLS can't hide a row.
  const admin = getAdminSupabase();

  const [{ data: scheduledRows }, { data: canceledRows }] = await Promise.all([
    admin
      .from('activity_log')
      .select('id, created_at, target_label, metadata')
      .eq('type', 'social.scheduled')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('activity_log')
      .select('metadata')
      .eq('type', 'social.schedule_canceled')
      .limit(1000),
  ]);

  const canceledIds = new Set(
    (canceledRows ?? [])
      .map((r) => (r.metadata as { ayrshareId?: string } | null)?.ayrshareId)
      .filter((v): v is string => typeof v === 'string' && v.length > 0),
  );

  const now = Date.now();
  const posts = (scheduledRows ?? [])
    .map((r) => {
      const m = (r.metadata ?? {}) as {
        scheduleDate?: string | null;
        platforms?: unknown;
        ayrshareId?: string | null;
      };
      return {
        logId: r.id as string,
        ayrshareId: m.ayrshareId ?? null,
        scheduleDate: m.scheduleDate ?? null,
        platforms: Array.isArray(m.platforms) ? (m.platforms as string[]) : [],
        caption: (r.target_label as string | null) ?? '',
        createdAt: r.created_at as string,
      };
    })
    // Only future, still-queued posts that haven't been canceled.
    .filter((p) => {
      if (!p.scheduleDate) return false;
      const t = Date.parse(p.scheduleDate);
      if (!Number.isFinite(t) || t <= now) return false;
      if (p.ayrshareId && canceledIds.has(p.ayrshareId)) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.scheduleDate as string) - Date.parse(b.scheduleDate as string));

  return NextResponse.json({ posts });
}
