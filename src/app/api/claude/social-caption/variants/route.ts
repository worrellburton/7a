import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/social-caption/variants
//
// Like /generate, but returns SEVERAL distinct caption options plus a set
// of suggested hashtags, so the marketer can pick a direction and drop in
// tags rather than regenerating one caption at a time.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-8)

const DEFAULT_MODEL = 'claude-opus-4-8';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface VariantsBody {
  platforms?: unknown;
  hint?: unknown;
  mediaUrls?: unknown;
}

function parseJsonLoose(raw: string): { variants?: unknown; hashtags?: unknown } | null {
  // Strip code fences and grab the outermost JSON object.
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as VariantsBody;
  const platforms = Array.isArray(body.platforms)
    ? (body.platforms as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 11)
    : [];
  const hint = typeof body.hint === 'string' ? body.hint.trim().slice(0, 400) : '';
  const mediaCount = Array.isArray(body.mediaUrls) ? body.mediaUrls.length : 0;

  const prompt = `You are the social media voice for Seven Arrows Recovery — a residential addiction-treatment ranch in Arizona using trauma-informed, equine-assisted, polyvagal-informed care. Voice is warm, honest, hope-forward; no clinical jargon, no hashtag spam.

Targeted networks: ${platforms.length > 0 ? platforms.join(', ') : '(cross-platform)'}
Media attached: ${mediaCount} ${mediaCount === 1 ? 'asset' : 'assets'}
${hint ? `Author hint: ${hint}` : ''}

Produce THREE distinct caption options that take different angles (e.g. one story-led, one direct/value-led, one reflective), each appropriate for the targeted networks. Then suggest up to 8 relevant hashtags (no leading # — just the words), tasteful and on-brand, only if Instagram or TikTok is among the networks (otherwise return an empty hashtags array).

Return ONLY valid JSON in exactly this shape, no markdown:
{"variants": ["caption one", "caption two", "caption three"], "hashtags": ["recovery", "healing"]}`;

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();
    const parsed = parseJsonLoose(text);
    const variants = Array.isArray(parsed?.variants)
      ? (parsed!.variants as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, 3)
      : [];
    const hashtags = Array.isArray(parsed?.hashtags)
      ? (parsed!.hashtags as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((h) => h.replace(/^#/, '').trim()).slice(0, 8)
      : [];
    if (variants.length === 0) {
      return NextResponse.json({ error: 'Claude returned no usable variants.' }, { status: 502 });
    }
    return NextResponse.json({ variants, hashtags });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
