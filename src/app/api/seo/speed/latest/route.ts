import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/seo/speed/latest
//
// Admin-only. Returns the most-recent snapshot per (url, strategy)
// pair from public.seo_speed_runs, used to hydrate the Speed page on
// mount so admins see prior results without re-running PSI (each PSI
// call is 10-25s).

export const dynamic = 'force-dynamic';

interface SpeedRunRow {
  id: string;
  ran_at: string;
  ran_by: string | null;
  url: string;
  strategy: 'mobile' | 'desktop';
  performance: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number }>;
  fetch_ms: number | null;
  ok: boolean;
  error: string | null;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Pull a generous slice of recent rows (the dedup is done in-memory
  // because Supabase doesn't support DISTINCT ON without a function).
  // 200 rows handles ~50 distinct URL/strategy pairs comfortably.
  const { data, error } = await supabase
    .from('seo_speed_runs')
    .select('id, ran_at, ran_by, url, strategy, performance, fcp, lcp, cls, tbt, si, opportunities, fetch_ms, ok, error')
    .order('ran_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const latest: SpeedRunRow[] = [];
  for (const r of (data ?? []) as SpeedRunRow[]) {
    const key = `${r.url}|${r.strategy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(r);
  }

  return NextResponse.json({ snapshots: latest, checked_at: new Date().toISOString() });
}
