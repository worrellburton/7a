import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';
import {
  googleLocalPack,
  hasSerpApi,
  readSerpApiUsage,
  SerpApiError,
  type SerpApiUsageRecorder,
} from '@/lib/serpapi';

// /api/seo/local
//
// POST  → run a fresh google_local pack lookup for every "location"
//         keyword in the curated set, across each of the configured
//         markets. Persists into seo_local_ranks.
// GET   → return the latest seo_local_ranks row per (keyword, market)
//         so the Local pack page renders without spending SerpAPI
//         credits on every navigation.
//
// We only sweep the curated keywords flagged as `category: 'location'`
// — running google_local on a brand or modality keyword wastes
// credits because the pack rarely fires.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';

// Phoenix, Scottsdale, Tucson — the three markets our admissions
// funnel cares about. SerpAPI accepts a free-form location string;
// these are the canonical forms it geocodes cleanly. Adding a new
// market is a one-line edit here.
const MARKETS: { id: string; label: string; location: string }[] = [
  { id: 'phoenix', label: 'Phoenix', location: 'Phoenix, Arizona, United States' },
  { id: 'scottsdale', label: 'Scottsdale', location: 'Scottsdale, Arizona, United States' },
  { id: 'tucson', label: 'Tucson', location: 'Tucson, Arizona, United States' },
];

interface LocalCompetitor {
  position: number;
  title: string;
  rating: number | null;
  reviews: number | null;
  type: string | null;
  address: string | null;
  phone: string | null;
  place_id: string | null;
  link: string | null;
  is_us: boolean;
}

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const, supabase, userId: user.id };
}

function makeUsageRecorder(
  supabase: SupabaseClient,
  userId: string,
): SerpApiUsageRecorder {
  return async (rec) => {
    const { error } = await supabase.from('seo_serpapi_usage').insert({
      engine: rec.engine,
      query: rec.query,
      ok: rec.ok,
      duration_ms: rec.duration_ms,
      http_status: rec.http_status,
      error: rec.error,
      search_id: rec.search_id,
      called_by: userId,
    });
    if (error) console.warn('[serpapi.usage] insert failed', error.message);
  };
}

// "Are these the same business?" — SerpAPI doesn't return a stable
// place_id flag for our own listing, so we match by domain on the
// link OR by name containing "Seven Arrows". Tight enough that a
// stray link to seven-arrows-something-else.com wouldn't false-match.
function isOurBusiness(link: string | null, title: string, domain: string): boolean {
  const target = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  if (link) {
    try {
      const host = new URL(link).host.replace(/^www\./, '').toLowerCase();
      if (host === target || host.endsWith(`.${target}`)) return true;
    } catch {
      // ignore
    }
  }
  return /\bseven\s+arrows\b/i.test(title);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  if (!hasSerpApi()) {
    return NextResponse.json(
      { error: 'SERPAPI_KEY not configured' },
      { status: 412 },
    );
  }

  let body: { domain?: string; keywordIds?: string[]; markets?: string[] } = {};
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    /* ignore */
  }
  const domain = (body.domain ?? DEFAULT_DOMAIN).trim();
  const locationKeywords = (body.keywordIds
    ? KEYWORDS.filter((k) => body.keywordIds!.includes(k.id))
    : KEYWORDS
  ).filter((k) => k.category === 'location');
  const markets = body.markets
    ? MARKETS.filter((m) => body.markets!.includes(m.id))
    : MARKETS;

  if (locationKeywords.length === 0) {
    return NextResponse.json({ error: 'No location keywords' }, { status: 400 });
  }

  // Pre-flight cap — locationKeywords × markets calls.
  const totalCalls = locationKeywords.length * markets.length;
  const pre = readSerpApiUsage();
  if (pre.count + totalCalls > pre.cap) {
    return NextResponse.json(
      {
        error: `SerpAPI daily cap would be exceeded — ${pre.count}/${pre.cap} used today, sweep needs ${totalCalls} more.`,
        usage: pre,
      },
      { status: 429 },
    );
  }

  const recorder = makeUsageRecorder(auth.supabase, auth.userId);
  const startedAt = Date.now();

  interface ResultRow {
    keyword_id: string;
    keyword_text: string;
    query: string;
    location: string;
    market: string;
    market_label: string;
    our_position: number | null;
    our_place_id: string | null;
    our_title: string | null;
    competitors: LocalCompetitor[];
    total_results: number;
    error: string | null;
  }
  const results: ResultRow[] = [];

  for (const k of locationKeywords) {
    for (const m of markets) {
      try {
        const places = await googleLocalPack({
          q: k.text,
          location: m.location,
          onUsage: recorder,
        });
        let ourPos: number | null = null;
        let ourPlaceId: string | null = null;
        let ourTitle: string | null = null;
        const competitors: LocalCompetitor[] = places.map((p) => {
          const us = isOurBusiness(p.link, p.title, domain);
          if (us && ourPos == null) {
            ourPos = p.position;
            ourPlaceId = p.place_id;
            ourTitle = p.title;
          }
          return { ...p, is_us: us };
        });
        results.push({
          keyword_id: k.id,
          keyword_text: k.text,
          query: k.text,
          location: m.location,
          market: m.id,
          market_label: m.label,
          our_position: ourPos,
          our_place_id: ourPlaceId,
          our_title: ourTitle,
          competitors,
          total_results: places.length,
          error: null,
        });
      } catch (err) {
        if (err instanceof SerpApiError && err.status === 429) {
          return NextResponse.json(
            { error: err.message, usage: readSerpApiUsage() },
            { status: 429 },
          );
        }
        results.push({
          keyword_id: k.id,
          keyword_text: k.text,
          query: k.text,
          location: m.location,
          market: m.id,
          market_label: m.label,
          our_position: null,
          our_place_id: null,
          our_title: null,
          competitors: [],
          total_results: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Persist every successful row. Errored rows still record so
  // sparklines can flag the gap.
  const { error: insertErr } = await auth.supabase.from('seo_local_ranks').insert(
    results.map((r) => ({
      keyword_id: r.keyword_id,
      keyword_text: r.keyword_text,
      query: r.query,
      location: r.location,
      our_position: r.our_position,
      our_place_id: r.our_place_id,
      our_title: r.our_title,
      competitors: r.competitors,
      total_results: r.total_results,
      checked_by: auth.userId,
    })),
  );
  if (insertErr) {
    console.warn('[seo_local_ranks] insert failed', insertErr.message);
  }

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    domain,
    markets,
    results,
    usage: readSerpApiUsage(),
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await auth.supabase
    .from('seo_local_ranks')
    .select('keyword_id, keyword_text, query, location, our_position, our_place_id, our_title, competitors, total_results, checked_at')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(2000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  type Row = {
    keyword_id: string;
    keyword_text: string;
    query: string;
    location: string;
    our_position: number | null;
    our_place_id: string | null;
    our_title: string | null;
    competitors: LocalCompetitor[];
    total_results: number;
    checked_at: string;
  };

  // Bucket by keyword + location, keep only the most recent row per
  // bucket. The query already returns descending-time order, so the
  // first row we see for a (keyword_id, location) is the latest.
  const seen = new Set<string>();
  const latest: Row[] = [];
  for (const r of (data ?? []) as Row[]) {
    const key = `${r.keyword_id}::${r.location}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(r);
  }

  return NextResponse.json({
    markets: MARKETS,
    keywords: KEYWORDS.filter((k) => k.category === 'location').map((k) => ({
      id: k.id,
      text: k.text,
    })),
    latest,
  });
}

export type LocalKeyword = Pick<Keyword, 'id' | 'text'>;
