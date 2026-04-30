import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { runPsi, hasPsiKey, type PsiSnapshot, type PsiStrategy } from '@/lib/seo/psi';

// POST /api/seo/speed/run
//
// Admin-only. Runs PageSpeed Insights against a list of URLs for one or
// both strategies (mobile / desktop) and writes one row per (url,
// strategy) into public.seo_speed_runs. Returns the freshly-computed
// snapshots so the page can render without a second round-trip.
//
// Body:
//   { urls: string[], strategies?: ('mobile'|'desktop')[] }
//
// Each PSI call is 10-25s; we run them in parallel. With both strategies
// for 5 URLs that's 10 concurrent calls — within Google's burst budget
// for an authenticated key.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_URLS_PER_RUN = 10;

interface RunBody {
  urls?: unknown;
  strategies?: unknown;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasPsiKey()) {
    return NextResponse.json(
      { error: 'PAGESPEED_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as RunBody;
  const urlsRaw = Array.isArray(body.urls) ? body.urls : [];
  const stratsRaw = Array.isArray(body.strategies) ? body.strategies : ['mobile', 'desktop'];

  const urls: string[] = [];
  for (const u of urlsRaw) {
    if (typeof u !== 'string' || urls.length >= MAX_URLS_PER_RUN) continue;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      urls.push(parsed.toString());
    } catch {
      // skip invalid
    }
  }
  if (urls.length === 0) {
    return NextResponse.json({ error: 'Pass at least one valid http(s) URL in `urls`.' }, { status: 400 });
  }

  const strategies: PsiStrategy[] = [];
  for (const s of stratsRaw) {
    if (s === 'mobile' || s === 'desktop') {
      if (!strategies.includes(s)) strategies.push(s);
    }
  }
  if (strategies.length === 0) strategies.push('mobile', 'desktop');

  const startedAt = Date.now();
  const tasks: Array<Promise<PsiSnapshot>> = [];
  for (const url of urls) {
    for (const strategy of strategies) {
      tasks.push(runPsi(url, strategy));
    }
  }

  const snapshots = await Promise.all(tasks);

  // Persist every snapshot — including failures — so the timeline
  // shows when a URL was checked and went down. The admin client
  // bypasses RLS so we can write under the user's session.
  const admin = getAdminSupabase();
  const rows = snapshots.map((s) => ({
    ran_by: user.id,
    url: s.url,
    strategy: s.strategy,
    performance: s.performance,
    fcp: s.metrics.fcp,
    lcp: s.metrics.lcp,
    cls: s.metrics.cls,
    tbt: s.metrics.tbt,
    si: s.metrics.si,
    opportunities: s.opportunities,
    fetch_ms: s.fetchMs,
    ok: s.ok,
    error: s.error,
  }));
  const { error: insertError } = await admin.from('seo_speed_runs').insert(rows);

  return NextResponse.json({
    snapshots,
    persisted: !insertError,
    persistError: insertError?.message ?? null,
    durationMs: Date.now() - startedAt,
  });
}
