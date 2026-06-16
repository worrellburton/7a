import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { EPISODES, episodeHref } from '@/lib/episodes';
import { findSitePage } from '@/lib/site-pages';

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

const DEFAULT_MODEL = 'claude-opus-4-8';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const SITE_URL = 'https://www.sevenarrowsrecoveryarizona.com/';

// Adaptive thinking lets the model reason before writing — allow
// for the longer turn.
export const maxDuration = 300;

interface DraftBody {
  prompt?: unknown;
  useLogos?: unknown;
  linkToWebsite?: unknown;
  includePhone?: unknown;
  includeQuote?: unknown;
  featuredBlogId?: unknown;
  featuredEpisodeSlug?: unknown;
  featuredPagePath?: unknown;
  featuredEmployeeId?: unknown;
  featuredEquineId?: unknown;
}

const ADMISSIONS_PHONE = '(866) 718-1665';

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
  const includePhone = !!body.includePhone;
  const includeQuote = !!body.includeQuote;
  const featuredBlogId = typeof body.featuredBlogId === 'string' ? body.featuredBlogId : null;
  const featuredEpisodeSlug = typeof body.featuredEpisodeSlug === 'string' ? body.featuredEpisodeSlug : null;
  const featuredPagePath = typeof body.featuredPagePath === 'string' ? body.featuredPagePath : null;
  const featuredEmployeeId = typeof body.featuredEmployeeId === 'string' ? body.featuredEmployeeId : null;
  const featuredEquineId = typeof body.featuredEquineId === 'string' ? body.featuredEquineId : null;

  const supabase = getAdminSupabase();
  const [blogRes, empRes, horseRes] = await Promise.all([
    featuredBlogId
      ? supabase.from('blogs').select('title, slug, body_markdown').eq('id', featuredBlogId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredEmployeeId
      ? supabase.from('users').select('full_name, job_title, public_slug, bio').eq('id', featuredEmployeeId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredEquineId
      ? supabase.from('equine').select('name, works_in, notes').eq('id', featuredEquineId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const blog = (blogRes as { data: { title: string; slug: string | null; body_markdown?: string | null } | null }).data;
  const emp = (empRes as { data: { full_name: string; job_title: string | null; public_slug: string | null; bio?: string | null } | null }).data;
  const horse = (horseRes as { data: { name: string; works_in: string | null; notes: string | null } | null }).data;
  const blogSummary = blog?.body_markdown ? blog.body_markdown.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 600) : '';
  const horseNotes = horse?.notes ? horse.notes.replace(/\s+/g, ' ').trim().slice(0, 400) : '';

  const ctxLines: string[] = [];
  ctxLines.push(`AUTHOR BRIEF:\n${prompt || '(none, write a tasteful general update from the program)'}`);
  ctxLines.push(`LINK TO WEBSITE CTA: ${linkToWebsite ? `yes (goes to ${SITE_URL})` : 'no'}`);
  ctxLines.push(`INCLUDE PHONE NUMBER: ${includePhone ? `yes — ${ADMISSIONS_PHONE} (mention it once, naturally, in the body or postscript)` : 'no'}`);
  ctxLines.push(`INCLUDE QUOTE: ${includeQuote ? 'yes — a real Google review will be inserted as a separate pull-quote block between the body and the CTA at render time. Do NOT write a quote yourself, do not add quotation marks, and do not paraphrase a review in the body copy.' : 'no'}`);
  if (blog) {
    ctxLines.push(`FEATURED BLOG:\n  title: ${blog.title}\n  url: ${blog.slug ? `${SITE_URL}who-we-are/blog/${blog.slug}` : '(no link)'}\n  summary: ${blogSummary}`);
  } else if (featuredEpisodeSlug) {
    const ep = EPISODES.find((e) => e.slug === featuredEpisodeSlug);
    if (ep) {
      const href = episodeHref(ep.slug);
      const url = href.startsWith('http') ? href : `${SITE_URL.replace(/\/$/, '')}${href}`;
      ctxLines.push(`FEATURED BLOG (Recovery Roadmap, Episode ${ep.number}):\n  title: ${ep.title}\n  url: ${url}\n  summary: ${ep.blurb}`);
    }
  }
  const featuredPage = findSitePage(featuredPagePath);
  if (featuredPage) {
    const url = `${SITE_URL.replace(/\/$/, '')}${featuredPage.path}`;
    ctxLines.push(`FEATURED PAGE (a secondary inner-site destination the email should sign-post toward; weave a short "if you want to learn more about ${featuredPage.title.toLowerCase()}, …" line into the body or postscript — do NOT make this the primary CTA):\n  title: ${featuredPage.title}\n  url: ${url}\n  description: ${featuredPage.blurb}`);
  }
  if (emp) ctxLines.push(`FEATURED EMPLOYEE:\n  name: ${emp.full_name}\n  title: ${emp.job_title ?? ''}\n  url: ${emp.public_slug ? `${SITE_URL}who-we-are/meet-our-team/${emp.public_slug}` : '(no link)'}\n  bio: ${emp.bio ?? ''}`);
  if (horse) ctxLines.push(`FEATURED HORSE (work the horse's name + role into one paragraph; never reduce to mascot status):\n  name: ${horse.name}\n  works in: ${horse.works_in ?? ''}\n  notes: ${horseNotes}`);

  const systemPrompt = `Take the AUTHOR BRIEF below and generate an email campaign about exactly that idea, on behalf of Seven Arrows Recovery (a residential addiction-treatment ranch in Arizona).

The AUTHOR BRIEF is the catalyst. Whatever the marketer typed is the subject of the email, full stop. If the brief says "we are doing a community pancake breakfast Saturday at 9", the email is about a community pancake breakfast Saturday at 9. If the brief says "Seven Arrows is making ice cream", the email is about Seven Arrows making ice cream. Do not redirect to a generic update about treatment, do not insert recovery talking points the brief didn't ask for, do not soften the topic into something else. Stay on the marketer's idea.

Voice can be warm, honest, hope-forward, but tone follows the topic: a playful brief gets a playful email, a serious brief gets a serious email. Avoid clinical jargon and avoid recovery-industry clichés unless the brief explicitly calls for them.

Write the TEXT of the email. No HTML, no styling, no markdown beyond simple paragraph breaks. Return a JSON object with these keys:
  "headline": one-line hero headline (5 to 10 words, sentence case, no period). The headline must reflect the brief's actual subject; if the brief is about ice cream, the headline is about ice cream.
  "body": the email body as plain prose. 2 to 4 paragraphs, blank line between paragraphs. 90 to 220 words total. Every paragraph is about the brief's subject. If a featured blog / employee / horse is supplied AND it fits naturally with the brief, weave in one short reference; if it doesn't fit, skip it rather than forcing it.
  "ctaLabel": the primary call to action button text (2 to 4 words, action verb, no period). The CTA should match the brief's call to action. If LINK TO WEBSITE CTA is "no", return an empty string.
  "postscript": optional P.S. line (one short sentence, no greater than 120 chars). May be empty.

STRICT WRITING RULES:
- NEVER use em-dashes (—) or en-dashes (–) in any field. Use a period, comma, semicolon, or colon. Rewrite sentences if needed.
- Do not use the HTML entities &mdash; or &ndash;.
- No emoji. No hashtags. No quote marks around the whole text.
- Do not say "Dear Friend" or "Hi there" or other generic salutations.
- Do not promise outcomes, do not make medical claims, do not mention insurance specifics unless the brief is explicitly about insurance.
- Sign off references to the program as "Seven Arrows" or "the team", never "us at the ranch" / "your friends in recovery" filler.

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
        // 4096 — headroom for the four-field copy draft plus the
        // adaptive-thinking tokens that share the output budget.
        max_tokens: 4096,
        system: systemPrompt,
        // Opus 4.8 supports adaptive thinking only — a little reasoning
        // sharpens the copy. 'medium' effort is plenty for a four-field
        // draft and keeps latency sane.
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }>; stop_reason?: string };
    if (data.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'The model declined this request. Rephrase the campaign prompt and try again.' },
        { status: 502 },
      );
    }
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
