import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

// Per-video SEO pass: ask Claude to read the video's prompt + the
// thumbnail (when present) and return SEO metadata we persist on the
// site_videos row. Mirrors the SEO Images flow conceptually so the
// "SEO Video" button on /app/seo behaves like its image sibling.
//
// Request:  { videoId }
// Response: { video, model }

const CLAUDE_DEFAULT_MODEL = 'claude-opus-4-7';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';

interface SeoResult {
  alt: string;
  seo_title: string;
  seo_description: string;
}

function parseJson(text: string): SeoResult | null {
  try {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<SeoResult>;
    if (typeof parsed.alt !== 'string') return null;
    return {
      alt: parsed.alt.trim(),
      seo_title: (parsed.seo_title || '').trim(),
      seo_description: (parsed.seo_description || '').trim(),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured on the server — set it in Vercel env so the SEO pass can run.' },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { videoId?: string };
  if (!body.videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();
  const { data: row } = await supabase
    .from('site_videos')
    .select('*, source:source_image_id (alt, filename)')
    .eq('id', body.videoId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (row.status !== 'completed' || !row.video_url) {
    return NextResponse.json(
      { error: 'Video is not ready (status must be completed with a video_url)' },
      { status: 409 },
    );
  }

  const sourceAlt = (row as { source?: { alt?: string | null; filename?: string | null } }).source?.alt ?? null;
  const sourceFilename = (row as { source?: { alt?: string | null; filename?: string | null } }).source?.filename ?? null;

  const model = process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;

  const instruction = `You are reviewing a marketing video clip for Seven Arrows Recovery, a trauma-informed addiction-treatment program in Arizona that emphasizes equine therapy, indigenous practices, and a family system approach.

You only have the still thumbnail and contextual metadata — describe what is plausible from the prompt and image; do NOT hallucinate things you cannot verify.

Return a compact JSON object the team can paste into a CMS with these fields:
- "alt": a single plain sentence (≤ 140 characters) describing the clip for a screen reader. No "video of" / "clip of" prefix.
- "seo_title": ≤ 60 characters, suitable for <title> / og:title. Should be descriptive and mention Seven Arrows Recovery when natural.
- "seo_description": ≤ 160 characters, suitable for <meta name="description"> / og:description.

If the clip is unrelated to recovery/treatment, still describe it accurately — don't fabricate a clinical scene that isn't there.

Respond with ONLY the JSON object. No markdown, no backticks, no prose.`;

  const contextLines = [
    `Generation prompt: ${row.prompt || '(not set — likely a direct upload)'}`,
    `Model: ${row.model_endpoint || 'unknown'}`,
    `Duration: ${row.duration_seconds ? `${row.duration_seconds}s` : 'unknown'}`,
    `Resolution: ${row.resolution || 'unknown'}`,
    `Aspect: ${row.aspect_ratio || 'unknown'}`,
  ];
  if (sourceFilename) contextLines.push(`Source image filename: ${sourceFilename}`);
  if (sourceAlt) contextLines.push(`Source image alt: ${sourceAlt}`);

  type ClaudeContent = Array<
    | { type: 'image'; source: { type: 'url'; url: string } }
    | { type: 'text'; text: string }
  >;
  const userContent: ClaudeContent = [];
  if (row.thumbnail_url) {
    userContent.push({ type: 'image', source: { type: 'url', url: row.thumbnail_url } });
  }
  userContent.push({
    type: 'text',
    text: `${instruction}\n\nContext:\n${contextLines.join('\n')}`,
  });

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
        'You analyze marketing videos and return STRICT JSON with alt/seo_title/seo_description fields. Start your response with "{" and output nothing else.',
      messages: [{ role: 'user', content: userContent }],
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

  const alt = parsed.alt.slice(0, 140);
  const seoTitle = parsed.seo_title.slice(0, 60);
  const seoDescription = parsed.seo_description.slice(0, 160);

  const { data: updated, error: updErr } = await supabase
    .from('site_videos')
    .update({
      alt,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_processed_at: new Date().toISOString(),
    })
    .eq('id', body.videoId)
    .select()
    .single();
  if (updErr || !updated) {
    return NextResponse.json(
      { error: `site_videos update failed: ${updErr?.message || 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ video: updated, model });
}
