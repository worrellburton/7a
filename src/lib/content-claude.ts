// Claude wrapper for the content pipeline. Three callsites:
//
//   generateBlogBody  — phase 4. Turns the admin's paragraph prompt
//                       into a full investigative-style blog post
//                       (markdown) targeted at sevenarrowsrecoveryarizona.com.
//   reviseBlogBody    — phase 5. Takes the current markdown + the
//                       admin's revision instruction and returns
//                       rewritten markdown.
//   buildBlogLayout   — phase 8. Reads approved markdown + the 7
//                       chosen images and returns a JSON layout the
//                       public renderer can walk: blocks of prose,
//                       image, pull_quote, svg_icon, webgl_animation,
//                       and callout.
//
// All three call claude-opus-4-7 per CLAUDE.md (the most capable
// model is the default for new AI features). Caller is responsible
// for surfacing the "no api key" path — `loadKey` throws so the
// route handler can return a 503.

import { SEO_CONTENT_WRITER_SKILL, HUMANIZER_SKILL } from './skills';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
const CLAUDE_MODEL = process.env.ANTHROPIC_CONTENT_MODEL || 'claude-opus-4-7';

function loadKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured');
  return key;
}

interface ClaudeContentPart { type?: string; text?: string }
interface ClaudeResponse { content?: ClaudeContentPart[]; error?: { message?: string } }

async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = loadKey();
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });
  const json = (await res.json()) as ClaudeResponse;
  if (!res.ok) throw new Error(json.error?.message ?? `Claude HTTP ${res.status}`);
  const parts = (json.content ?? [])
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string);
  const out = parts.join('\n').trim();
  if (!out) throw new Error('Claude returned an empty response');
  return out;
}

const GENERATE_SYSTEM = [
  // Two playbooks the human writers follow, version-controlled
  // in src/lib/skills/. Loaded at module init so EVERY blog
  // generation follows the same SEO + voice rules. The humanizer
  // is also re-applied automatically as the final step — that's
  // step 18 of the SEO skill, and it must not be skipped.
  SEO_CONTENT_WRITER_SKILL,
  '',
  HUMANIZER_SKILL,
  '',
  '─── PROJECT-SPECIFIC RULES ───',
  '',
  'You are an expert healthcare content writer for Seven Arrows Recovery,',
  'a residential addiction-treatment centre in Arizona. The site is',
  'sevenarrowsrecoveryarizona.com. Your job is to turn a short paragraph',
  'brief from the admissions team into a full long-form investigative blog',
  'post that is genuinely useful, educational, and engaging for readers',
  'researching recovery options.',
  '',
  'Hard rules:',
  '- Output GitHub-flavoured Markdown only. No preamble, no code fences',
  '  around the whole thing.',
  '- Start with a single H1 (# Title) that is the post title.',
  '- 1500-2200 words. Use H2 / H3 headings, short paragraphs, and at',
  '  least two unordered lists to keep the page scannable.',
  '- Tone: warm, clinically literate, never glib. Avoid hype, scare',
  '  tactics, or "miracle cure" language.',
  '- SEO: weave in 4-6 supporting long-tail phrases naturally; include',
  '  one frequently-asked question as an H2 near the end and answer it',
  '  in two paragraphs.',
  '- GEO: anchor at least 3 references to Arizona / the southwest /',
  '  Seven Arrows Recovery so search engines understand the local context.',
  '- Cite credible sources inline as plain text (e.g. "the NIDA notes")',
  '  rather than fabricated URLs. Never invent links.',
  '- End with a one-sentence call-to-action linking the reader to',
  '  /admissions on sevenarrowsrecoveryarizona.com.',
  '- Punctuation: NEVER use em-dashes (the long "—" character) or',
  '  en-dashes (the medium "–" character). Always substitute with a',
  '  comma, a semicolon, parentheses, or a period. This is a strict',
  '  house style rule, no exceptions, including in compound phrases.',
  '- Mobile-first cadence: keep paragraphs short (2-4 sentences max),',
  '  use generous subheads and bulleted lists. Assume the reader is',
  '  on a phone, scrolling with their thumb.',
  '',
  'Investigative angle: surface the *why* behind the topic (research,',
  'mechanisms, real-world tradeoffs), not just the *what*.',
].join('\n');

