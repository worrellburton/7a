import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';
import {
  findRankInOrganic,
  googleAutocomplete,
  googleLocalPack,
  googleRelatedQuestions,
  googleSearch,
  hasSerpApi,
  type SerpApiUsageRecorder,
} from '@/lib/serpapi';

// GET /api/cron/seo/weekly
//
// Vercel-scheduled SerpAPI sweep. Runs once a week and persists:
//   - keyword ranks (top-100 organic for every curated keyword)
//   - top-10 competitor SERPs (same response, no extra cost)
//   - local pack 3-pack across the configured markets for every
//     "location" keyword
//   - PAA questions for every priority-1 keyword
//   - autocomplete suggestions for the curated seed-prefix list
//
// Kill switch: env SEO_AUTO_SYNC_ENABLED=false halts the sweep
// before any SerpAPI call. Lets us pause the whole pipeline without
// a Vercel redeploy when we're chasing a quota issue.
//
// Auth: relies on Vercel cron's `x-vercel-cron` header. When the
// handler is hit interactively (admin-triggered "run now"), the
// Authorization Bearer header must match CRON_SECRET — same pattern
// the existing /api/calls/auto-score uses, so we reuse the secret.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';

const MARKETS = [
  { id: 'phoenix', label: 'Phoenix', location: 'Phoenix, Arizona, United States' },
  { id: 'scottsdale', label: 'Scottsdale', location: 'Scottsdale, Arizona, United States' },
  { id: 'tucson', label: 'Tucson', location: 'Tucson, Arizona, United States' },
];

const SEED_PREFIXES = [
  'rehab in arizona',
  'drug rehab phoenix',
  'addiction treatment scottsdale',
  'inpatient rehab tucson',
  'equine therapy rehab',
  'trauma informed addiction treatment',
  'holistic rehab arizona',
  'dual diagnosis treatment',
  'rehabs that accept aetna',
  'rehabs that accept blue cross',
  'rehabs that take tricare',
  'alcohol rehab arizona',
  'opioid treatment arizona',
  'fentanyl rehab arizona',
  'how much does rehab cost',
  'how to choose a rehab',
];

function makeUsageRecorder(supabase: SupabaseClient): SerpApiUsageRecorder {
  // Cron runs as the service-role client (no auth.uid()), so
  // called_by stays null. The seo_serpapi_usage row still records
  // engine, query, status, and duration so the Source Health panel
  // can show the cron's burn rate.
  return async (rec) => {
    const { error } = await supabase.from('seo_serpapi_usage').insert({
      engine: rec.engine,
      query: rec.query,
      ok: rec.ok,
      duration_ms: rec.duration_ms,
      http_status: rec.http_status,
      error: rec.error,
      search_id: rec.search_id,
      called_by: null,
    });
    if (error) console.warn('[cron.serpapi.usage] insert failed', error.message);
  };
}

function isOurDomain(link: string | null, domain: string): boolean {
  if (!link) return false;
  const target = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  try {
    const host = new URL(link).host.replace(/^www\./, '').toLowerCase();
    return host === target || host.endsWith(`.${target}`);
  } catch {
    return false;
  }
}

