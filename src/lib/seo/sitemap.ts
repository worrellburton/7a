// Sitemap fetcher + parser.
//
// Handles both sitemap-index (<sitemapindex>) and urlset (<urlset>) formats,
// follows HTTP redirects (e.g. /sitemap.xml → /sitemap_index.xml on the
// WordPress live site), and recursively expands index entries up to a small
// depth so a malicious or misconfigured site can't trigger unbounded fanout.
//
// Dependency-free: sitemap XML is constrained to a few elements, so a tight
// regex is correct and avoids pulling in a parser.

const LOC_RE = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi;
const LASTMOD_RE = /<lastmod>\s*([^<\s][^<]*?)\s*<\/lastmod>/gi;

const FETCH_TIMEOUT_MS = 10_000;
const MAX_INDEX_DEPTH = 3;
const MAX_TOTAL_URLS = 5_000;

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

export interface SitemapResult {
  /** The URL we ultimately resolved to (after following redirects). */
  url: string;
  /** Final type of the document we parsed. */
  type: 'urlset' | 'sitemapindex' | 'unknown';
  /** Flat list of every page URL discovered (index entries fully expanded). */
  urls: string[];
  /** Per-URL lastmod where the sitemap provided one. Same length / order as `urls`. */
  entries: SitemapEntry[];
  /** Sub-sitemaps discovered when the root document is a <sitemapindex>. */
  childSitemaps: string[];
  /** Non-fatal warnings (e.g. a child sitemap that 404'd). */
  warnings: string[];
}

async function fetchText(url: string): Promise<{ status: number; finalUrl: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SevenArrowsAuditBot/1.0 (+https://sevenarrowsrecoveryarizona.com)',
        Accept: 'application/xml, text/xml, */*;q=0.5',
      },
      cache: 'no-store',
    });
    const text = await res.text();
    return { status: res.status, finalUrl: res.url || url, text };
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(LOC_RE)) {
    const raw = decodeXmlEntities(m[1]);
    if (raw) out.push(raw);
  }
  return out;
}

function extractEntries(xml: string): SitemapEntry[] {
  // Walk <url>…</url> blocks so loc + lastmod stay paired even when one is
  // missing. (The flat regex pass above is fine for "give me every loc",
  // but pairing requires per-block scanning.)
  const out: SitemapEntry[] = [];
  const blockRe = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
  for (const block of xml.matchAll(blockRe)) {
    const inner = block[1];
    const locMatch = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/i.exec(inner);
    const lastmodMatch = /<lastmod>\s*([^<\s][^<]*?)\s*<\/lastmod>/i.exec(inner);
    if (!locMatch) continue;
    out.push({
      loc: decodeXmlEntities(locMatch[1]),
      lastmod: lastmodMatch ? decodeXmlEntities(lastmodMatch[1]) : null,
    });
  }
  return out;
}