export async function generateBlogBody(prompt: string, title?: string | null): Promise<string> {
  const userMsg = [
    title ? `Working title: ${title}` : null,
    'Brief from admissions team:',
    prompt.trim(),
    '',
    'Write the full blog post per the system rules.',
  ].filter(Boolean).join('\n');
  return callClaude({ system: GENERATE_SYSTEM, user: userMsg });
}

const REVISE_SYSTEM = [
  // Revisions also pass through the SEO + humanizer playbooks so
  // any rewrite still ships in the Seven Arrows voice + with the
  // SEO scaffolding intact. The humanizer pass at step 18 runs
  // on the revised draft before output.
  SEO_CONTENT_WRITER_SKILL,
  '',
  HUMANIZER_SKILL,
  '',
  '─── REVISION RULES ───',
  '',
  'You are revising a Seven Arrows Recovery blog post per the editor\'s',
  'instruction. Preserve the H1 title unless explicitly asked to change',
  'it. Preserve overall length unless asked to lengthen/shorten. Output',
  'the full revised Markdown post: no preamble, no diff, no commentary.',
  '',
  'Punctuation: NEVER use em-dashes (—) or en-dashes (–). Substitute',
  'with a comma, a semicolon, parentheses, or a period. Strict rule.',
].join('\n');

export async function reviseBlogBody(currentMarkdown: string, instruction: string): Promise<string> {
  const userMsg = [
    'Current post:',
    '---',
    currentMarkdown.trim(),
    '---',
    '',
    'Editor instruction:',
    instruction.trim(),
    '',
    'Output the revised post.',
  ].join('\n');
  return callClaude({ system: REVISE_SYSTEM, user: userMsg, maxTokens: 6000 });
}

// Layout schema the public renderer understands. Mirror this in the
// DbBlogRenderer component so the contract is enforced both sides.
export type LayoutBlock =
  | { type: 'hero'; title: string; tagline?: string; image?: { url: string; alt: string } }
  | { type: 'prose'; markdown: string }
  | { type: 'image'; url: string; alt: string; caption?: string }
  | { type: 'pull_quote'; quote: string; attribution?: string }
  | { type: 'svg_icon'; icon: 'compass' | 'leaf' | 'mountain' | 'sun' | 'wave' | 'arrow'; heading?: string; body?: string }
  | { type: 'webgl_animation'; scene: 'particles' | 'orbit' | 'aurora'; accent: string }
  | { type: 'callout'; tone: 'info' | 'note' | 'warning'; heading: string; body: string };

export interface Layout { blocks: LayoutBlock[] }

