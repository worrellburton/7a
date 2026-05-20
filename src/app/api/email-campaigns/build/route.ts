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
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-7)

const DEFAULT_MODEL = 'claude-opus-4-7';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// Vertical, no-background / transparent variant so it reads on any
// header treatment Claude picks (dark band, off-white card, etc.).
// The marketing-site PNG isn't reachable from email clients (404'd
// in early sends), so we use the public Supabase storage URL.
const LOGO_URL =
  'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1779282102496-nynu1csup5e-05_seven_arrow_recovery_logo_vertical_no-background_transpar.png';
// Fallback horizontal variant — passed to Claude as a second option
// so it can pick whichever fits the header it's drawing.
const LOGO_URL_ALT =
  'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1779282102497-vaji6wistvd-seven-arrows-recovery-logo-1-.png';
const SITE_URL = 'https://www.sevenarrowsrecoveryarizona.com/';

interface BuildBody {
  prompt?: unknown;
  imageUrls?: unknown;
  useLogos?: unknown;
  linkToWebsite?: unknown;
  includePhone?: unknown;
  featuredBlogId?: unknown;
  featuredEmployeeId?: unknown;
  featuredEquineId?: unknown;
  previousHtml?: unknown;
  iterationNote?: unknown;
  // Optional pre-drafted text payload from /api/email-campaigns/
  // draft-text. When present we skip re-drafting the copy and
  // focus entirely on the visual design.
  draftText?: unknown;
}

const ADMISSIONS_PHONE = '(866) 718-1665';

interface DraftTextPayload {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  postscript?: string;
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
  const includePhone = !!body.includePhone;
  const featuredBlogId = typeof body.featuredBlogId === 'string' ? body.featuredBlogId : null;
  const featuredEmployeeId = typeof body.featuredEmployeeId === 'string' ? body.featuredEmployeeId : null;
  const featuredEquineId = typeof body.featuredEquineId === 'string' ? body.featuredEquineId : null;
  const previousHtml = typeof body.previousHtml === 'string' ? body.previousHtml : null;
  const iterationNote = typeof body.iterationNote === 'string' ? body.iterationNote.trim().slice(0, 1500) : null;
  const draftText = (body.draftText && typeof body.draftText === 'object')
    ? body.draftText as DraftTextPayload
    : null;

