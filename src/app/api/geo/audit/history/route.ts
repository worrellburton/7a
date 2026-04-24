import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/geo/audit/history?site=<optional>&limit=<default 30>
// Admin-only. Returns trimmed metadata for the last N GEO audits:
// just {id, createdAt, score, grade, engines, durationMs, site}.
// The full payload is intentionally NOT returned — trend charts don't
// need it, and returning 30 full payloads with per-call answer text
// would easily blow past 10MB.

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 90;
const DEFAULT_LIMIT = 30;

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const site = url.searchParams.get('site');
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)),
  );

  let q = supabase
    .from('geo_audits')
    .select('id, site, score, grade, engines, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (site) q = q.eq('site', site);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ history: [], warning: error.message });
  }

  // Flip to chronological order so consumers can just iterate without
  // reversing again.
  const history = (data ?? [])
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      site: row.site,
      score: row.score,
      grade: row.grade,
      engines: row.engines as string[],
      durationMs: row.duration_ms,
      createdAt: row.created_at,
    }));

  return NextResponse.json({ history });
}