function competitorDomain(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (req.headers.get('x-vercel-cron')) return true;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if ((process.env.SEO_AUTO_SYNC_ENABLED ?? 'true').toLowerCase() === 'false') {
    return NextResponse.json({ skipped: true, reason: 'SEO_AUTO_SYNC_ENABLED=false' });
  }
  if (!hasSerpApi()) {
    return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 412 });
  }

  const supabase = getAdminSupabase();
  const recorder = makeUsageRecorder(supabase);
  const startedAt = Date.now();
  const summary: Record<string, unknown> = {};

  // 1. Keyword ranks + top-10 competitors (one google search per
  //    curated keyword, both tables filled from each response).
  const rankInserts: Record<string, unknown>[] = [];
  const compInserts: Record<string, unknown>[] = [];
  let rankErrors = 0;
  for (const k of KEYWORDS) {
    try {
      const { organic, features } = await googleSearch({
        q: k.text,
        num: 100,
        onUsage: recorder,
      });
      const hit = findRankInOrganic(organic, DEFAULT_DOMAIN);
      rankInserts.push({
        keyword_id: k.id,
        keyword_text: k.text,
        domain: DEFAULT_DOMAIN,
        rank: hit?.position ?? null,
        url: hit?.url ?? null,
        total_organic: organic.length,
        serp_features: features,
        checked_by: null,
      });
      for (const o of organic.slice(0, 10)) {
        const d = competitorDomain(o.link);
        if (!d) continue;
        compInserts.push({
          keyword_id: k.id,
          keyword_text: k.text,
          position: o.position,
          url: o.link,
          domain: d,
          title: o.title || null,
          snippet: o.snippet ?? null,
          is_us: isOurDomain(o.link, DEFAULT_DOMAIN),
        });
      }
    } catch (err) {
      rankErrors += 1;
      console.warn('[cron.weekly] rank fetch failed', k.id, err instanceof Error ? err.message : err);
    }
  }
  if (rankInserts.length > 0) await supabase.from('seo_keyword_ranks').insert(rankInserts);
  if (compInserts.length > 0) await supabase.from('seo_competitor_serps').insert(compInserts);
  summary.ranks = { keywords: KEYWORDS.length, persisted: rankInserts.length, errors: rankErrors };
  summary.competitors = { rows: compInserts.length };

  // 2. Local pack — only "location" category keywords × markets.
  const locationKeywords = KEYWORDS.filter((k: Keyword) => k.category === 'location');
  const localInserts: Record<string, unknown>[] = [];
  let localErrors = 0;
  for (const k of locationKeywords) {
    for (const m of MARKETS) {
      try {
        const places = await googleLocalPack({ q: k.text, location: m.location, onUsage: recorder });
        let ourPos: number | null = null;
        let ourPlaceId: string | null = null;
        let ourTitle: string | null = null;
        const competitors = places.map((p) => {
          const us = isOurDomain(p.link, DEFAULT_DOMAIN) || /\bseven\s+arrows\b/i.test(p.title);
          if (us && ourPos == null) {
            ourPos = p.position;
            ourPlaceId = p.place_id;
            ourTitle = p.title;
          }
          return { ...p, is_us: us };
        });
        localInserts.push({
          keyword_id: k.id,
          keyword_text: k.text,
          query: k.text,
          location: m.location,
          our_position: ourPos,
          our_place_id: ourPlaceId,
          our_title: ourTitle,
          competitors,
          total_results: places.length,
          checked_by: null,
        });
      } catch (err) {
        localErrors += 1;
        console.warn('[cron.weekly] local fetch failed', k.id, m.id, err instanceof Error ? err.message : err);
      }
    }
  }
  if (localInserts.length > 0) await supabase.from('seo_local_ranks').insert(localInserts);
  summary.local = { rows: localInserts.length, errors: localErrors };

  // 3. PAA — priority-1 keywords only.
  const seeds = KEYWORDS.filter((k) => k.priority === 1);
  let paaUpserted = 0;
  let paaErrors = 0;
  for (const k of seeds) {
    try {
      const questions = await googleRelatedQuestions({ q: k.text, onUsage: recorder });
      for (const q of questions) {
        const we_own = isOurDomain(q.source_link, DEFAULT_DOMAIN);
        const { data: existing } = await supabase
          .from('seo_paa_questions')
          .select('id')
          .eq('seed_keyword_id', k.id)
          .eq('question', q.question)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('seo_paa_questions')
            .update({
              snippet: q.snippet,
              source_title: q.source_title,
              source_link: q.source_link,
              we_own,
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('seo_paa_questions').insert({
            question: q.question,
            seed_keyword_id: k.id,
            seed_keyword_text: k.text,
            snippet: q.snippet,
            source_title: q.source_title,
            source_link: q.source_link,
            we_own,
          });
        }
        paaUpserted += 1;
      }
    } catch (err) {
      paaErrors += 1;
      console.warn('[cron.weekly] paa fetch failed', k.id, err instanceof Error ? err.message : err);
    }
  }
  summary.paa = { seeds: seeds.length, upserted: paaUpserted, errors: paaErrors };

  // 4. Autocomplete discovery — same seed prefixes the manual route
  //    uses. Cheap (1 unit per call).
  let acUpserted = 0;
  let acErrors = 0;
  const curatedSet = new Set(KEYWORDS.map((k) => k.text.toLowerCase()));
  for (const seed of SEED_PREFIXES) {
    try {
      const suggestions = await googleAutocomplete({ q: seed, onUsage: recorder });
      for (const s of suggestions) {
        const text = s.value.trim().toLowerCase();
        if (!text || curatedSet.has(text)) continue;
        const { data: existing } = await supabase
          .from('seo_keyword_discoveries')
          .select('id')
          .eq('suggestion', text)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('seo_keyword_discoveries')
            .update({ seed, relevance: s.relevance, last_seen_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('seo_keyword_discoveries').insert({
            suggestion: text,
            seed,
            relevance: s.relevance,
          });
        }
        acUpserted += 1;
      }
    } catch (err) {
      acErrors += 1;
      console.warn('[cron.weekly] autocomplete failed', seed, err instanceof Error ? err.message : err);
    }
  }
  summary.discover = { seeds: SEED_PREFIXES.length, upserted: acUpserted, errors: acErrors };

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    summary,
  });
}
