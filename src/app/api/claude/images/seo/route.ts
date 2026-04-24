import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// Single-image SEO pass: ask Claude Opus 4.7 (via vision) to look at
// the image and return SEO-friendly metadata that we can write back to
// site_images. The client handles the actual rename + recompress (WebP
// at 1600px max edge, ≤350 KB target) so the server stays stateless
// and quick.
//
// Request:  { imageUrl, currentFilename?, currentAlt? }
// Response: { filename, alt, seo_title, seo_description }
//   filename is a kebab-case stem (no extension), ≤ 60 chars
//   alt is a single sentence describing the image for a screen reader
//   seo_title is ≤ 60 chars for <title> / OG
//   seo_description is ≤ 160 chars for <meta description> / OG

const CLAUDE_DEFAULT_MODEL = 'claude-opus-4-7';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

interface KaizenResult {
  filename: string;
  alt: string;
  seo_title: string;
  seo_description: string;
}

function parseJson(text: string): KaizenResult | null {
  try {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<KaizenResult>;
    if (typeof parsed.filename !== 'string' || typeof parsed.alt !== 'string') return null;
    return {
      filename: parsed.filename.trim(),
      alt: parsed.alt.trim(),
      seo_title: (parsed.seo_title || '').trim(),
      seo_description: (parsed.seo_description || '').trim(),
    };
  } catch {
    return null;
  }
}

function sanitizeFilename(stem: string): string {
  return (
    stem
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured on the server — set it in the Vercel project env so the SEO pass can analyze images.' },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    imageUrl?: string;
    currentFilename?: string;
    currentAlt?: string;
  };
  if (!body.imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const model = process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;

  const instruction = `You are reviewing a single marketing photo for Seven Arrows Recovery, a trauma-informed addiction-treatment program in Arizona that emphasizes equine therapy, indigenous practices, and a family system approach.

Return a compact JSON object the team can paste into a CMS with these fields:
- "filename": a kebab-case filename STEM (no extension), ≤ 60 characters, descriptive of what's actually in the image, safe for URLs. Prefer concrete nouns over brand words. Example: "equine-therapy-horse-and-client" or "clinical-family-session-living-room".
- "alt": a single plain sentence (≤ 140 characters) describing the image for a screen reader. No "image of" / "photo of" prefix.
- "seo_title": ≤ 60 characters, suitable for <title>. Should be descriptive and mention Seven Arrows Recovery when natural.
- "seo_description": ≤ 160 characters, suitable for <meta name="description"> or OG description.

If the image is unrelated to recovery/treatment (e.g. random clipart), still describe it accurately — don't hallucinate a clinical scene that isn't there.

Respond with ONLY the JSON object. No markdown, no backticks, no prose.`;

  const claudeRes = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system:
        'You analyze marketing photos and return STRICT JSON with filename/alt/seo_title/seo_description fields. Start your response with "{" and output nothing else.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: body.imageUrl } },
            {
              type: 'text',
              text: `${instruction}\n\nCurrent filename: ${body.currentFilename || '(unset)'}\nCurrent alt: ${body.currentAlt || '(unset)'}`,
            },
          ],
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const text = await claudeRes.text();
    return NextResponse.json(
      { error: `Claude ${claudeRes.status}: ${text.slice(0, 400)}` },
      { status: 502 },
    );
  }

  const data = (await claudeRes.json()) as { content?: Array<{ type?: string; text?: string }> };
  const parts = Array.isArray(data.content) ? data.content : [];
  const raw = parts
    .filter((p) => p?.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('');
  const parsed = parseJson(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: `Claude returned unparseable response: ${raw.slice(0, 400)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    filename: sanitizeFilename(parsed.filename),
    alt: parsed.alt.slice(0, 140),
    seo_title: parsed.seo_title.slice(0, 60),
    seo_description: parsed.seo_description.slice(0, 160),
    model,
  });
}
