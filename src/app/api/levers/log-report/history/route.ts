import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/levers/log-report/history?limit=10
//
// Returns the recent activity-feed rows for the log-report lever
// so the lever's history disclosure can show 'who pulled it, when,
// to which cohort' without spelunking the activity log. Rolls
// per-recipient rows up by (pulled_at, pulled_by) so a single
// fan-out shows as one history entry with a recipient count.

export const dynamic = 'force-dynamic';

interface RawPullRow {
  id: string;
  pulled_at: string;
  pulled_by: string | null;
  pulled_by_name: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
}

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: meRow } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const admin = getAdminSupabase();

  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? '10')));

  const { data: rows, error } = await admin
    .from('lever_pulls')
    .select('id, pulled_at, pulled_by, pulled_by_name, status, metadata')
    .eq('lever_type', 'log-report')
    .order('pulled_at', { ascending: false })
    .limit(limit * 20); // grab enough raw rows to roll up `limit` distinct sends
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Roll up by (pulled_at bucketed to the second, pulled_by) so a
  // 6-recipient fan-out shows as one history entry with a
  // recipient count.
  const buckets = new Map<string, {
    pulledAt: string;
    pulledBy: string | null;
    pulledByName: string | null;
    sent: number;
    failed: number;
    simulated: number;
    subject: string | null;
    window: { startsAt: string; endsAt: string; label: string } | null;
    total: number | null;
  }>();
  for (const r of (rows ?? []) as RawPullRow[]) {
    const bucketKey = `${r.pulled_at.slice(0, 19)}|${r.pulled_by ?? 'unknown'}`;
    const slot = buckets.get(bucketKey) ?? {
      pulledAt: r.pulled_at,
      pulledBy: r.pulled_by,
      pulledByName: r.pulled_by_name,
      sent: 0,
      failed: 0,
      simulated: 0,
      subject: null,
      window: null,
      total: null,
    };
    if (r.status === 'sent') slot.sent += 1;
    else if (r.status === 'simulated') slot.simulated += 1;
    else if (r.status === 'failed') slot.failed += 1;
    const md = r.metadata ?? {};
    if (!slot.subject && typeof md.subject === 'string') slot.subject = md.subject;
    if (!slot.window && md.window) slot.window = md.window as { startsAt: string; endsAt: string; label: string };
    if (slot.total == null && typeof md.total === 'number') slot.total = md.total as number;
    buckets.set(bucketKey, slot);
  }
  const history = Array.from(buckets.values())
    .sort((a, b) => (a.pulledAt < b.pulledAt ? 1 : -1))
    .slice(0, limit);

  return NextResponse.json({ history });
}
