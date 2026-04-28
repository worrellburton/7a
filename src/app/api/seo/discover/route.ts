import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS } from '@/lib/seo/keywords';
import {
  googleAutocomplete,
  hasSerpApi,
  readSerpApiUsage,
  SerpApiError,
  type SerpApiUsageRecorder,
} from '@/lib/serpapi';

// /api/seo/discover
//
// POST → run google_autocomplete on a curated set of seed prefixes
//        and upsert each suggestion into seo_keyword_discoveries.
//        The suggestions table is the team's keyword candidate
//        backlog; from there they decide whether to add to the
//        curated KEYWORDS list, watch, or ignore.
// GET  → list every discovery, ordered by status (new first) +
//        recency.
// PATCH /api/seo/discover/:id  → status / notes update (in
//                                [id]/route.ts).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Seed prefixes: an admissions-relevant set that consistently
// returns rich autocomplete fanouts. Keep this short — every seed
// is one SerpAPI call. The list spans location, modality,
// insurance, and substance entry-points so the discovery surface
// stays balanced across the curated category structure.
const SEED_PREFIXES: string[] = [
  // Location prefixes
  'rehab in arizona',
  'drug rehab phoenix',
  'addiction treatment scottsdale',
  'inpatient rehab tucson',
  // Modality prefixes
  'equine therapy rehab',
  'trauma informed addiction treatment',
  'holistic rehab arizona',
  'dual diagnosis treatment',
  // Insurance prefixes
  'rehabs that accept aetna',
  'rehabs that accept blue cross',
  'rehabs that take tricare',
  // Substance prefixes
  'alcohol rehab arizona',
  'opioid treatment arizona',
  'fentanyl rehab arizona',
  // Decision prefixes
  'how much does rehab cost',
  'how to choose a rehab',
];

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase
    .from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const, supabase, userId: user.id };
}

function makeUsageRecorder(supabase: SupabaseClient, userId: string): SerpApiUsageRecorder {
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

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  if (!hasSerpApi()) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 412 });

  let body: { seeds?: string[] } = {};
  try { body = (await req.json().catch(() => ({}))) as typeof body; } catch { /* ignore */ }
  const seeds = body.seeds && body.seeds.length > 0 ? body.seeds : SEED_PREFIXES;

  const pre = readSerpApiUsage();
  if (pre.count + seeds.length > pre.cap) {
    return NextResponse.json(
      { error: `SerpAPI daily cap would be exceeded — ${pre.count}/${pre.cap} used today, sweep needs ${seeds.length}.`, usage: pre },
      { status: 429 },
    );
  }

  const recorder = makeUsageRecorder(auth.supabase, auth.userId);
  // Curated set lookup so we can flag suggestions the team has
  // already curated in TS. Lowercased once outside the loop.
  const curatedSet = new Set(KEYWORDS.map((k) => k.text.toLowerCase()));

  let totalSuggestions = 0;
  let upserted = 0;
  let skippedCurated = 0;
  const errors: { seed: string; error: string }[] = [];

  for (const seed of seeds) {
    try {
      const suggestions = await googleAutocomplete({ q: seed, onUsage: recorder });
      totalSuggestions += suggestions.length;
      for (const s of suggestions) {
        const text = s.value.trim().toLowerCase();
        if (!text) continue;
        if (curatedSet.has(text)) {
          skippedCurated += 1;
          continue;
        }
        const { data: existing } = await auth.supabase
          .from('seo_keyword_discoveries')
          .select('id')
          .eq('suggestion', text)
          .maybeSingle();
        if (existing) {
          await auth.supabase
            .from('seo_keyword_discoveries')
            .update({
              seed,
              relevance: s.relevance,
              last_seen_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await auth.supabase.from('seo_keyword_discoveries').insert({
            suggestion: text,
            seed,
            relevance: s.relevance,
          });
        }
        upserted += 1;
      }
    } catch (err) {
      if (err instanceof SerpApiError && err.status === 429) {
        return NextResponse.json({ error: err.message, usage: readSerpApiUsage() }, { status: 429 });
      }
      errors.push({ seed, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    seedCount: seeds.length,
    totalSuggestions,
    upserted,
    skippedCurated,
    errors,
    usage: readSerpApiUsage(),
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { data, error } = await auth.supabase
    .from('seo_keyword_discoveries')
    .select('id, suggestion, seed, relevance, status, notes, first_seen_at, last_seen_at')
    .order('status', { ascending: true })
    .order('last_seen_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ discoveries: data ?? [] });
}
