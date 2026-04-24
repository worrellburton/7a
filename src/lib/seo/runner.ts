// Bulk crawl runner.
//
// Walks a list of URLs with a fixed concurrency cap and a hard URL limit
// so a misconfigured giant sitemap can't blow the function timeout. Skips
// non-HTML resources up front (PDF, images, JSON files in the sitemap).

import { crawlPage, type CrawledPage } from './crawl';

const SKIP_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  '.mp4', '.mov', '.webm', '.mp3', '.wav',
  '.zip', '.gz', '.tar', '.json', '.xml',
];

export interface CrawlAllOptions {
  /** Hard cap on URLs crawled (defaults to 100). */
  maxPages?: number;
  /** Parallel in-flight requests (defaults to 6). */
  concurrency?: number;
  /** Optional per-page hook for streaming progress (not used yet). */
  onPage?: (page: CrawledPage, index: number, total: number) => void;
}

export interface CrawlAllResult {
  pages: CrawledPage[];
  /** URLs that we deliberately skipped (file extensions, etc.). */
  skipped: { url: string; reason: string }[];
  /** URLs trimmed because of the maxPages cap. */
  trimmed: number;
  totalMs: number;
}

function shouldSkip(url: string): string | null {
  let lower = url.toLowerCase();
  try {
    lower = new URL(url).pathname.toLowerCase();
  } catch {
    /* fall through with raw lower */
  }
  for (const ext of SKIP_EXTENSIONS) {
    if (lower.endsWith(ext)) return `extension ${ext}`;
  }
  return null;
}

/**
 * Crawl `urls` with bounded concurrency. Order of results matches order
 * of input URLs (after skip-filtering and capping).
 */
export async function crawlAll(
  urls: string[],
  opts: CrawlAllOptions = {},
): Promise<CrawlAllResult> {
  const maxPages = Math.max(1, Math.min(500, opts.maxPages ?? 100));
  const concurrency = Math.max(1, Math.min(20, opts.concurrency ?? 6));
  const startedAt = Date.now();

  const skipped: { url: string; reason: string }[] = [];
  const accepted: string[] = [];
  for (const url of urls) {
    const reason = shouldSkip(url);
    if (reason) {
      skipped.push({ url, reason });
      continue;
    }
    accepted.push(url);
  }
  const trimmed = Math.max(0, accepted.length - maxPages);
  const work = accepted.slice(0, maxPages);

  const results = new Array<CrawledPage | null>(work.length).fill(null);
  let next = 0;

  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= work.length) return;
      const url = work[idx];
      const page = await crawlPage(url);
      results[idx] = page;
      if (opts.onPage) {
        try {
          opts.onPage(page, idx, work.length);
        } catch {
          // ignore hook failures
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    pages: results.filter((p): p is CrawledPage => p != null),
    skipped,
    trimmed,
    totalMs: Date.now() - startedAt,
  };
}
