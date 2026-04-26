import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  fetchBacklinks,
  fetchBacklinksOverview,
  hasSemrush,
  semrushDefaultTarget,
  SemrushError,
} from '@/lib/semrush';

// GET /api/seo/backlinks?target=domain.com&filter=all|follow|nofollow|ugc|sponsored
//   &limit=…&offset=…&sort=…
//
// Admin-only proxy in front of the Semrush analytics v1 API. The
// API key never leaves the server. Returns an overview block (so
// the page can render its summary cards) plus the requested page
// of backlink rows already shaped + filter-flagged.
//
// Cached in-memory for 10 minutes per query because Semrush
// charges API units per row pulled — we don't want a refresh
// loop hammering the budget.

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { expiresAt: number; payload: unknown }>();

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasSemrush()) {
    return NextResponse.json(
      {
        error:
          'Semrush integration not configured. Set SEMRUSH_API_KEY in the Vercel project env (and optionally SEMRUSH_TARGET_DOMAIN as a default).',
      },
      { status: 412 },
    );
  }

  const url = new URL(req.url);
  // Fall back through ?target= → SEMRUSH_TARGET_DOMAIN env → the
  // production domain. The hardcoded last-resort means a fresh deploy
  // works without anyone having to remember to set the env var.
  const target =
    url.searchParams.get('target') ||
    semrushDefaultTarget() ||
    'sevenarrowsrecoveryarizona.com';
  const filter = (url.searchParams.get('filter') || 'all').toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0'));
  const sort = url.searchParams.get('sort') || 'last_seen_desc';

  const cacheKey = JSON.stringify({ target, filter, limit, offset, sort });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...(cached.payload as object), cached: true });
  }

  try {
    const [overview, allRows] = await Promise.all([
      fetchBacklinksOverview({ target }),
      fetchBacklinks({ target, limit, offset, sort }),
    ]);

    // Filter rows in-process. Semrush also supports filtering via
    // display_filter, but doing it client-side here keeps the
    // overview counts honest (overview always reflects every link)
    // and the filter chips snappy.
    const filtered = allRows.filter((r) => {
      switch (filter) {
        case 'follow': return r.is_follow;
        case 'nofollow': return r.is_nofollow;
        case 'ugc': return r.is_ugc;
        case 'sponsored': return r.is_sponsored;
        case 'all':
        default: return true;
      }
    });

    const payload = {
      target,
      filter,
      overview,
      rows: filtered,
      total_in_page: allRows.length,
      filtered_in_page: filtered.length,
      fetched_at: new Date().toISOString(),
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof SemrushError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
