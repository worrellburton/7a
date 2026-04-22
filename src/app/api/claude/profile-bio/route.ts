import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/profile-bio — generates a short bio or favorite-quote
// suggestion for a Seven Arrows team member's public profile page.
//
// Body:
//   { kind: 'bio' | 'quote', fullName: string, jobTitle?: string,
//     existing?: string, favoriteSevenArrows?: string }
//
// Returns: { suggestion: string }
//
// The server holds ANTHROPIC_API_KEY; the browser only sends profile
// metadata. Uses Haiku by default — the generations are short.

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type Body = {
  kind?: 'bio' | 'quote';
  fullName?: string;
  jobTitle?: string | null;
  existing?: string | null;
  favoriteSevenArrows?: string | null;
};

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Body;
  const kind = body.kind;
  if (kind !== 'bio' && kind !== 'quote') {
    return NextResponse.json(
      { error: 'kind must be "bio" or "quote"' },
      { status: 400 },
    );
  }
  const fullName = (body.fullName || '').trim();
  if (!fullName) {
    return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
  }
  const jobTitle = (body.jobTitle || '').trim();
  const existing = (body.existing || '').trim();
  const favoriteSevenArrows = (body.favoriteSevenArrows || '').trim();

  const context = [
    `Organization: Seven Arrows Recovery — a boutique residential addiction-treatment ranch in Cochise County, Arizona. Trauma-informed, equine-assisted, holistic, and evidence-based.`,
    `Team member: ${fullName}`,
    jobTitle ? `Role: ${jobTitle}` : '',
    favoriteSevenArrows ? `What they love about Seven Arrows: ${favoriteSevenArrows}` : '',
    existing ? `Their existing draft to refine: ${existing}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt =
    kind === 'bio'
      ? `${context}

Write a warm, professional 2–3 sentence bio for this team member's public profile on the Seven Arrows website. First-person voice. Specific, not generic. No marketing fluff, no superlatives, no clichés like "passionate about helping others." Mention what they actually do day-to-day and what draws them to this work. Plain prose only — no markdown, no quotes around it.

Respond with ONLY the bio text. No prefix, no explanation.`
      : `${context}

Suggest a short, specific quote (1–2 sentences) this team member might pick as a favorite that fits a recovery ranch context. Could be a real quote from a known author, a piece of recovery wisdom, or a saying from a contemplative tradition. Keep it grounded — not Pinterest-y. Include the attribution if quoting someone (— Author Name).

Respond with ONLY the quote (and attribution if applicable). No prefix, no explanation.`;

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
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic API error (${res.status}): ${text}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const suggestion = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim()
      .replace(/^["']|["']$/g, '');

    return NextResponse.json({ suggestion });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
