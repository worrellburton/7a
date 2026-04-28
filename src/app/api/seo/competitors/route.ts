import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS } from '@/lib/seo/keywords';

// GET /api/seo/competitors
//
// Returns each priority-1 keyword's most recent top-10 from
// seo_competitor_serps, plus the corresponding row from ~7 days
// prior so the page can show "who jumped us" / "who we jumped"
// at a glance.

export const dynamic = 'force-dynamic';

interface CompetitorRow {
  keyword_id: string;
  keyword_text: string;
  position: number;
  url: string;
  domain: string;
  title: string | null;
  snippet: string | null;
  is_us: boolean;
  checked_at: string;
}

interface KeywordCompetitors {
  id: string;
  text: string;
  latest_checked_at: string | null;
  current: CompetitorRow[];
  previous: CompetitorRow[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Last 21 days of competitor data — enough to cover an irregular
  // sweep cadence + the 7-day-ago lookup. Cap at 5000 rows so a
  // future runaway cron doesn't make this query expensive.
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('seo_competitor_serps')
    .select('keyword_id, keyword_text, position, url, domain, title, snippet, is_us, checked_at')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const rows = (data ?? []) as CompetitorRow[];

  // Group by keyword_id. For each keyword:
  //   - "current" = the most recent checked_at's full top-10
  //   - "previous" = the checked_at closest to (current - 7 days)'s top-10
  const byKeyword = new Map<string, CompetitorRow[]>();
  for (const r of rows) {
    const list = byKeyword.get(r.keyword_id) ?? [];
    list.push(r);
    byKeyword.set(r.keyword_id, list);
  }

  const out: KeywordCompetitors[] = [];
  for (const k of KEYWORDS) {
    const all = byKeyword.get(k.id) ?? [];
    if (all.length === 0) {
      out.push({ id: k.id, text: k.text, latest_checked_at: null, current: [], previous: [] });
      continue;
    }
    const latestTs = all[0].checked_at;
    const current = all.filter((r) => r.checked_at === latestTs).sort((a, b) => a.position - b.position);
    // For "previous", find the checked_at value closest to latest - 7d.
    const target = new Date(latestTs).getTime() - WEEK_MS;
    const distinctTs = Array.from(new Set(all.map((r) => r.checked_at)))
      .filter((t) => t !== latestTs);
    let bestTs: string | null = null;
    let bestDelta = Infinity;
    for (const t of distinctTs) {
      const tt = new Date(t).getTime();
      if (tt > new Date(latestTs).getTime() - 60_000) continue;
      const d = Math.abs(tt - target);
      if (d < bestDelta) { bestDelta = d; bestTs = t; }
    }
    const previous = bestTs
      ? all.filter((r) => r.checked_at === bestTs).sort((a, b) => a.position - b.position)
      : [];
    out.push({
      id: k.id,
      text: k.text,
      latest_checked_at: latestTs,
      current,
      previous,
    });
  }

  return NextResponse.json({ keywords: out });
}