const BUILD_SYSTEM = [
  'You are an art director assembling a long-form blog post for the',
  'public Seven Arrows Recovery site. You receive the final approved',
  'Markdown body and 7 generated images with alt text. Your job is to',
  'compose a JSON layout the renderer will walk top-to-bottom.',
  '',
  'Output rules:',
  '- Output strict JSON only. No code fences, no commentary.',
  '- Top-level shape: { "blocks": [ ...LayoutBlock ] }',
  '- Block types allowed (lowercase "type" key):',
  '  - hero { type, title, tagline?, image? { url, alt } }',
  '  - prose { type, markdown }       (a chunk of the original markdown)',
  '  - image { type, url, alt, caption? }',
  '  - pull_quote { type, quote, attribution? }',
  '  - svg_icon { type, icon: "compass"|"leaf"|"mountain"|"sun"|"wave"|"arrow", heading?, body? }',
  '  - webgl_animation { type, scene: "particles"|"orbit"|"aurora", accent: "#hex" }',
  '  - callout { type, tone: "info"|"note"|"warning", heading, body }',
  '',
  'Composition rules:',
  '- First block: hero, with the post H1 as the title and the first',
  '  image as hero image.',
  '- Then alternate prose with image / pull_quote / svg_icon / callout',
  '  / webgl_animation so the page has rhythm. Aim for ~10-14 blocks total.',
  '- Use all 7 supplied images exactly once (one as hero, the other 6 as',
  '  inline image blocks or hero block fallbacks).',
  '- Exactly one webgl_animation block, placed near the top third of the',
  '  post. Accent colour picked to match the post mood.',
  '- 2-3 svg_icon blocks, placed in section breaks.',
  '- 1-2 pull_quote blocks at emotional peaks of the body.',
  '- 1 callout near the end, tone "note", with a soft pointer to /admissions.',
  '',
  'Mobile readability (the renderer ships the same layout to phone and',
  'desktop, but phone is the larger audience):',
  '- Keep every prose block under ~600 chars so it reads as one swipe',
  '  on a phone, not a wall of text. Break long sections across multiple',
  '  prose blocks separated by image / pull_quote / svg_icon beats so',
  '  the reader gets a visual breath at least every 2-3 screens.',
  '- Pull_quote text: under 140 chars so it fits a phone screen without',
  '  wrapping awkwardly.',
  '- Callout body: under 200 chars and easy to scan at a glance.',
  '- Hero tagline (if used): under 140 chars.',
  '- Use bulleted lists inside prose where appropriate; phones render',
  '  short bullets far better than dense paragraphs.',
  '',
  'Punctuation (strict, applies to every string in the JSON):',
  '- NEVER use em-dashes ("—") or en-dashes ("–"). Substitute with a',
  '  comma, a semicolon, parentheses, or a period.',
  '- If the source markdown contains em-dashes or en-dashes, rewrite',
  '  those phrases as you copy them into prose blocks so the published',
  '  page contains zero "—" or "–" characters.',
].join('\n');

export async function buildBlogLayout(args: {
  bodyMarkdown: string;
  title: string;
  images: { url: string; alt: string; ai?: boolean }[];
}): Promise<Layout> {
  const userMsg = [
    `Post title: ${args.title}`,
    '',
    'Approved markdown body:',
    '---',
    args.bodyMarkdown.trim(),
    '---',
    '',
    'Images to use (7 total). Some are AI-generated, some came from the',
    'editorial library, both are fine to use anywhere in the layout:',
    ...args.images.map((img, i) => `${i + 1}. ${img.url}, alt: ${img.alt}${img.ai ? ' [AI-generated]' : ' [library]'}`),
    '',
    'Return the JSON layout.',
  ].join('\n');
  // 4000 tokens was tight: a 14-block layout with prose chunks regularly
  // overflows and Claude truncates mid-string, which produced the
  // "Unexpected end of JSON input" error users were hitting. 12000 gives
  // ample headroom and on retry we ask Claude to be terser.
  const raw = await callClaude({ system: BUILD_SYSTEM, user: userMsg, maxTokens: 12000 });
  const first = tryParseLayout(raw);
  if (first.ok) return stripDashes(first.layout);

  // One retry with a smaller target: pass back what we got and ask
  // Claude to return strict, terser JSON. This catches the cases where
  // the model went verbose and ran into the token cap.
  const retryMsg = [
    'Your previous response was not valid JSON, it was likely',
    'truncated. Re-emit the layout, but be terser:',
    '- 10 blocks total, not 14',
    '- prose blocks under 600 chars each',
    '- no trailing prose; cut the body where needed',
    '- output strict JSON only, no commentary, no code fences',
    '- NEVER use em-dashes or en-dashes in any string',
    '',
    'Same inputs as before, same 7 images, same title, same body.',
  ].join('\n');
  const raw2 = await callClaude({ system: BUILD_SYSTEM, user: `${userMsg}\n\n${retryMsg}`, maxTokens: 8000 });
  const second = tryParseLayout(raw2);
  if (second.ok) return stripDashes(second.layout);

  throw new Error(`Failed to parse layout JSON: ${second.error}`);
}

