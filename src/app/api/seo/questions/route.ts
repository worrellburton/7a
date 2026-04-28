import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { KEYWORDS, type Keyword } from '@/lib/seo/keywords';
import {
  googleRelatedQuestions,
  hasSerpApi,
  readSerpApiUsage,
  SerpApiError,
  type SerpApiUsageRecorder,
} from '@/lib/serpapi';

// /api/seo/questions
//
// POST → mine related_questions for every priority-1 keyword in the
//        curated set, upsert into seo_paa_questions. One SerpAPI
//        call per keyword.
// GET  → list every question persisted in the last 60 days, ordered
//        active-first.
// PATCH /api/seo/questions/:id  → live in [id]/route.ts

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';

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

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  if (!hasSerpApi()) return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 412 });

  let body: { keywordIds?: string[]; domain?: string } = {};
  try { body = (await req.json().catch(() => ({}))) as typeof body; } catch { /* ignore */ }
  const domain = (body.domain ?? DEFAULT_DOMAIN).trim();
  // Default to the curated priority-1 set — that's where PAA mining
  // pays off most. Body can override for ad-hoc sweeps.
  const seeds: Keyword[] = body.keywordIds
    ? KEYWORDS.filter((k) => body.keywordIds!.includes(k.id))
    : KEYWORDS.filter((k) => k.priority === 1);

  if (seeds.length === 0) {
    return NextResponse.json({ error: 'No seed keywords' }, { status: 400 });
  }

  const pre = readSerpApiUsage();
  if (pre.count + seeds.length > pre.cap) {
    return NextResponse.json(
      { error: `SerpAPI daily cap would be exceeded — ${pre.count}/${pre.cap} used today, mine needs ${seeds.length}.`, usage: pre },
      { status: 429 },
    );
  }

  const recorder = makeUsageRecorder(auth.supabase, auth.userId);
  const startedAt = Date.now();

  let mined = 0;
  let upserted = 0;
  const errors: { seed: string; error: string }[] = [];

  for (const k of seeds) {
    try {
      const questions = await googleRelatedQuestions({ q: k.text, onUsage: recorder });
      mined += questions.length;
      for (const q of questions) {
        const we_own = isOurDomain(q.source_link, domain);
        const { error } = await auth.supabase
          .from('seo_paa_questions')
          .upsert(
            {
              question: q.question,
              seed_keyword_id: k.id,
              seed_keyword_text: k.text,
              snippet: q.snippet,
              source_title: q.source_title,
              source_link: q.source_link,
              we_own,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'md5(question), coalesce(seed_keyword_id, \'__null__\')' as never },
          );
        // The unique index on md5(question) + seed isn't named so
        // PostgREST upsert can't reference it via onConflict alone.
        // Fall back to a manual select + insert/update pattern.
        if (error) {
          // Manual upsert: try select by question + seed, then
          // insert new or update existing.
          const { data: existing } = await auth.supabase
            .from('seo_paa_questions')
            .select('id')
            .eq('seed_keyword_id', k.id)
            .eq('question', q.question)
            .maybeSingle();
          if (existing) {
            await auth.supabase
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
            await auth.supabase.from('seo_paa_questions').insert({
              question: q.question,
              seed_keyword_id: k.id,
              seed_keyword_text: k.text,
              snippet: q.snippet,
              source_title: q.source_title,
              source_link: q.source_link,
              we_own,
            });
          }
        }
        upserted += 1;
      }
    } catch (err) {
      if (err instanceof SerpApiError && err.status === 429) {
        return NextResponse.json({ error: err.message, usage: readSerpApiUsage() }, { status: 429 });
      }
      errors.push({ seed: k.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    ranAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    seedCount: seeds.length,
    mined,
    upserted,
    errors,
    usage: readSerpApiUsage(),
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await auth.supabase
    .from('seo_paa_questions')
    .select('id, question, seed_keyword_id, seed_keyword_text, snippet, source_title, source_link, we_own, status, notes, first_seen_at, last_seen_at')
    .gte('last_seen_at', since)
    .order('status', { ascending: true })
    .order('we_own', { ascending: true })
    .order('last_seen_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ questions: data ?? [] });
}
