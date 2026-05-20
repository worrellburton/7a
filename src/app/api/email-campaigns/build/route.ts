import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/email-campaigns/build
//
// Phase 4 — turn the marketer's authoring inputs (paragraph,
// images, toggles, featured blog / employee) into a single
// HTML email + draft subject line via Claude. The same endpoint
// is also used for iteration (Phase 5): when previousHtml +
// iterationNote are present, we ask Claude to revise the
// existing HTML according to the note instead of starting over.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const LOGO_URL =
  'https://www.sevenarrowsrecoveryarizona.com/seven-arrows-recovery-logo.png';
const SITE_URL = 'https://www.sevenarrowsrecoveryarizona.com/';

interface BuildBody {
  prompt?: unknown;
  imageUrls?: unknown;
  useLogos?: unknown;
  linkToWebsite?: unknown;
  featuredBlogId?: unknown;
  featuredEmployeeId?: unknown;
  previousHtml?: unknown;
  iterationNote?: unknown;
}

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

  const body = (await req.json().catch(() => ({}))) as BuildBody;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 4000) : '';
  const imageUrls = Array.isArray(body.imageUrls)
    ? (body.imageUrls as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 12)
    : [];
  const useLogos = !!body.useLogos;
  const linkToWebsite = !!body.linkToWebsite;
  const featuredBlogId = typeof body.featuredBlogId === 'string' ? body.featuredBlogId : null;
  const featuredEmployeeId = typeof body.featuredEmployeeId === 'string' ? body.featuredEmployeeId : null;
  const previousHtml = typeof body.previousHtml === 'string' ? body.previousHtml : null;
  const iterationNote = typeof body.iterationNote === 'string' ? body.iterationNote.trim().slice(0, 1500) : null;

  // Pull the live blog + employee rows so Claude has the actual
  // copy + URLs to reference (instead of placeholders).
  const supabase = getAdminSupabase();
  const [blogRes, empRes] = await Promise.all([
    featuredBlogId
      ? supabase.from('blogs').select('id, title, slug, body_markdown').eq('id', featuredBlogId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredEmployeeId
      ? supabase.from('users').select('id, full_name, job_title, avatar_url, public_slug, bio').eq('id', featuredEmployeeId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const blog = (blogRes as { data: { title: string; slug: string | null; body_markdown?: string | null } | null }).data;
  const emp = (empRes as { data: { full_name: string; job_title: string | null; avatar_url: string | null; public_slug: string | null; bio?: string | null } | null }).data;
  const blogSummary = blog?.body_markdown ? blog.body_markdown.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';

  const blogUrl = blog?.slug ? `${SITE_URL}who-we-are/blog/${blog.slug}` : null;
  const empUrl = emp?.public_slug ? `${SITE_URL}who-we-are/meet-our-team/${emp.public_slug}` : null;

  // Construct the prompt. For iterations, we feed Claude the
  // previous HTML and the new note — it returns a revised
  // version that respects the note.
  const systemPrompt = `You are a senior email designer for Seven Arrows Recovery — a residential addiction-treatment ranch in Arizona using trauma-informed, equine-assisted, polyvagal-informed care. Voice is warm, honest, hope-forward; no clinical jargon, no hashtag spam, no emoji clichés.

Return a single JSON object with two keys:
  "subject": a short, plain-text subject line (≤ 80 chars, no quotes, no emoji)
  "html": a complete inline-styled email-friendly HTML document (start with <!doctype html>, end with </html>). Use only inline styles (no <style> blocks, no external CSS, no <script>). Use table-based layout for max-width 600px content. Background color outside the content card should be #faf6f1. Body font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif. Accent color: #b87333 (warm copper). Body text color: #2c1810. Links should be #b87333 with underline.

The document must:
- Be valid for Gmail / Outlook / Apple Mail (avoid CSS that doesn't render in email clients).
- Include alt text on every image.
- Never reference images that weren't supplied — only use the URLs in the IMAGES list.
- Never reference a blog or employee that wasn't supplied.
- Avoid lorem ipsum or placeholder text; if information is missing, write around it.

Return ONLY the JSON object — no preamble, no markdown fences.`;

  const ctxLines: string[] = [];
  ctxLines.push(`AUTHOR PROMPT:\n${prompt || '(none — write a tasteful general update)'}`);
  ctxLines.push(`USE LOGOS: ${useLogos ? 'yes' : 'no'}`);
  if (useLogos) ctxLines.push(`LOGO URL: ${LOGO_URL}`);
  ctxLines.push(`LINK TO WEBSITE: ${linkToWebsite ? 'yes' : 'no'}`);
  if (linkToWebsite) ctxLines.push(`PRIMARY CTA URL: ${SITE_URL}`);
  ctxLines.push(`IMAGES (${imageUrls.length}):\n${imageUrls.length === 0 ? '(none)' : imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`);
  if (blog) {
    ctxLines.push(
      `FEATURED BLOG:\n  title: ${blog.title}\n  url: ${blogUrl ?? '(no public slug yet — describe in text only, no link)'}\n  summary: ${blogSummary}`,
    );
  }
  if (emp) {
    ctxLines.push(
      `FEATURED EMPLOYEE:\n  name: ${emp.full_name}\n  title: ${emp.job_title ?? ''}\n  url: ${empUrl ?? '(no public slug — describe by name only, no link)'}\n  avatar: ${emp.avatar_url ?? ''}\n  bio: ${emp.bio ?? ''}`,
    );
  }

  const userContent = previousHtml && iterationNote
    ? `Revise the following email per the iteration note. Keep the same structure but apply the note. Return JSON with the updated subject + html.

ITERATION NOTE:
${iterationNote}

CONTEXT:
${ctxLines.join('\n\n')}

PREVIOUS HTML:
${previousHtml}`
    : `Build a marketing email for Seven Arrows Recovery from the inputs below. Return JSON with subject + html.

${ctxLines.join('\n\n')}`;

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
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic API error (${res.status}): ${text}` },
        { status: res.status },
      );
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();

    const parsed = parseClaudeJson(raw);
    if (!parsed?.html) {
      return NextResponse.json(
        { error: 'Claude returned an unparseable response.', raw: raw.slice(0, 400) },
        { status: 502 },
      );
    }
    return NextResponse.json({ subject: parsed.subject ?? '', html: parsed.html });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Claude usually returns clean JSON when asked to, but sometimes
// wraps in ```json fences or prepends a sentence. Strip both, then
// JSON.parse — falling back to a brace-balanced substring as a
// last resort.
function parseClaudeJson(raw: string): { subject?: string; html?: string } | null {
  const trimmed = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(trimmed) as { subject?: string; html?: string };
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as { subject?: string; html?: string };
    } catch {
      return null;
    }
  }
}
