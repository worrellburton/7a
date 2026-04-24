// Per-URL HTML crawler.
//
// Fetches a single page and extracts the SEO-relevant signals: title,
// meta description, canonical, robots, lang, headings, Open Graph,
// Twitter cards, JSON-LD blocks, internal/external link counts, image
// counts (with/without alt), and the response timing / status / final
// URL after redirects.
//
// Dependency-free regex parsing. HTML is messy in the wild, but for the
// fields we care about (single-tag <title>, <link>, <meta>, <h1>/<h2>,
// <a>, <img>, <script type="application/ld+json">) regex is robust enough
// when written carefully and is far cheaper than spinning up a DOM.

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000; // 2 MB cap per page

export interface CrawledImage {
  src: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  loading: string | null;
}

export interface CrawledLink {
  href: string;
  rel: string | null;
  internal: boolean;
}

export interface CrawledPage {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  redirected: boolean;
  /** Round-trip ms for the network fetch. */
  fetchMs: number;
  /** Size in bytes (post-redirect, pre-truncation). */
  bytes: number;
  truncated: boolean;
  /** Raw HTML (capped to MAX_BYTES). null when fetch failed before body. */
  html: string | null;

  // --- extracted fields ---
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonical: string | null;
  lang: string | null;
  charset: string | null;
  viewport: string | null;

  h1: string[];
  h2: string[];

  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: unknown[];

  imageCount: number;
  imagesMissingAlt: number;
  images: CrawledImage[];

  internalLinkCount: number;
  externalLinkCount: number;
  links: CrawledLink[];

  /** Non-fatal warnings (parse glitches, oversize, etc.). */
  warnings: string[];
  /** Hard error if the fetch itself failed. */
  error: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(tag);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  return decodeEntities(stripTags(m[1])) || null;
}

function extractMetas(html: string): {
  description: string | null;
  robots: string | null;
  viewport: string | null;
  charset: string | null;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
} {
  const og: Record<string, string> = {};
  const tw: Record<string, string> = {};
  let description: string | null = null;
  let robots: string | null = null;
  let viewport: string | null = null;
  let charset: string | null = null;

  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const charsetAttr = attr(tag, 'charset');
    if (charsetAttr) charset = charsetAttr;
    const name = (attr(tag, 'name') || '').toLowerCase();
    const property = (attr(tag, 'property') || '').toLowerCase();
    const content = attr(tag, 'content');
    if (!content) continue;

    if (name === 'description') description = content;
    else if (name === 'robots') robots = content.toLowerCase();
    else if (name === 'viewport') viewport = content;
    else if (property.startsWith('og:')) og[property] = content;
    else if (name.startsWith('twitter:')) tw[name] = content;
    else if (property.startsWith('twitter:')) tw[property] = content;
  }
  return { description, robots, viewport, charset, openGraph: og, twitter: tw };
}

function extractCanonical(html: string): string | null {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    if (rel === 'canonical') {
      return attr(tag, 'href');
    }
  }
  return null;
}

function extractLangAndHead(html: string): { lang: string | null } {
  const m = /<html\b([^>]*)>/i.exec(html);
  if (!m) return { lang: null };
  return { lang: attr(`<html ${m[1]}>`, 'lang') };
}

function extractHeadings(html: string, level: 1 | 2): string[] {
  const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
  const out: string[] = [];
  for (const m of html.matchAll(re)) {
    const text = decodeEntities(stripTags(m[1]));
    if (text) out.push(text);
  }
  return out;
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Some sites wrap JSON-LD in HTML comments / CDATA — try a quick clean.
      const cleaned = raw.replace(/^<!--/, '').replace(/-->$/, '').replace(/^\/\*<!\[CDATA\[\*\//, '').replace(/\/\*\]\]>\*\/$/, '').trim();
      try {
        out.push(JSON.parse(cleaned));
      } catch {
        out.push({ __unparsable: true, snippet: raw.slice(0, 120) });
      }
    }
  }
  return out;
}

function extractImages(html: string): CrawledImage[] {
  const out: CrawledImage[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = attr(tag, 'src') || attr(tag, 'data-src');
    if (!src) continue;
    out.push({
      src,
      alt: attr(tag, 'alt'),
      width: attr(tag, 'width'),
      height: attr(tag, 'height'),
      loading: attr(tag, 'loading'),
    });
  }
  return out;
}

function extractLinks(html: string, originHost: string): CrawledLink[] {
  const out: CrawledLink[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = attr(tag, 'href');
    if (!href) continue;
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }
    let internal = false;
    try {
      const u = new URL(href, `https://${originHost}`);
      internal = u.host === originHost;
    } catch {
      internal = href.startsWith('/');
    }
    out.push({ href, rel: attr(tag, 'rel'), internal });
  }
  return out;
}

export async function crawlPage(url: string): Promise<CrawledPage> {
  const startedAt = Date.now();
  const base: CrawledPage = {
    url,
    finalUrl: url,
    status: 0,
    ok: false,
    redirected: false,
    fetchMs: 0,
    bytes: 0,
    truncated: false,
    html: null,
    title: null,
    metaDescription: null,
    metaRobots: null,
    canonical: null,
    lang: null,
    charset: null,
    viewport: null,
    h1: [],
    h2: [],
    openGraph: {},
    twitter: {},
    jsonLd: [],
    imageCount: 0,
    imagesMissingAlt: 0,
    images: [],
    internalLinkCount: 0,
    externalLinkCount: 0,
    links: [],
    warnings: [],
    error: null,
  };

  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    base.error = 'Invalid URL';
    return base;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SevenArrowsAuditBot/1.0 (+https://sevenarrowsrecoveryarizona.com)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });
    base.status = res.status;
    base.ok = res.ok;
    base.finalUrl = res.url || url;
    base.redirected = base.finalUrl !== url;

    const reader = res.body?.getReader();
    if (!reader) {
      base.error = 'Empty response body';
      return base;
    }
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let truncated = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.length;
      if (bytes > MAX_BYTES) {
        truncated = true;
        // Keep what we have but stop reading.
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      chunks.push(value);
    }
    base.bytes = bytes;
    base.truncated = truncated;
    if (truncated) base.warnings.push(`Body truncated at ${MAX_BYTES} bytes`);

    const merged = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(merged);
    base.html = html;

    const { lang } = extractLangAndHead(html);
    base.lang = lang;
    base.title = extractTitle(html);
    const metas = extractMetas(html);
    base.metaDescription = metas.description;
    base.metaRobots = metas.robots;
    base.viewport = metas.viewport;
    base.charset = metas.charset;
    base.openGraph = metas.openGraph;
    base.twitter = metas.twitter;
    base.canonical = extractCanonical(html);
    base.h1 = extractHeadings(html, 1);
    base.h2 = extractHeadings(html, 2);
    base.jsonLd = extractJsonLd(html);
    base.images = extractImages(html);
    base.imageCount = base.images.length;
    base.imagesMissingAlt = base.images.filter((i) => i.alt == null || i.alt.trim() === '').length;
    base.links = extractLinks(html, host);
    base.internalLinkCount = base.links.filter((l) => l.internal).length;
    base.externalLinkCount = base.links.length - base.internalLinkCount;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
    base.fetchMs = Date.now() - startedAt;
  }

  return base;
}

export const CRAWL_LIMITS = {
  FETCH_TIMEOUT_MS,
  MAX_BYTES,
};
