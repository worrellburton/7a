import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/seo/actions/today-summary
//
// Returns:
//   {
//     day: 'YYYY-MM-DD',                  // Phoenix-local
//     count: number,                      // SEO actions logged today
//     summary: string | null,             // Claude-generated summary
//     generated_at: string | null,        // when the cached summary was written
//     stale: boolean                      // true while regenerating
//   }
//
// Powers the new "SEO Actions Taken Today" row on the home At-a-
// glance card. We cache the Claude output in
// seo_action_daily_summaries so the page doesn't burn a credit on
// every refresh; the cache rebuilds only when today's action_count
// has moved since the last write OR the cached row is older than
// 30 minutes (so brand-new descriptions get reflected within a
// reasonable window even if the count didn't change).
//
// Claude failures degrade to a count-only response so the UI still
// reads "3 SEO actions taken today" with no narrative below. Every
// fallback path is logged so the team knows when summaries are
// missing.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const STALE_AFTER_MS = 30 * 60 * 1000;

function phoenixToday(): string {
  // 'en-CA' returns YYYY-MM-DD which sorts + parses cleanly as a
  // SQL date. America/Phoenix has no DST so the boundary is
  // stable year-round.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

interface ActionRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  created_at: string;
  submitted_by_name: string | null;
}

async function callClaudeForSummary(actions: ActionRow[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[seo-actions-summary] ANTHROPIC_API_KEY not set — returning count only');
    return null;
  }

  const linesByPriority: Record<string, string[]> = { high: [], medium: [], low: [] };
  for (const a of actions) {
    const tier = (a.priority || 'medium').toLowerCase();
    const bucket = linesByPriority[tier] ?? linesByPriority.medium;
    const desc = (a.description || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    bucket.push(`- ${a.title}${desc ? ` — ${desc}` : ''}${a.submitted_by_name ? ` (by ${a.submitted_by_name})` : ''}`);
  }
  const formatted = (['high', 'medium', 'low'] as const)
    .map((tier) => {
      const lines = linesByPriority[tier];
      if (!lines || lines.length === 0) return '';
      return `${tier.toUpperCase()} priority:\n${lines.join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const prompt = `You are an SEO analyst summarizing the day's actions for the Seven Arrows Recovery team. Below are every SEO action logged today by the team. Each one is a real change someone made or a real piece of research they captured.

ACTIONS:
${formatted}

Write a 3-5 sentence summary of TODAY's actions for the team's home dashboard. Specifically:
- Lead with what was done (concrete: meta descriptions, redirects, listings claimed, etc.).
- Then tie those actions to SEO health — explain WHY each kind of action helps the site (rankings, crawl budget, citation authority, on-page signals, technical health, etc.).
- Be specific, not generic. If 3 of 5 actions were directory listings, name that and explain how it builds local citation authority.
- Speak in plain English, not jargon. The reader is the operator who picked these tasks up — they don't need an SEO 101.
- Don't repeat the bullet list. Synthesize it.
- Return ONLY the summary prose. No headings, no markdown, no bullets, no preamble. 3-5 sentences total.`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[seo-actions-summary] Claude HTTP ${res.status}: ${text.slice(0, 400)}`);
      return null;
    }
    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const block = json.content?.find((b) => b.type === 'text');
    return (block?.text ?? '').trim() || null;
  } catch (err) {
    console.error('[seo-actions-summary] Claude call threw:', err);
    return null;
  }
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const day = phoenixToday();

  // Phoenix-local day boundaries → UTC. Phoenix is UTC-7 year-round
  // (no DST), so day 0 = 07:00 UTC and day 24:00 = next day 07:00 UTC.
  const [yy, mo, dd] = day.split('-').map(Number);
  const startUtcMs = Date.UTC(yy, mo - 1, dd, 7, 0, 0, 0);
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  const startISO = new Date(startUtcMs).toISOString();
  const endISO = new Date(endUtcMs).toISOString();

  const { data: rows, error } = await admin
    .from('seo_actions')
    .select('id, title, description, category, priority, created_at, submitted_by_name')
    .gte('created_at', startISO)
    .lt('created_at', endISO)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const actions = (rows ?? []) as ActionRow[];
  const count = actions.length;

  // Look up the cached summary for today.
  const { data: cached } = await admin
    .from('seo_action_daily_summaries')
    .select('day, action_count, summary, generated_at, model')
    .eq('day', day)
    .maybeSingle();

  const cacheStillFresh = !!cached
    && cached.action_count === count
    && cached.summary
    && cached.generated_at
    && Date.now() - new Date(cached.generated_at).getTime() < STALE_AFTER_MS;

  if (cacheStillFresh) {
    return NextResponse.json({
      day,
      count,
      summary: cached.summary,
      generated_at: cached.generated_at,
      stale: false,
    });
  }

  // No fresh cache — regenerate. If there are zero actions today
  // we don't bother calling Claude; just write a placeholder so
  // tomorrow's first action triggers a regeneration cleanly.
  let summary: string | null = null;
  if (count > 0) {
    summary = await callClaudeForSummary(actions);
  }

  await admin
    .from('seo_action_daily_summaries')
    .upsert({
      day,
      action_count: count,
      summary,
      generated_at: new Date().toISOString(),
      model: MODEL,
    }, { onConflict: 'day' });

  return NextResponse.json({
    day,
    count,
    summary,
    generated_at: new Date().toISOString(),
    stale: false,
  });
}
