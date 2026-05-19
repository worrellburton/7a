import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/social-caption/generate
//
// Drafts a social-media caption for Seven Arrows Recovery's voice
// based on the targeted networks + a hint of context. Plain
// Anthropic Messages API call — no JSON schema, just a single
// caption returned in plain text.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface GenerateBody {
  platforms?: unknown;
  hint?: unknown;
  mediaUrls?: unknown;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const platforms = Array.isArray(body.platforms)
    ? (body.platforms as unknown[]).filter((p): p is string => typeof p === 'string').slice(0, 11)
    : [];
  const hint = typeof body.hint === 'string' ? body.hint.trim().slice(0, 400) : '';
  const mediaCount = Array.isArray(body.mediaUrls) ? body.mediaUrls.length : 0;

  const prompt = `You are the social media voice for Seven Arrows Recovery, a residential addiction-treatment ranch in Arizona using trauma-informed, equine-assisted, polyvagal-informed care. Voice is warm, honest, hope-forward; no clinical jargon, no hashtag spam. Avoid emoji clichés but a single tasteful emoji is fine. Hashtags only if the platform list includes Instagram or TikTok, and cap at 5.

Punctuation: NEVER use em-dashes (—) or en-dashes (–). Substitute a comma, semicolon, parentheses, or a period. This is a strict rule.

Targeted networks: ${platforms.length > 0 ? platforms.join(', ') : '(not specified, write something cross-platform)'}
Media attached: ${mediaCount} ${mediaCount === 1 ? 'asset' : 'assets'}
${hint ? `Author hint: ${hint}` : ''}

Write a single caption appropriate for the targeted networks.
- LinkedIn-only / mostly-LinkedIn: professional, ~120-200 words, no hashtags.
- Instagram / TikTok in the mix: first line hooks before the "more" cut at 125 chars; 80-150 words total; up to 5 hashtags at the end.
- Facebook only: conversational, ~60-120 words.
- Cross-platform: middle ground, ~80-120 words, 0-3 hashtags.

Return ONLY the caption text. No quote marks, no markdown, no preamble.`;

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
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const caption = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();
    if (!caption) {
      return NextResponse.json({ error: 'Claude returned an empty caption.' }, { status: 502 });
    }
    return NextResponse.json({ caption });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
