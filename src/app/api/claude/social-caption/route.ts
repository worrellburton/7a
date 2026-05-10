import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';

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
  /** Optional: URLs the caption should be built around. If present we
   *  surface a quick filename/path summary so Claude can mention what
   *  the post is about (we don't fetch the bytes — the assistant
   *  reasons from the URL strings). */
  mediaUrls?: string[];
};

export async function POST(req: NextRequest) {
  // Match the auth pattern used by every other /api/social-media/*
  // route: cookie-based session check + super-admin gate. The Claude
  // /profile-bio endpoint uses a Bearer header instead, but that's
  // not what the social-media client surfaces send, hence the 401
  // when this endpoint copied that pattern.
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

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
  const mediaUrls = (body.mediaUrls || []).filter((u) => typeof u === 'string' && u.length > 0);

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

  // Surface filenames + a short URL hint when media is attached so
  // Claude can write captions that reference what the post is about
  // ("the trail at sunrise", "Wally's first day with us"), even
  // though we don't ship the image bytes themselves.
  const mediaContext = mediaUrls.length > 0
    ? `\n\nThe post is built around ${mediaUrls.length} attached piece${mediaUrls.length === 1 ? '' : 's'} of media. URL hints (filenames + path):\n${mediaUrls
        .map((u) => `  - ${u.split('/').slice(-2).join('/')}`)
        .join('\n')}\n\nWrite captions that *reference* what's in the media in a believable way — when the filename or path suggests a subject (a horse name, a place, a moment), call it out naturally. If the hints are ambiguous, lean on the topic above instead of guessing wildly.`
    : '';

  const prompt = `Organization: Seven Arrows Recovery — a boutique residential addiction-treatment ranch in Cochise County, Arizona. Trauma-informed, equine-assisted, holistic, evidence-based, JCAHO-accredited.

Topic for the post: ${topic}${mediaContext}

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
