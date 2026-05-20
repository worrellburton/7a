import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/email-campaigns/draft-text
//
// First-pass writer. Generates the *text* of the email (no HTML,
// no design) from the marketer's brief + toggles + featured blog
// + featured employee. The build flow shows this draft on the
// same page next to the image picker so the marketer can edit
// the words before Claude assembles the final HTML design.
//
// Returns:
//   { headline, body, ctaLabel, postscript }
//
// `body` is markdown-light plain prose (paragraphs separated by
// blank lines). The final build step renders it into a designed
// HTML email.

const DEFAULT_MODEL = 'claude-opus-4-7';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const SITE_URL = 'https://www.sevenarrowsrecoveryarizona.com/';

interface DraftBody {
  prompt?: unknown;
  useLogos?: unknown;
  linkToWebsite?: unknown;
  featuredBlogId?: unknown;
  featuredEmployeeId?: unknown;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as DraftBody;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 4000) : '';
  const linkToWebsite = !!body.linkToWebsite;
  const featuredBlogId = typeof body.featuredBlogId === 'string' ? body.featuredBlogId : null;
  const featuredEmployeeId = typeof body.featuredEmployeeId === 'string' ? body.featuredEmployeeId : null;

  const supabase = getAdminSupabase();
  const [blogRes, empRes] = await Promise.all([
    featuredBlogId
      ? supabase.from('blogs').select('title, slug, body_markdown').eq('id', featuredBlogId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredEmployeeId
      ? supabase.from('users').select('full_name, job_title, public_slug, bio').eq('id', featuredEmployeeId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const blog = (blogRes as { data: { title: string; slug: string | null; body_markdown?: string | null } | null }).data;
  const emp = (empRes as { data: { full_name: string; job_title: string | null; public_slug: string | null; bio?: string | null } | null }).data;
  const blogSummary = blog?.body_markdown ? blog.body_markdown.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 600) : '';

  const ctxLines: string[] = [];
  ctxLines.push(`AUTHOR BRIEF:\n${prompt || '(none, write a tasteful general update from the program)'}`);
  ctxLines.push(`LINK TO WEBSITE CTA: ${linkToWebsite ? `yes (goes to ${SITE_URL})` : 'no'}`);
  if (blog) ctxLines.push(`FEATURED BLOG:\n  title: ${blog.title}\n  url: ${blog.slug ? `${SITE_URL}who-we-are/blog/${blog.slug}` : '(no link)'}\n  summary: ${blogSummary}`);
  if (emp) ctxLines.push(`FEATURED EMPLOYEE:\n  name: ${emp.full_name}\n  title: ${emp.job_title ?? ''}\n  url: ${emp.public_slug ? `${SITE_URL}who-we-are/meet-our-team/${emp.public_slug}` : '(no link)'}\n  bio: ${emp.bio ?? ''}`);

  const systemPrompt = `You are the senior copy lead for Seven Arrows Recovery, a residential addiction-treatment ranch in Arizona using trauma-informed, equine-assisted, polyvagal-informed care.

Voice: warm, honest, hope-forward, never clinical, never sales-y, never alarmist. Concrete imagery (the ranch, the horses, the Sonoran desert) beats generic recovery language.

Write the TEXT of a marketing email. No HTML, no styling, no markdown beyond simple paragraph breaks. Return a JSON object with these keys:
  "headline": one-line hero headline (5 to 10 words, sentence case, no period)
  "body": the email body as plain prose. 2 to 4 paragraphs, blank line between paragraphs. 90 to 220 words total. If a blog or employee is featured, weave a natural reference into one of the paragraphs (do not just list them).
  "ctaLabel": the primary call to action button text (2 to 4 words, action verb, no period). If LINK TO WEBSITE CTA is "no", return an empty string.
  "postscript": optional P.S. line (one short sentence, no greater than 120 chars). May be empty.

STRICT WRITING RULES:
- NEVER use em-dashes (—) or en-dashes (–) in any field. Use a period, comma, semicolon, or colon. Rewrite sentences if needed.
- Do not use the HTML entities &mdash; or &ndash;.
- No emoji. No hashtags. No quote marks around the whole text.
- Do not say "Dear Friend" or "Hi there" or other generic salutations.
- Do not promise outcomes, do not make medical claims, do not mention insurance specifics.

Return ONLY the JSON object. No preamble, no markdown fences.`;

  const userContent = `Write the email text. Inputs:\n\n${ctxLines.join('\n\n')}`;

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
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();
    const parsed = parseJson(raw);
    if (!parsed) {
      return NextResponse.json({ error: 'Claude returned an unparseable response.', raw: raw.slice(0, 400) }, { status: 502 });
    }
    return NextResponse.json({
      headline: stripDashes(parsed.headline ?? ''),
      body: stripDashes(parsed.body ?? ''),
      ctaLabel: stripDashes(parsed.ctaLabel ?? ''),
      postscript: stripDashes(parsed.postscript ?? ''),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

function stripDashes(input: string): string {
  if (!input) return input;
  return input
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/&mdash;/gi, ', ')
    .replace(/&ndash;/gi, ', ')
    .replace(/&#8212;/g, ', ')
    .replace(/&#8211;/g, ', ')
    .replace(/, ,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',');
}

function parseJson(raw: string): { headline?: string; body?: string; ctaLabel?: string; postscript?: string } | null {
  const trimmed = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
  }
}