  // Pull the live blog + employee rows so Claude has the actual
  // copy + URLs to reference (instead of placeholders). For the
  // featured blog we also fetch its image set so the email card
  // visually pulls from the blog's own art instead of the
  // marketer's general library.
  const supabase = getAdminSupabase();
  const [blogRes, empRes, blogImagesRes, horseRes] = await Promise.all([
    featuredBlogId
      ? supabase.from('blogs').select('id, title, slug, body_markdown').eq('id', featuredBlogId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredEmployeeId
      ? supabase.from('users').select('id, full_name, job_title, avatar_url, public_slug, bio').eq('id', featuredEmployeeId).maybeSingle()
      : Promise.resolve({ data: null }),
    featuredBlogId
      ? supabase.from('blog_images').select('url, alt, position').eq('blog_id', featuredBlogId).order('position', { ascending: true })
      : Promise.resolve({ data: [] }),
    featuredEquineId
      ? supabase.from('equine').select('id, name, image_url, works_in, notes, gallery_urls').eq('id', featuredEquineId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const blog = (blogRes as { data: { title: string; slug: string | null; body_markdown?: string | null } | null }).data;
  const emp = (empRes as { data: { full_name: string; job_title: string | null; avatar_url: string | null; public_slug: string | null; bio?: string | null } | null }).data;
  const blogImages = ((blogImagesRes as { data: Array<{ url: string; alt: string | null; position: number }> | null }).data ?? []);
  const horse = (horseRes as { data: { name: string; image_url: string | null; works_in: string | null; notes: string | null; gallery_urls: string[] | null } | null }).data;
  const blogSummary = blog?.body_markdown ? blog.body_markdown.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';
  const horseNotes = horse?.notes ? horse.notes.replace(/\s+/g, ' ').trim().slice(0, 400) : '';

  const blogUrl = blog?.slug ? `${SITE_URL}who-we-are/blog/${blog.slug}` : null;
  const empUrl = emp?.public_slug ? `${SITE_URL}who-we-are/meet-our-team/${emp.public_slug}` : null;

  // A small per-build seed nudges Claude toward visual variety:
  // two builds with the same inputs should not feel identical.
  const designSeed = Math.floor(Math.random() * 1_000_000);

  // 10-pillar 2050 email design brief. The system prompt is
  // intentionally long: this is the difference between a generic
  // marketing email and one that feels like it came out of a
  // boutique design studio. Claude Opus 4.7 is treated as the
  // designer of record. Every build re-rolls a designSeed so the
  // same brief yields different visual treatments across rebuilds.
  const systemPrompt = `You are the senior brand + email designer for Seven Arrows Recovery, a residential addiction-treatment ranch in Arizona using trauma-informed, equine-assisted, polyvagal-informed care. You are designing in the year 2050: editorial, premium, restrained, with the soul of a hand-printed letter and the polish of a luxury hospitality brand. Your output renders inside Gmail, Apple Mail, and Outlook, so every visual choice must survive those clients without falling back to a generic newsletter look.

You always think in TEN DESIGN PILLARS before composing the HTML. Apply all of them.

PILLAR 1 — COMPOSITION
Pick a deliberate composition for this build (don't repeat the last). Choose from: full-bleed editorial hero, asymmetric two-column with vertical rule, bento-card stack, magazine-style cover with overlapping rule lines, off-center hero with a thin sidebar caption, or quiet centered manifesto. Whichever you pick, anchor it with strong negative space; never crowd. The whole layout sits in a single 600px-wide table.

PILLAR 2 — TYPE SYSTEM
- Display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif (used via @import-safe inline font-family with Georgia fallback so it survives email clients).
- Body: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif.
- Eyebrow / overline / caption: same body stack, uppercase, letter-spacing 0.22em, weight 700, size 10.5px-11.5px.
- Hero headline: 32px-44px display serif, line-height 1.05, letter-spacing -0.01em, weight 500 or 600.
- Subhead: 18px-22px display serif italic OR 14.5px body sans uppercase eyebrow, never both.
- Body copy: 15.5px or 16px body sans, line-height 1.55, letter-spacing 0, color #2c1810.
- Numbers / stats: tabular figures, large weight, deliberate.

PILLAR 3 — COLOR SYSTEM (use the named palette; never invent off-brand colors)
- Sand (page background): #faf6f1
- Bone (card background): #ffffff or #fbf8f3
- Copper (primary accent): #b87333
- Copper Deep (hover / footer): #8b5523
- Ink (body text): #2c1810
- Sage (secondary accent): #7a8b6f
- Desert Dusk (deep neutral panel): #2e2418
- Hairline rule: rgba(44,24,16,0.12)
Compose with two-tone or three-tone groupings; never use all five accents at once. The default background outside the email card is Sand; the email card itself can be Bone or, occasionally, a single Desert Dusk band for the hero.

PILLAR 4 — IMAGE TREATMENT
- All hero / feature images at 100% width of their container, height auto, display block, no border, border-radius:0 for full-bleed magazine moments OR 16px for soft-card moments. Pick one mode and stay consistent within the email.
- Every image has alt text and width / height attributes set as inline attributes (not just CSS) so Outlook lays it out correctly.
- If a single hero image is being used, treat it as a full-bleed editorial cover with the headline overlaid as a separate row directly underneath (not floating on the image, since Outlook can't reliably overlay text on images).
- If multiple images, use a 2-up gallery row at 296px each with 8px gutter, OR a single hero plus a smaller half-width portrait paired with text.

PILLAR 5 — RHYTHM AND SPACING
Vertical spacing is the single biggest signal of premium design. Use 56px between major sections, 28px between paragraphs, 12px between an eyebrow and its headline. Never use less than 24px of padding inside a card. Never use a generic "10px 20px" combo.

PILLAR 6 — RULES, MARKS, NUMBERED CHAPTERS
Where helpful, drop in: a 1px horizontal hairline rule in Hairline color (with 56px breathing room above and below); a small uppercase eyebrow ("FROM THE RANCH", "FROM OUR BLOG", "MEET THE TEAM"); a chapter number like "01" set in display serif at 22px Copper. These are flavorings, not staples; use at most two in any single email.

PILLAR 7 — CTA BUTTON
- One primary CTA per email. Solid Copper background, Bone text, padding 18px 32px, font-size 12.5px, font-weight 700, letter-spacing 0.18em, uppercase, border-radius 2px (never pill / never 8px+), display inline-block, no shadow.
- Render the CTA inside a centered table row with at least 32px of padding above and below.

PILLAR 8 — FEATURED BLOG CARD
If a featured blog is provided, treat it as a magazine "Continue Reading" module. Two-column on desktop (image left, copy right) with a 1px Hairline rule above the module and an eyebrow "FROM OUR BLOG" or "ON THE JOURNAL". The image MUST come from the FEATURED BLOG IMAGES list. The blog summary is rewritten into a single 2-sentence tease, never reproduced verbatim. The "Continue reading" link is plain Copper text with a right arrow (→), no button styling.

PILLAR 9 — FEATURED EMPLOYEE CARD
If a featured employee is provided, render a "Meet the Team" spotlight: small circular avatar (96px) on the left, name in display serif on the right (Meet [Name], 22px), title in uppercase eyebrow underneath, then one line of bio rewritten in your voice. If a public profile URL is present, append "Read more →" in Copper.

PILLAR 9b — FEATURED HORSE CARD
If a featured horse is provided, render a "From the Herd" spotlight that mirrors the employee card pattern: circular horse photo (96px) on the left, the horse's name in display serif on the right (Meet [Name], 22px), the horse's role in uppercase eyebrow underneath (use the "works in" field), then one short line drawn from the horse's notes, rewritten in your voice. The photo MUST be one of the URLs supplied in FEATURED HORSE photos; never invent or substitute. The herd is a working co-author of the program, not a mascot — keep the copy quiet and grounded, never cute.

PILLAR 10 — FOOTER
The footer is a quiet, two-line affair: "Seven Arrows Recovery" in display serif italic at 14px Ink, then a single line in eyebrow type with the website URL. Add a single soft rule above the footer (1px Hairline, 56px above and below). No address blob, no social row, no preference link clutter. Restraint is the point.

GLOBAL CONSTRAINTS — these are absolute:
- HTML5 doctype. Single document, complete, valid. Open with <!doctype html>, close with </html>.
- INLINE STYLES ONLY. No <style> blocks. No <script>. No <link>. No external CSS. No web fonts loaded from CDN; rely on the font stack fallbacks.
- Email-safe layout: outer 100% table, inner centered 600px table, all real layout via <table>, not divs (divs are fine for inline-block badges).
- Background color of the outer <body> and the outer wrapper table is the Sand color #faf6f1.
- Mobile-friendly without media queries: column widths use percentages where possible; minimum tap target 44px for the CTA.
- Every <a> uses an absolute https:// URL; never use relative paths.
- Every <img> has src, alt, width, height (in HTML attributes), display:block, border:0, max-width:100%, height:auto in style.
- Never reference an image URL that wasn't supplied in the IMAGES or FEATURED BLOG IMAGES context.
- Never reference a blog or employee that wasn't supplied.
- Avoid placeholder text (lorem ipsum, "TBD"); write around any missing inputs.

WRITING RULES — these are strict and overrule the rest of the brief:
- NEVER use em-dashes (—, U+2014) or en-dashes (–, U+2013) anywhere in the subject or body copy. Use a period, a comma, a semicolon, or a colon instead. Rewrite sentences if needed. The HTML must not contain the characters "—" or "–" at all (including inside &mdash; / &ndash; / &#8212; / &#8211; entities).
- Do not use the HTML entities &mdash; or &ndash;.
- Hyphens (-, U+002D) are fine for compound words.
- No emoji. No hashtags. No "Dear Friend" salutations.
- If a DRAFT TEXT block is supplied, use those exact words for the headline / body / CTA / postscript. Do not paraphrase, do not "improve" them. Your job in that case is purely composition and design.

OUTPUT FORMAT — return ONE JSON object with two keys:
  "subject": short subject line (no greater than 80 chars), no quotes, no emoji.
  "html": the complete document.

Return ONLY the JSON object. No preamble. No markdown fences.

DESIGN SEED for this build: ${designSeed}. Use it as a tiebreaker when picking between equally good composition / palette / treatment options so successive builds with the same inputs do not look identical.`;

  const ctxLines: string[] = [];
  ctxLines.push(`AUTHOR PROMPT:\n${prompt || '(none, write a tasteful general update)'}`);
  ctxLines.push(`USE LOGOS: ${useLogos ? 'yes' : 'no'}`);
  if (useLogos) {
    ctxLines.push(`LOGO URL (primary, vertical, transparent): ${LOGO_URL}`);
    ctxLines.push(`LOGO URL (alt, horizontal): ${LOGO_URL_ALT}`);
    ctxLines.push(`LOGO SIZE: render at 140px wide for the vertical mark (and proportional height) or 220px wide for the horizontal mark. Earlier drafts were rendering it around 64px which was too small. Center it in the header with 24px of padding above and 32px below before the next module.`);
  }
  ctxLines.push(`LINK TO WEBSITE: ${linkToWebsite ? 'yes' : 'no'}`);
  if (linkToWebsite) ctxLines.push(`PRIMARY CTA URL: ${SITE_URL}`);
  ctxLines.push(`INCLUDE PHONE NUMBER: ${includePhone ? 'yes' : 'no'}`);
  if (includePhone) {
    ctxLines.push(`PHONE NUMBER: ${ADMISSIONS_PHONE}. Surface it inside the email as either: (a) a small uppercase eyebrow strip directly under the logo ("ADMISSIONS · (866) 718-1665"), or (b) a quiet line directly under the CTA button ("Or call (866) 718-1665"), tel: link with href="tel:+18667181665". Pick ONE placement, not both. Format as styled text, not a button. Always use the exact format "(866) 718-1665" in the visible copy.`);
  }
  ctxLines.push(`IMAGES (${imageUrls.length}):\n${imageUrls.length === 0 ? '(none)' : imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`);
  if (blog) {
    ctxLines.push(
      `FEATURED BLOG:\n  title: ${blog.title}\n  url: ${blogUrl ?? '(no public slug yet, describe in text only, no link)'}\n  summary: ${blogSummary}`,
    );
    if (blogImages.length > 0) {
      ctxLines.push(
        `FEATURED BLOG IMAGES (use one of these for the blog card, never a marketer-supplied IMAGE):\n${blogImages.map((bi, i) => `  ${i + 1}. ${bi.url} | alt: ${bi.alt ?? ''}`).join('\n')}`,
      );
    }
  }
  if (emp) {
    ctxLines.push(
      `FEATURED EMPLOYEE:\n  name: ${emp.full_name}\n  title: ${emp.job_title ?? ''}\n  url: ${empUrl ?? '(no public slug, describe by name only, no link)'}\n  avatar: ${emp.avatar_url ?? ''}\n  bio: ${emp.bio ?? ''}`,
    );
  }
  if (horse) {
    const horseImageList = [horse.image_url, ...(horse.gallery_urls ?? [])].filter((u): u is string => typeof u === 'string' && u.length > 0);
    ctxLines.push(
      `FEATURED HORSE (render a small "Meet the Herd" spotlight card, mirror the employee card pattern but with the horse photo). Treat the horse like a quiet co-author of the story, never as a mascot or cute aside.\n  name: ${horse.name}\n  works in: ${horse.works_in ?? ''}\n  notes: ${horseNotes}\n  photos (use the first one for the card; do not invent others): ${horseImageList.length === 0 ? '(no photo)' : horseImageList.join(' | ')}`,
    );
  }
  if (draftText) {
    ctxLines.push(
      `DRAFT TEXT (use these exact words, do not paraphrase):\n  headline: ${draftText.headline ?? ''}\n  body: ${draftText.body ?? ''}\n  ctaLabel: ${draftText.ctaLabel ?? ''}\n  postscript: ${draftText.postscript ?? ''}`,
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
    return NextResponse.json({
      subject: stripDashes(parsed.subject ?? ''),
      html: stripDashes(parsed.html),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Belt-and-suspenders dash stripper. The system prompt forbids
// em-dashes and en-dashes outright, but Claude occasionally
// reaches for one anyway, so we sanitize on the way out. We
// also catch HTML entity forms (&mdash; &ndash; &#8212; &#8211;)
// in case the model "complied" by escaping.
function stripDashes(input: string): string {
  if (!input) return input;
  return input
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/&mdash;/gi, ', ')
    .replace(/&ndash;/gi, ', ')
    .replace(/&#8212;/g, ', ')
    .replace(/&#8211;/g, ', ')
    // Tidy double-comma / comma-space-comma artifacts created by
    // the substitution.
    .replace(/, ,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',');
}

// Claude usually returns clean JSON when asked to, but sometimes
// wraps in ```json fences or prepends a sentence. Strip both, then
// JSON.parse, falling back to a brace-balanced substring as a
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