function extractIndexLocs(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const blockRe = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
  for (const block of xml.matchAll(blockRe)) {
    const inner = block[1];
    const locMatch = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/i.exec(inner);
    const lastmodMatch = /<lastmod>\s*([^<\s][^<]*?)\s*<\/lastmod>/i.exec(inner);
    if (!locMatch) continue;
    out.push({
      loc: decodeXmlEntities(locMatch[1]),
      lastmod: lastmodMatch ? decodeXmlEntities(lastmodMatch[1]) : null,
    });
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function detectType(xml: string): SitemapResult['type'] {
  if (/<sitemapindex\b/i.test(xml)) return 'sitemapindex';
  if (/<urlset\b/i.test(xml)) return 'urlset';
  // Some servers return text/html error pages; treat as unknown.
  return 'unknown';
}

export async function fetchSitemap(rootUrl: string): Promise<SitemapResult> {
  const visited = new Set<string>();
  const warnings: string[] = [];
  const allEntries: SitemapEntry[] = [];
  const childSitemaps: string[] = [];

  let resolvedRoot = rootUrl;
  let resolvedType: SitemapResult['type'] = 'unknown';

  async function walk(url: string, depth: number): Promise<void> {
    if (depth > MAX_INDEX_DEPTH) {
      warnings.push(`Stopped recursing at depth ${depth}: ${url}`);
      return;
    }
    if (visited.has(url)) return;
    visited.add(url);

    let res;
    try {
      res = await fetchText(url);
    } catch (err) {
      warnings.push(
        `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }
    if (res.status >= 400) {
      warnings.push(`HTTP ${res.status} from ${url}`);
      return;
    }

    const type = detectType(res.text);
    if (depth === 0) {
      resolvedRoot = res.finalUrl;
      resolvedType = type;
    }

    if (type === 'sitemapindex') {
      const children = extractIndexLocs(res.text);
      for (const c of children) {
        childSitemaps.push(c.loc);
        if (allEntries.length >= MAX_TOTAL_URLS) {
          warnings.push(`URL cap (${MAX_TOTAL_URLS}) reached — stopped expanding child sitemaps.`);
          return;
        }
        await walk(c.loc, depth + 1);
      }
    } else if (type === 'urlset') {
      const entries = extractEntries(res.text);
      for (const e of entries) {
        if (allEntries.length >= MAX_TOTAL_URLS) {
          warnings.push(`URL cap (${MAX_TOTAL_URLS}) reached.`);
          break;
        }
        allEntries.push(e);
      }
    } else {
      warnings.push(`Unknown sitemap format at ${url}`);
    }
  }

  await walk(rootUrl, 0);

  // Dedupe URLs while preserving first-seen order.
  const seen = new Set<string>();
  const dedupedEntries: SitemapEntry[] = [];
  for (const e of allEntries) {
    if (seen.has(e.loc)) continue;
    seen.add(e.loc);
    dedupedEntries.push(e);
  }

  return {
    url: resolvedRoot,
    type: resolvedType,
    urls: dedupedEntries.map((e) => e.loc),
    entries: dedupedEntries,
    childSitemaps,
    warnings,
  };
}

/**
 * Try common sitemap locations in order until one returns a valid document.
 */
export async function discoverSitemap(origin: string): Promise<SitemapResult> {
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
  let lastErr: string | null = null;

  for (const path of candidates) {
    const url = origin.replace(/\/$/, '') + path;
    try {
      const res = await fetchSitemap(url);
      if (res.urls.length > 0 || res.type !== 'unknown') return res;
      lastErr = `${path} returned ${res.urls.length} URLs (type=${res.type})`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`No sitemap found at ${origin}: ${lastErr ?? 'unknown error'}`);
}

// Caps exported so the API route can surface them.
export const SITEMAP_LIMITS = {
  MAX_TOTAL_URLS,
  MAX_INDEX_DEPTH,
};

// ── Live-site crawler ─────────────────────────────────────────────
//
// BFS through every internal link starting at the origin. Follows
// only same-host http(s) URLs, skips fragment-only links and
// non-document file extensions, and caps total fetched pages so a
// stuck loop can't run forever. Used by the Sitemap admin tool to
// verify that the auto-generated /sitemap.xml matches the actual
// reachable page graph on production.

const CRAWL_FETCH_TIMEOUT_MS = 8_000;
const CRAWL_MAX_PAGES = 250;
const CRAWL_BUDGET_MS = 55_000; // leave headroom inside Vercel's 60s function cap

const SKIP_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|webp|avif|ico|pdf|zip|mp4|mov|webm|mp3|wav|css|js|map|xml|json|txt)(?:[?#]|$)/i;

const ANCHOR_RE = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;

export interface CrawlResult {
  origin: string;
  /** Pages we successfully fetched a 2xx HTML response for. */
  pages: string[];
  /** URLs we discovered but didn't fetch (cap reached / budget out / non-2xx). */
  unfetched: string[];
  /** Internal redirects encountered (from → to), surfaced so admins can clean them up. */
  redirects: Array<{ from: string; to: string }>;
  /** Per-URL HTTP status (only present for fetched URLs). */
  statuses: Record<string, number>;
  warnings: string[];
  /** True when we hit the page or time budget — list may be incomplete. */
  truncated: boolean;
  /** Wall-clock duration of the crawl in ms. */
  durationMs: number;
}

function normalizeForCrawl(href: string, base: string, origin: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.origin !== origin) return null;
    if (SKIP_EXTENSIONS.test(u.pathname + u.search)) return null;
    // Strip fragment — same page from a sitemap perspective.
    u.hash = '';
    // Normalize trailing slash on root only; keep the rest as-is so
    // /a and /a/ don't collapse if the site cares about the
    // distinction.
    return u.toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = ANCHOR_RE.exec(html)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (!raw) continue;
    out.push(raw.trim());
  }
  return out;
}

async function fetchHtml(url: string): Promise<{ status: number; finalUrl: string; html: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWL_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SevenArrowsAuditBot/1.0 (+https://sevenarrowsrecoveryarizona.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });
    const finalUrl = res.url || url;
    if (!res.ok) return { status: res.status, finalUrl, html: null };
    const ct = res.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('html')) return { status: res.status, finalUrl, html: null };
    const html = await res.text();
    return { status: res.status, finalUrl, html };
  } catch {
    return { status: 0, finalUrl: url, html: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlSite(rootUrl: string): Promise<CrawlResult> {
  const startedAt = Date.now();
  const root = new URL(rootUrl);
  const origin = root.origin;
  const start = root.toString();

  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const pages = new Set<string>();
  const unfetched = new Set<string>();
  const redirects: Array<{ from: string; to: string }> = [];
  const statuses: Record<string, number> = {};
  const warnings: string[] = [];
  let truncated = false;

  while (queue.length > 0) {
    if (Date.now() - startedAt > CRAWL_BUDGET_MS) {
      truncated = true;
      warnings.push(`Crawl time budget (${CRAWL_BUDGET_MS}ms) exceeded — list may be incomplete.`);
      // Anything still queued counts as unfetched.
      for (const q of queue) unfetched.add(q);
      break;
    }
    if (pages.size >= CRAWL_MAX_PAGES) {
      truncated = true;
      warnings.push(`Page cap (${CRAWL_MAX_PAGES}) reached — list may be incomplete.`);
      for (const q of queue) unfetched.add(q);
      break;
    }
    const url = queue.shift()!;
    const { status, finalUrl, html } = await fetchHtml(url);
    statuses[url] = status;

    if (finalUrl !== url) {
      redirects.push({ from: url, to: finalUrl });
      // Re-key status onto the canonical URL too.
      statuses[finalUrl] = status;
      if (!visited.has(finalUrl)) visited.add(finalUrl);
    }

    if (status === 0) {
      warnings.push(`Fetch failed (timeout / network) for ${url}`);
      unfetched.add(url);
      continue;
    }
    if (status < 200 || status >= 300 || !html) {
      unfetched.add(finalUrl);
      continue;
    }
    pages.add(finalUrl);

    for (const raw of extractLinks(html)) {
      const next = normalizeForCrawl(raw, finalUrl, origin);
      if (!next) continue;
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return {
    origin,
    pages: Array.from(pages).sort(),
    unfetched: Array.from(unfetched).sort(),
    redirects,
    statuses,
    warnings,
    truncated,
    durationMs: Date.now() - startedAt,
  };
}
