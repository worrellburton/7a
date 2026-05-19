import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';
import { EMDASH_BAN_RULE, stripDashes } from '@/lib/claude-style';

// POST /api/claude/social-caption/title
//
// Given a caption body, returns a 3-6 word headline for the Ready to
// Go card. Plain Anthropic Messages call, no schema, single line of
// text out. Em-dash ban applied via system prompt and stripDashes()
// post-pass.

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface Body { caption?: unknown }

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, 4000) : '';
  if (!caption) return NextResponse.json({ error: 'caption is required' }, { status: 400 });

  const prompt = `You are titling a social media post for Seven Arrows Recovery. Return a 3 to 6 word headline that captures the post in plain language. No quotes, no markdown, no trailing punctuation. Just the headline text.

${EMDASH_BAN_RULE}

Caption:
"""
${caption}
"""

Headline:`;

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
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    let title = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\.$/, '');
    title = stripDashes(title);
    if (!title) return NextResponse.json({ error: 'Claude returned an empty title.' }, { status: 502 });
    return NextResponse.json({ title });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