/** Belt-and-braces em-dash scrubber. The system prompt tells Claude
 * not to use em-dashes or en-dashes; this walks every string in the
 * Layout and rewrites any that snuck through with a comma plus a
 * space, which reads as a natural pause in nearly every context the
 * model uses dashes for. */
function stripDashes(layout: Layout): Layout {
  function clean(s: string): string {
    // Em-dash + en-dash + double-hyphen, with optional surrounding
    // whitespace, collapsed to ", " so " — hello" becomes ", hello".
    return s.replace(/\s*[—–]\s*/g, ', ').replace(/\s*--\s*/g, ', ');
  }
  function walk<T>(v: T): T {
    if (typeof v === 'string') return clean(v) as unknown as T;
    if (Array.isArray(v)) return v.map(walk) as unknown as T;
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = walk(val);
      }
      return out as unknown as T;
    }
    return v;
  }
  return walk(layout);
}

/** Attempt to coerce a Claude response into a Layout. Strips code
 * fences, slices to the outermost `{...}`, and patches truncated JSON
 * (unclosed strings / arrays / braces) before parsing. Returns the
 * parsed layout or the parse error so the caller can decide whether to
 * retry. */
function tryParseLayout(raw: string): { ok: true; layout: Layout } | { ok: false; error: string } {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Slice to the outermost JSON object in case Claude wrapped it in prose.
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  const candidate = first >= 0 && last > first ? stripped.slice(first, last + 1) : stripped;
  const attempts = [candidate, repairTruncatedJson(candidate)];
  for (const text of attempts) {
    try {
      const parsed = JSON.parse(text) as Layout;
      if (!parsed || !Array.isArray(parsed.blocks)) {
        return { ok: false, error: 'layout missing blocks[]' };
      }
      return { ok: true, layout: parsed };
    } catch (e) {
      // try the next repair pass
      if (text === attempts[attempts.length - 1]) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  }
  return { ok: false, error: 'unable to parse layout' };
}

/** Last-ditch repair for a JSON payload Claude truncated mid-string.
 * Closes the open string, drops the dangling element, and balances
 * the remaining `[` and `{` so JSON.parse succeeds with whatever
 * complete blocks we managed to capture. */
function repairTruncatedJson(text: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let lastCompletedIndex = -1; // index just after the last complete element
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      stack.pop();
      if (stack.length === 1 && stack[0] === '[') {
        // Just closed an element inside the blocks array — remember.
        lastCompletedIndex = i + 1;
      }
    }
  }
  // If we landed mid-string or mid-element, rewind to the last complete one.
  let body = text;
  if (inString || stack.length > 0) {
    if (lastCompletedIndex > 0) {
      body = text.slice(0, lastCompletedIndex);
    }
    // Re-walk to compute the residual stack on the trimmed body.
    inString = false; escape = false;
    const stack2: string[] = [];
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (escape) { escape = false; continue; }
      if (inString) {
        if (ch === '\\') escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{' || ch === '[') stack2.push(ch);
      else if (ch === '}' || ch === ']') stack2.pop();
    }
    // Strip trailing comma if any, then close every open container.
    body = body.replace(/,\s*$/, '');
    while (stack2.length) {
      const open = stack2.pop();
      body += open === '{' ? '}' : ']';
    }
  }
  return body;
}

// Helper used by phase 6 image prompt construction — Claude reads the
// body and proposes 10 distinct visual concepts the image models can
// render. Each concept is tagged with a style (photoreal / editorial /
// illustrative) so the resulting gallery feels intentional instead of
// uniformly photographic. The route layers a style-specific modifier
// onto each prompt before sending it to fal so the model knows what
// register to render in.
const IMAGE_CONCEPTS_SYSTEM = [
  'You read a Seven Arrows Recovery blog post and propose 10 distinct',
  'visual concepts for accompanying imagery. Each concept describes a',
  'scene the image model should render, plus a style register.',
  '',
  'Output rules:',
  '- Output strict JSON: { "concepts": [ { "prompt": str, "alt": str, "style": "photoreal"|"editorial"|"illustrative" }, ... ] }',
  '- Exactly 10 concepts.',
  '- Style distribution across the 10: 4 photoreal, 3 editorial, 3',
  '  illustrative. The photoreal concepts feel like cinematic',
  '  documentary photography (real lenses, real light). The editorial',
  '  concepts feel like New York Times Magazine fine-art photography —',
  '  high-contrast, conceptual, often a single emblematic object.',
  '  The illustrative concepts feel like an editorial illustration in',
  '  the style of The Atlantic or The New Yorker — flat shapes, muted',
  '  palette, symbolic composition.',
  '- Subject variety: across the 10, mix landscape, architectural,',
  '  abstract, conceptual object, hand/silhouette scenes. No two',
  '  concepts should depict the same scene.',
  '- Aesthetic guardrails (all styles): southwestern light, calming,',
  '  no faces visible (silhouettes / from-behind OK). No medical or',
  '  clinical imagery. No text or logos in the image.',
  '- Each prompt is 1-2 sentences, descriptive, ready to feed an image',
  '  model — DO NOT include style cues like "photorealistic" or',
  '  "illustrated" in the prompt itself; the route appends those.',
  '- alt is a brief accessibility description (≤ 100 chars).',
].join('\n');

export type ImageStyle = 'photoreal' | 'editorial' | 'illustrative';
export interface ImageConcept { prompt: string; alt: string; style: ImageStyle }

// The route appends this rendering modifier before sending the prompt
// to fal — keeps the modifier authoritative on our side so we can tune
// it without re-prompting Claude.
export const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  photoreal:    'Render as cinematic documentary photography, real 35mm lens, natural golden-hour southwestern light, photorealistic, sharp focus, subtle film grain, no text, no logos.',
  editorial:    'Render as fine-art editorial photography in the New York Times Magazine style, high-contrast conceptual composition, single emblematic subject, muted desaturated palette with one accent colour, no text, no logos.',
  illustrative: 'Render as an editorial illustration in the style of The Atlantic / The New Yorker, flat geometric shapes, muted southwestern palette (terracotta, sand, sage), symbolic composition, gentle textures, no photographic detail, no text, no logos.',
};

