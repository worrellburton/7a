import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { EPISODES, episodeHref } from '@/lib/episodes';
import { findSitePage } from '@/lib/site-pages';
import { buildEmailSystemPrompt, PROMPT_VERSION } from '@/lib/prompts/email-build-system';

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
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-8)

const DEFAULT_MODEL = 'claude-opus-4-8';
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
  includeQuote?: unknown;
  includeInsuranceStrip?: unknown;
  includeSocialFooter?: unknown;
  darkMode?: unknown;
  featuredBlogId?: unknown;
  featuredEpisodeSlug?: unknown;
  featuredPagePath?: unknown;
  featuredPageImageUrl?: unknown;
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

// Crop a long review text to a pull-quote that stops at a clean
// boundary — never inside a word. Prefers the closest sentence end
// (. ! ?) within the budget; if no sentence ends late enough, backs
// up to the last whitespace and appends a single ellipsis so the
// cut reads as deliberate. The old `.slice(280)` approach happily
// rendered "...spok" mid-word; this helper guarantees that won't
// happen.
function cropPullQuote(raw: string, maxChars = 280): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean.replace(/[\s.!?,;:]+$/, '');

  const slice = clean.slice(0, maxChars);

  // If there's a sentence boundary at >= 60% of the budget, stop
  // there — that's the most natural break for a pull-quote.
  const sentenceMatch = slice.match(/[.!?](?=\s|$)/g);
  if (sentenceMatch && sentenceMatch.length > 0) {
    let lastEnd = -1;
    const finder = /[.!?](?=\s|$)/g;
    let m: RegExpExecArray | null;
    while ((m = finder.exec(slice)) !== null) {
      lastEnd = m.index + 1;
    }
    if (lastEnd >= Math.floor(maxChars * 0.6)) {
      return slice.slice(0, lastEnd).replace(/[\s,;:]+$/, '');
    }
  }

  // Otherwise back up to the last word boundary and add an ellipsis
  // so the truncation reads as intentional rather than broken.
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[\s.!?,;:]+$/, '');
  return `${trimmed}…`;
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
  const includeQuote = !!body.includeQuote;
  const includeInsuranceStrip = !!body.includeInsuranceStrip;
  const includeSocialFooter = !!body.includeSocialFooter;
  const darkMode = !!body.darkMode;
  const featuredBlogId = typeof body.featuredBlogId === 'string' ? body.featuredBlogId : null;
  const featuredEpisodeSlug = typeof body.featuredEpisodeSlug === 'string' ? body.featuredEpisodeSlug : null;
  const featuredPagePath = typeof body.featuredPagePath === 'string' ? body.featuredPagePath : null;
  const featuredPageImageUrl = typeof body.featuredPageImageUrl === 'string' && body.featuredPageImageUrl.length > 0
    ? body.featuredPageImageUrl
    : null;
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
  const [blogRes, empRes, blogImagesRes, horseRes, quoteRes] = await Promise.all([
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
    // Pick a top Google review: 5-star, not hidden, featured first
    // then highest-rated, then most recent. Falls back to no quote
    // if nothing meaningful is available so we never insert
    // placeholder text.
    includeQuote
      ? supabase.from('google_reviews')
          .select('author_name, rating, text, review_time, featured, hidden')
          .eq('hidden', false)
          .gte('rating', 5)
          .not('text', 'is', null)
          .order('featured', { ascending: false, nullsFirst: false })
          .order('rating', { ascending: false })
          .order('review_time', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const blog = (blogRes as { data: { title: string; slug: string | null; body_markdown?: string | null } | null }).data;
  const emp = (empRes as { data: { full_name: string; job_title: string | null; avatar_url: string | null; public_slug: string | null; bio?: string | null } | null }).data;
  const blogImages = ((blogImagesRes as { data: Array<{ url: string; alt: string | null; position: number }> | null }).data ?? []);
  const horse = (horseRes as { data: { name: string; image_url: string | null; works_in: string | null; notes: string | null; gallery_urls: string[] | null } | null }).data;
  const quote = (quoteRes as { data: { author_name: string; rating: number | null; text: string } | null }).data;
  // Crop quote text to a single tight pull-quote so the email
  // doesn't get hijacked by a 5-paragraph review. Earlier versions
  // hard-sliced at 280 chars and stripped trailing punctuation,
  // which routinely landed inside a word — the email rendered
  // "…I made my initial call I spok" instead of stopping at a
  // clean boundary. Now: prefer the nearest sentence boundary
  // within the budget; if none, back up to the last word boundary
  // and append an ellipsis so the truncation reads as intentional.
  const quoteText = quote?.text ? cropPullQuote(quote.text, 280) : '';
  const blogSummary = blog?.body_markdown ? blog.body_markdown.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';
  const horseNotes = horse?.notes ? horse.notes.replace(/\s+/g, ' ').trim().slice(0, 400) : '';

  // Static-episode fallback: when the picker chose a Recovery
  // Roadmap entry that doesn't live in public.blogs, resolve from
  // the EPISODES table so Claude still receives a title + URL +
  // blurb instead of treating it as "no blog featured".
  let staticEpisode: { number: number; title: string; slug: string; blurb: string; url: string } | null = null;
  if (!blog && featuredEpisodeSlug) {
    const ep = EPISODES.find((e) => e.slug === featuredEpisodeSlug);
    if (ep) {
      // episodeHref() honors per-episode legacy URL overrides — so
      // Episode 7 (Suboxone → Sublocade) lands at /transition-from-
      // suboxone-to-sublocade rather than /who-we-are/blog/<slug>.
      const href = episodeHref(ep.slug);
      const url = href.startsWith('http') ? href : `${SITE_URL.replace(/\/$/, '')}${href}`;
      staticEpisode = {
        number: ep.number,
        title: ep.title,
        slug: ep.slug,
        blurb: ep.blurb,
        url,
      };
    }
  }

  // Featured marketing page (admissions, our-program, etc).
  const featuredPage = findSitePage(featuredPagePath);
  const featuredPageUrl = featuredPage
    ? `${SITE_URL.replace(/\/$/, '')}${featuredPage.path}`
    : null;

  const blogUrl = blog?.slug ? `${SITE_URL}who-we-are/blog/${blog.slug}` : null;
  const empUrl = emp?.public_slug ? `${SITE_URL}who-we-are/meet-our-team/${emp.public_slug}` : null;

  // A small per-build seed nudges Claude toward visual variety:
  // two builds with the same inputs should not feel identical.
  const designSeed = Math.floor(Math.random() * 1_000_000);

  // 10-pillar 2050 email design brief. The system prompt body lives
  // in @/lib/prompts/email-build-system so prompt edits are legible
  // in code review and a snapshot test catches accidental whitespace
  // drift before it ships. PROMPT_VERSION is bumped whenever the
  // prompt changes so a per-build audit log can pin a quality
  // regression to a specific revision.
  const systemPrompt = buildEmailSystemPrompt(designSeed);
  void PROMPT_VERSION; // referenced for build-audit trails (logged on send-pipeline tickets)

  const ctxLines: string[] = [];
  ctxLines.push(`AUTHOR PROMPT:\n${prompt || '(none, write a tasteful general update)'}`);
  // Dark/light mode directive — promoted to the top of the context
  // block so Claude reads it before any palette decisions. Overrides
  // PILLAR 3's default Sand background when set.
  ctxLines.push(
    `COLOR MODE: ${darkMode ? 'DARK' : 'LIGHT'}.\n` +
      (darkMode
        ? 'Render the entire email in DARK MODE. The outer <body> background, the wrapper <table>, and any outer card background must be Desert Dusk (#2e2418), with body copy in Bone (#fbf8f3) and eyebrows / accents in Copper (#b87333). Replace any usage of Sand (#faf6f1) with Desert Dusk. Replace any usage of Ink (#2c1810) with Bone for text. The CTA button stays Copper background with Bone text. Hairline rules become rgba(251,248,243,0.18) instead of rgba(44,24,16,0.12). Hero photos and inline images can keep their natural colors — they sit ON the dark background like prints on a dark gallery wall. Quote text inside the pull-quote block becomes Bone, the eyebrow stays Copper. The footer text stays Bone with Copper accents. Do not render any white card surfaces; if a contained card is helpful, use a slightly lighter Desert Dusk (#372b1f) instead of Bone (#fbf8f3).'
        : 'Render the email in the default LIGHT palette per PILLAR 3 (Sand background, Bone or Sand-tinted cards, Ink body text, Copper accents).'),
  );
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
  // Insurance accepted strip — short carrier list near the top of
  // the email so coverage is visible at a glance.
  //
  // Earlier versions rendered each carrier as an <img> sourced from
  // Brandfetch's CDN (cdn.brandfetch.io). That broke: Brandfetch's
  // free client IDs aren't authorised for hotlinking, so every
  // request 302-redirected to their "no hotlinking" docs page and
  // the email rendered five colour-block placeholders instead of
  // real logos. Email clients also strip / proxy / lazy-load
  // external <img>s aggressively, so any external-image strategy
  // has a long tail of failure modes (Outlook, dark-mode proxies,
  // image blocking by default in Gmail, etc.).
  //
  // The fix: text. A tight uppercase carrier strip with elegant
  // dividers reads as deliberately editorial — same energy as the
  // "AS SEEN IN" line in a newsletter — and can't break in any
  // mail client. If we ever want true logo art back, the upgrade
  // path is to host PNG/SVG copies under /public/email-assets/
  // /insurance/ on the marketing site and update the carrier list
  // below with image URLs, NOT to re-introduce a 3rd-party CDN.
  if (includeInsuranceStrip) {
    ctxLines.push(
      `INCLUDE INSURANCE STRIP: yes. Render a quiet "Insurance accepted" module BELOW the header / hero and ABOVE the body copy. Treatment:
  - A small uppercase eyebrow that reads "IN-NETWORK WITH" (10.5px, letter-spacing 0.22em, color Copper #b87333), centered, 56px above + 28px below.
  - One centered text row, NO IMAGES, listing the carriers separated by middle-dot dividers. Carrier names render in Ink (#3a3a3a) at 13px, font-weight 600, letter-spacing 0.04em, in small-caps via text-transform:uppercase. Dividers render as ${'`'}·${'`'} (U+00B7) wrapped in a span with color #c8b89c (warm taupe) and padding 0 10px. Whole row wrapped in a single <a href="${SITE_URL.replace(/\/$/, '')}/insurance" style="text-decoration:none;color:inherit;"> so a tap on the row opens the insurance landing page.
  - Underneath the row, one single 11px Ink line (italic optional), centered: "Most major plans accepted. Curious about yours? Reply to this email or call (866) 718-1665."
  Carrier names (USE EXACTLY these, in this order — do not abbreviate or expand):
    Aetna · BCBS · Cigna · Humana · TRICARE
  Do NOT use <img>, do NOT reference Brandfetch, Clearbit, Logo.dev, or any external logo CDN — the carrier names are TEXT only. This is intentional: external image hotlinking breaks across email clients and was the source of broken placeholders in the previous template version.`,
    );
  }
  // Social footer row — IG/FB/LinkedIn icons in the closing block.
  // Same Brandfetch CDN pattern as the insurance strip; sized to a
  // compact 24px round mark each, three across, centered with 16px
  // gaps. Links use the real 7A handles.
  if (includeSocialFooter) {
    // Monochrome marks. Instagram + Facebook come from simpleicons.org
    // (still available there), LinkedIn is self-hosted at
    // /public/icons/linkedin-{ink|white}.svg because Simple Icons
    // removed LinkedIn from their library after a trademark request
    // and the CDN now serves an empty response for that slug — that
    // was the broken icon the marketers were seeing in the
    // FOLLOW ALONG row. Self-hosting decouples us from any future
    // CDN brand pulls. Color flips off the campaign's COLOR MODE:
    // white on dark mode, near-black on light mode so the icons
    // always read with high contrast against the email's background.
    const iconHex = darkMode ? 'ffffff' : '1a1a1a';
    const igIcon = `https://cdn.simpleicons.org/instagram/${iconHex}`;
    const fbIcon = `https://cdn.simpleicons.org/facebook/${iconHex}`;
    const liIcon = darkMode
      ? 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-white.svg'
      : 'https://sevenarrowsrecoveryarizona.com/icons/linkedin-ink.svg';
    ctxLines.push(
      `INCLUDE SOCIAL FOOTER: yes. Add a small social row INSIDE the footer block (PILLAR 10), directly above the closing phone-number line, with a single hairline rule above it for separation. Treatment:
  - A small uppercase eyebrow centered above the icons: "FOLLOW ALONG" (10.5px, letter-spacing 0.22em, Copper #b87333).
  - One centered <table> row with three icon cells, each cell padding 0 8px. Each icon renders as <img width="22" height="22" style="display:inline-block;width:22px;height:22px;border:0;" /> wrapped in an <a href="..." target="_blank" rel="noopener">. Do NOT round the corners — these are monochrome glyph marks, not full-color brand tiles. Drop opacity to ~0.85.
  Handles (use these exact image URLs + hrefs verbatim — they are MONOCHROME ${darkMode ? 'WHITE' : 'INK'} marks tuned for the current color mode, so do not swap them for brand-colored logos):
    1. Instagram · img: ${igIcon} · href: https://www.instagram.com/sevenarrowsrecovery/
    2. Facebook  · img: ${fbIcon}  · href: https://www.facebook.com/sevenarrowsrecovery
    3. LinkedIn  · img: ${liIcon}  · href: https://www.linkedin.com/company/sevenarrowsrecovery/
  Each <img> alt attribute is the platform name verbatim ("Instagram", "Facebook", "LinkedIn"). Place the row between the hairline rule and the friendly closing phone-number sentence so the eye reads: rule → "FOLLOW ALONG" → three marks → closing line.`,
    );
  }
  ctxLines.push(`IMAGES (${imageUrls.length}):\n${imageUrls.length === 0 ? '(none)' : imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`);
  // Multi-image layout directive. Without this the model places
  // each image at a different spot in the body, which reads as
  // unrelated random photos. When the marketer selects ≥2 images
  // we want them rendered as ONE cohesive gallery block.
  if (imageUrls.length >= 2) {
    const layoutHint =
      imageUrls.length === 2 ? '2 cells side-by-side (50/50 split)'
      : imageUrls.length === 3 ? '3 cells in one row, equal width'
      : imageUrls.length === 4 ? 'a 2×2 grid (2 rows of 2)'
      : imageUrls.length <= 6 ? `a 3-column grid (${imageUrls.length === 5 ? '2 rows: 3 + 2 centered' : '2 rows of 3'})`
      : `a 3-column grid (${Math.ceil(imageUrls.length / 3)} rows of up to 3, last row left-aligned)`;
    ctxLines.push(
      `MULTI-IMAGE GALLERY: ${imageUrls.length} images selected. Render them as a SINGLE cohesive gallery block — never scatter individual images through the body copy. Layout: ${layoutHint}.

Email-safe HTML rules for the gallery (Outlook + Apple Mail + Gmail web/native + iOS):
  • Outer <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"> as the row wrapper.
  • One <tr> per row of cells. Each <tr> holds <td> cells of equal width with a fixed horizontal gutter (8-12px) implemented via cellpadding on the td OR a thin spacer <td>.
  • Each <img> sits inside its <td> at width="100%" + height="auto" + style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:100%;border-radius:6px;". DO NOT use object-fit (not supported in Outlook).
  • DO NOT use CSS grid or flexbox — Outlook strips them.
  • Add a small uppercase Copper eyebrow above the gallery ("FROM THE RANCH", "RECENT MOMENTS", "GALLERY", or a contextually-fitting 1-2 word phrase — pick the one that matches the campaign body). Eyebrow style matches the rest of the email: 10.5px, letter-spacing 0.22em, Copper, centered.
  • Place the gallery as ONE block in a natural narrative position (e.g., after an introductory paragraph that sets up what the photos show, before the CTA). Never split it across the body.
  • All image alt attributes should be brief and descriptive ("Sunset over the herd", "Group at the ranch firepit") — not the file name. Use neutral fallbacks if the surrounding copy doesn't make it obvious.
  • Mobile reflow: in the <td> width attribute use a fixed pixel width that totals ~600px for the whole row at desktop. On mobile, the email client's auto-stacking will collapse each <td> to full width naturally — let it; do not add @media query overrides that fight it.`,
    );
  }
  if (blog) {
    ctxLines.push(
      `FEATURED BLOG:\n  title: ${blog.title}\n  url: ${blogUrl ?? '(no public slug yet, describe in text only, no link)'}\n  summary: ${blogSummary}`,
    );
    if (blogImages.length > 0) {
      ctxLines.push(
        `FEATURED BLOG IMAGES (use one of these for the blog card, never a marketer-supplied IMAGE):\n${blogImages.map((bi, i) => `  ${i + 1}. ${bi.url} | alt: ${bi.alt ?? ''}`).join('\n')}`,
      );
    }
  } else if (staticEpisode) {
    // Treat a static Recovery Roadmap episode identically to a
    // DB-backed FEATURED BLOG so PILLAR 8's "Continue Reading"
    // module still renders. No blog_images list — the static
    // episode uses no image and the card is text-only with a small
    // serif "Episode N" eyebrow above the title.
    ctxLines.push(
      `FEATURED BLOG (Recovery Roadmap, Episode ${staticEpisode.number}):\n  title: ${staticEpisode.title}\n  url: ${staticEpisode.url}\n  summary: ${staticEpisode.blurb}\n  episodeNumber: ${staticEpisode.number}`,
    );
    ctxLines.push(
      `FEATURED BLOG IMAGES: (none — render the blog card text-only with a small "Episode ${staticEpisode.number}" eyebrow above the title)`,
    );
  }
  if (featuredPage && featuredPageUrl) {
    // The page picker forces the marketer to pair a specific image
    // with the page (step 2 of the modal). When that image is
    // present we render the module as a small photo card; when
    // absent (legacy drafts saved before this UI shipped) we keep
    // the original text-only "Continue exploring" module.
    if (featuredPageImageUrl) {
      ctxLines.push(
        `FEATURED PAGE (render a small image-led "Continue exploring" module BELOW the body copy and ABOVE the CTA, separate from any FEATURED BLOG card). Layout: the image on the left at 120x120 (border-radius 8px, object-cover), the text block on the right. Text block: a small uppercase Copper eyebrow ("ON ${featuredPage.group.toUpperCase()}" or "DIVE DEEPER"), a 20px display-serif headline with the page title, a single 1-sentence blurb, and a Copper-text "Read more →" link to the URL. No card border, no button styling. Skip if it would duplicate the primary CTA URL.\n  title: ${featuredPage.title}\n  url: ${featuredPageUrl}\n  group: ${featuredPage.group}\n  description: ${featuredPage.blurb}\n  image: ${featuredPageImageUrl}  ← USE THIS EXACT URL for the card photo, do not substitute another IMAGE from the library`,
      );
    } else {
      ctxLines.push(
        `FEATURED PAGE (render a quiet "Continue exploring" module BELOW the body copy and ABOVE the CTA, separate from any FEATURED BLOG card). Treat it like a section sign-post: a small uppercase eyebrow that reads "ON ${featuredPage.group.toUpperCase()}" or "DIVE DEEPER", a 22px display-serif headline with the page title, a single 1-sentence blurb (you can use the description below), and a Copper-text "Read more →" link to the URL. No card border, no button styling. Skip if it would duplicate the primary CTA URL.\n  title: ${featuredPage.title}\n  url: ${featuredPageUrl}\n  group: ${featuredPage.group}\n  description: ${featuredPage.blurb}`,
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
  if (includeQuote && quote && quoteText) {
    ctxLines.push(
      `INCLUDE QUOTE: yes. Render the following Google review as a pull-quote block between the body copy and the CTA, per the PULL-QUOTE pillar. Do not paraphrase; quote the text verbatim. Attribution line is "— ${quote.author_name}" only (no rating, no "Google review", no date).\n  quote: "${quoteText}"\n  author: ${quote.author_name}`,
    );
  } else if (includeQuote) {
    ctxLines.push(`INCLUDE QUOTE: requested, but no eligible Google review available. Skip the quote block.`);
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
        // 16384 was 8192 — but a darkmode + multi-image + featured-
        // horse + insurance-strip + social-footer email reliably blew
        // past 8k tokens, truncating mid-HTML-string and producing the
        // "Claude returned an unparseable response" toggle bug. Opus
        // 4.7 supports well above this; the visible ceiling for our
        // payloads sits around 12-14k.
        max_tokens: 16384,
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

// Claude usually returns clean JSON when asked to, but real-world
// responses break the parser in three repeatable ways:
//   1. ```json fences anywhere (start, end, or both).
//   2. A "Here is the email:" preamble before the first '{', or
//      a "Let me know if you want changes" trailer after the last
//      '}'.
//   3. Literal newlines / tabs / CRs inside the HTML string value
//      that should have been escaped — strict JSON.parse rejects
//      them as control characters in strings.
//   4. Truncation: the response ran out of tokens mid-HTML, leaving
//      a string that never closes plus an unbalanced object. We
//      try to repair that by closing the open string and balancing
//      braces, so the marketer at least gets a draft instead of a
//      hard failure.
function parseClaudeJson(raw: string): { subject?: string; html?: string } | null {
  // Strip fences anywhere, then narrow to the JSON object span by
  // taking content between the first '{' and the matching '}'. The
  // matching pass walks the string char-by-char so a '}' inside an
  // HTML string value can't end the object early.
  const fenced = raw.replace(/```(?:json)?/gi, '').trim();
  const start = fenced.indexOf('{');
  if (start === -1) return null;
  const end = findMatchingBrace(fenced, start);
  const slice = end !== -1 ? fenced.slice(start, end + 1) : fenced.slice(start);

  const candidates = [
    slice,
    escapeStringControlChars(slice),
    repairTruncated(slice),
    escapeStringControlChars(repairTruncated(slice)),
  ];
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as { subject?: string; html?: string };
      if (parsed && (parsed.html || parsed.subject)) return parsed;
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Returns the index of the '}' that closes the '{' at `from`, or
// -1 if the object is unterminated (i.e. truncation). Tracks string
// boundaries with backslash escaping so braces inside HTML values
// don't end the object early.
function findMatchingBrace(s: string, from: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// Walks the string and, when inside a JSON string literal, replaces
// unescaped CR/LF/TAB with their escape sequences so JSON.parse
// stops rejecting otherwise-valid Claude output. Quote and
// backslash boundaries are honoured the same way findMatchingBrace
// honours them.
function escapeStringControlChars(s: string): string {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) { out += c; escape = false; continue; }
      if (c === '\\') { out += c; escape = true; continue; }
      if (c === '"') { out += c; inString = false; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
      out += c;
      continue;
    }
    out += c;
    if (c === '"') inString = true;
  }
  return out;
}

// Best-effort repair for truncated output. If the slice ends inside
// an open string (no closing '"'), close the string. Then close any
// open braces. This produces a syntactically-valid object that loses
// only the trailing characters Claude never got to emit, which is
// almost always better than handing the user a hard error.
function repairTruncated(s: string): string {
  let inString = false;
  let escape = false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  let out = s;
  if (inString) out += '"';
  while (depth > 0) { out += '}'; depth--; }
  return out;
}
