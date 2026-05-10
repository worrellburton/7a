import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/social-caption — drafts three social-media caption
// variants for a topic, tone, and target platform set. Used by the
// /app/social-media Creative > AI panel.
//
// Body:
//   { topic: string, tone?: string, platforms?: string[],
//     length?: 'short' | 'medium' | 'long', includeHashtags?: boolean }
//
// Returns: { variants: string[] }
//
// The server holds ANTHROPIC_API_KEY; the browser only sends prompt
// metadata. Uses Haiku — captions are short and we want low latency.

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type Body = {
  topic?: string;
  tone?: string;
  platforms?: string[];
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
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
  const topic = (body.topic || '').trim();
  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }
  const tone = (body.tone || 'warm, grounded, trauma-informed').trim();
  const platforms = (body.platforms || []).filter(Boolean);
  const length = body.length === 'short' ? 'short' : body.length === 'long' ? 'long' : 'medium';
  const includeHashtags = body.includeHashtags !== false;

  const lengthGuidance =
    length === 'short'
      ? 'Keep each variant under 200 characters — fits Twitter/X.'
      : length === 'long'
        ? 'Each variant 300–600 characters — fits Facebook, Instagram, LinkedIn.'
        : 'Each variant 150–280 characters — comfortable across all platforms.';

  const platformGuidance =
    platforms.length > 0
      ? `Optimise the voice for these platforms: ${platforms.join(', ')}.`
      : 'Voice should work across Facebook, Instagram, LinkedIn, and TikTok captions.';

  const hashtagGuidance = includeHashtags
    ? 'End each variant with 2–4 relevant hashtags (e.g. #SevenArrowsRecovery, #Recovery, #TraumaInformed). Keep them grounded — no spammy stack.'
    : 'No hashtags.';

  const prompt = `Organization: Seven Arrows Recovery — a boutique residential addiction-treatment ranch in Cochise County, Arizona. Trauma-informed, equine-assisted, holistic, evidence-based, JCAHO-accredited.

Topic for the post: ${topic}

Tone: ${tone}.
${platformGuidance}
${lengthGuidance}
${hashtagGuidance}

Draft three distinct caption variants. Each variant is plain prose — no markdown, no headings, no quotes around it. Avoid superlatives, recovery-influencer clichés ("you got this!"), and AI-isms. Each variant should sound like a real human at a small treatment center wrote it.

Return ONLY the three variants, separated by a line containing exactly ---. No preamble, no numbering, no commentary.`;

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
        max_tokens: 1200,
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
    const raw = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();

    const variants = raw
      .split(/^\s*---\s*$/m)
      .map((v) => v.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);

    return NextResponse.json({ variants });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