export async function generateImageConcepts(bodyMarkdown: string, title: string): Promise<ImageConcept[]> {
  const userMsg = [
    `Post title: ${title}`,
    '',
    'Body:',
    '---',
    bodyMarkdown.trim().slice(0, 8000),
    '---',
    '',
    'Return the JSON of 10 concepts (4 photoreal + 3 editorial + 3 illustrative).',
  ].join('\n');
  const raw = await callClaude({ system: IMAGE_CONCEPTS_SYSTEM, user: userMsg, maxTokens: 2000 });
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(cleaned) as { concepts?: Partial<ImageConcept>[] };
  const list = Array.isArray(parsed.concepts) ? parsed.concepts : [];
  if (list.length === 0) throw new Error('Claude returned 0 image concepts');
  // Normalise + pad to 10, defaulting style to photoreal so a malformed
  // response never breaks the route.
  const normalised: ImageConcept[] = list
    .filter((c): c is ImageConcept => typeof c?.prompt === 'string')
    .map((c) => ({
      prompt: c.prompt,
      alt: typeof c.alt === 'string' ? c.alt : 'Seven Arrows Recovery editorial image',
      style: (c.style === 'editorial' || c.style === 'illustrative') ? c.style : 'photoreal',
    }));
  while (normalised.length < 10) {
    const last = normalised[normalised.length - 1];
    normalised.push({
      prompt: last?.prompt ?? 'serene southwestern landscape at golden hour',
      alt: last?.alt ?? 'Serene southwestern landscape',
      style: last?.style ?? 'photoreal',
    });
  }
  return normalised.slice(0, 10);
}

