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
  '  rather than fabricated URLs — never invent links.',
  '- End with a one-sentence call-to-action linking the reader to',
  '  /admissions on sevenarrowsrecoveryarizona.com.',
  '',
  'Investigative angle: surface the *why* behind the topic — research,',
  'mechanisms, real-world tradeoffs — not just the *what*.',
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
  'You are revising a Seven Arrows Recovery blog post per the editor\'s',
  'instruction. Preserve the H1 title unless explicitly asked to change',
  'it. Preserve overall length unless asked to lengthen/shorten. Output',
  'the full revised Markdown post — no preamble, no diff, no commentary.',
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
  '  • hero { type, title, tagline?, image? { url, alt } }',
  '  • prose { type, markdown }       — a chunk of the original markdown',
  '  • image { type, url, alt, caption? }',
  '  • pull_quote { type, quote, attribution? }',
  '  • svg_icon { type, icon: "compass"|"leaf"|"mountain"|"sun"|"wave"|"arrow", heading?, body? }',
  '  • webgl_animation { type, scene: "particles"|"orbit"|"aurora", accent: "#hex" }',
  '  • callout { type, tone: "info"|"note"|"warning", heading, body }',
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
].join('\n');

export async function buildBlogLayout(args: {
  bodyMarkdown: string;
  title: string;
  images: { url: string; alt: string }[];
}): Promise<Layout> {
  const userMsg = [
    `Post title: ${args.title}`,
    '',
    'Approved markdown body:',
    '---',
    args.bodyMarkdown.trim(),
    '---',
    '',
    'Images to use (7 total):',
    ...args.images.map((img, i) => `${i + 1}. ${img.url} — alt: ${img.alt}`),
    '',
    'Return the JSON layout.',
  ].join('\n');
  const raw = await callClaude({ system: BUILD_SYSTEM, user: userMsg, maxTokens: 4000 });
  // Defensive: strip code fences if Claude wrapped the JSON anyway.
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Layout;
    if (!parsed || !Array.isArray(parsed.blocks)) throw new Error('layout missing blocks[]');
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse layout JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
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
