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