// ── Structured-data (JSON-LD) generation ─────────────────────────
//
// The public blog page already emits a schema.org/MedicalWebPage
// node (author, reviewer, publisher = Seven Arrows org). This adds
// the two schemas that benefit from per-post AI analysis:
//   1. FAQPage — 4-8 Q&As pulled from the body the post actually
//      answers, so Google's "People also ask" can cite them.
//   2. BlogPosting (Article subtype) — headline, summary, word
//      count, key topics. Useful for AI search engines that prefer
//      Article-typed nodes over MedicalWebPage.
// Stored in blogs.schema_json as { faq, article, generatedAt }.

export interface GeneratedSchema {
  faq: { question: string; answer: string }[];
  article: {
    headline: string;
    description: string;
    keywords: string[];
    wordCount: number;
    articleSection: string;
  };
}

const SCHEMA_SYSTEM = [
  'You are an SEO structured-data specialist. You read a published',
  'addiction-recovery blog post and output strict JSON-LD source data',
  'for schema.org enrichment. Your output is consumed by code, never',
  'shown to a human, so it MUST be valid JSON and nothing else.',
  '',
  'Output exactly one JSON object with this shape:',
  '{',
  '  "faq": [',
  '    { "question": "…", "answer": "…" },',
  '    …',
  '  ],',
  '  "article": {',
  '    "headline": "…",',
  '    "description": "…",',
  '    "keywords": ["…", "…"],',
  '    "wordCount": 0,',
  '    "articleSection": "…"',
  '  }',
  '}',
  '',
  'Rules:',
  '- 4 to 8 FAQs. Each question must be one the post actually answers.',
  '- Answer length: 40 to 90 words. Plain prose, no markdown, no lists.',
  '- description: a 140-180 character meta description for the post.',
  '- keywords: 5 to 10 short noun-phrase keywords this post targets.',
  '- articleSection: a 1-3 word topic category (e.g. "Recovery Roadmap",',
  '  "Family Support", "Detox & Withdrawal").',
  '- Output strict JSON only. No code fences, no commentary, no preamble.',
].join('\n');

export async function generateBlogSchema(args: {
  title: string;
  bodyMarkdown: string;
}): Promise<GeneratedSchema> {
  const userMsg = [
    `Title: ${args.title}`,
    '',
    'Body:',
    '---',
    args.bodyMarkdown.trim().slice(0, 12000),
    '---',
    '',
    'Return the JSON.',
  ].join('\n');
  const raw = await callClaude({ system: SCHEMA_SYSTEM, user: userMsg, maxTokens: 2500 });
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<GeneratedSchema>;
  const faqIn = Array.isArray(parsed.faq) ? parsed.faq : [];
  const faq = faqIn
    .filter((f): f is { question: string; answer: string } =>
      !!f && typeof f.question === 'string' && typeof f.answer === 'string')
    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
    .filter((f) => f.question.length > 0 && f.answer.length > 0)
    .slice(0, 8);
  if (faq.length === 0) throw new Error('Claude returned 0 FAQs');
  const articleIn = (parsed.article ?? {}) as Partial<GeneratedSchema['article']>;
  const article: GeneratedSchema['article'] = {
    headline: typeof articleIn.headline === 'string' ? articleIn.headline.trim() : args.title.trim(),
    description: typeof articleIn.description === 'string' ? articleIn.description.trim().slice(0, 220) : '',
    keywords: Array.isArray(articleIn.keywords)
      ? articleIn.keywords.filter((k): k is string => typeof k === 'string').map((k) => k.trim()).filter((k) => k.length > 0).slice(0, 12)
      : [],
    wordCount: typeof articleIn.wordCount === 'number' && articleIn.wordCount > 0
      ? Math.floor(articleIn.wordCount)
      : args.bodyMarkdown.trim().split(/\s+/).length,
    articleSection: typeof articleIn.articleSection === 'string' && articleIn.articleSection.trim().length > 0
      ? articleIn.articleSection.trim()
      : 'Recovery Roadmap',
  };
  return { faq, article };
}
