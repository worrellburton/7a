'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import SeoSubNav from '../SeoSubNav';

// Sitemap explorer. One button: "Run sitemap" hits
// /api/seo/sitemap/run which fetches and parses the live
// /sitemap.xml from sevenarrowsrecoveryarizona.com. Result renders
// as a searchable URL list plus a "Download .xml" link for the
// raw payload (useful for Search Console submissions or sharing
// with outside SEO consultants).

interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

interface CrawlSummary {
  origin: string;
  pages: string[];
  unfetched: string[];
  redirects: Array<{ from: string; to: string }>;
  warnings: string[];
  truncated: boolean;
  durationMs: number;
}

interface RunResult {
  runAt: string;
  sitemapUrl: string;
  type: 'urlset' | 'sitemapindex' | 'unknown';
  urls: string[];
  entries: SitemapEntry[];
  childSitemaps: string[];
  warnings: string[];
  rawXml: string | null;
  crawl: CrawlSummary;
  diff: {
    onlyCrawled: string[];
    onlyInSitemap: string[];
  };
}

export default function SitemapContent() {
  const { user, loading: authLoading } = useAuth();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [query, setQuery] = useState('');

  if (authLoading) return null;
  if (!user) return <div className="px-6 py-10 text-sm text-foreground/60">Sign in required.</div>;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/sitemap/run', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(json as RunResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  };

  const downloadXml = () => {
    if (!result?.rawXml) return;
    const blob = new Blob([result.rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date(result.runAt).toISOString().replace(/[:.]/g, '-');
    a.download = `sitemap-${stamp}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Lazy text filter — sitemaps are usually well under 5k entries
  // (we hard-cap at 5k server-side), so toLowerCase + filter is
  // plenty fast for client-side searching.
  const visible = (result?.urls ?? []).filter((u) =>
    query ? u.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <Link
          href="/feather/seo"
          className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1 mb-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          SEO
        </Link>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Sitemap
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
          Crawl the live <code className="text-[12px] font-mono">/sitemap.xml</code> on
          sevenarrowsrecoveryarizona.com and inspect every URL the search
          engines see. Download the raw XML to submit to Search Console or
          share with outside consultants.
        </p>
      </header>

      <SeoSubNav />

      <div className="rounded-xl border border-black/10 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            {running ? 'Running…' : 'Run sitemap'}
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={downloadXml}
                disabled={!result.rawXml}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-foreground/75 hover:border-primary/40 hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={result.rawXml ? 'Download the raw sitemap.xml' : 'Raw XML unavailable'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                </svg>
                Download .xml
              </button>
              <p className="text-[11px] text-foreground/55 ml-auto">
                Ran {new Date(result.runAt).toLocaleString()} · {result.urls.length} URL{result.urls.length === 1 ? '' : 's'}
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-rose-700">{error}</p>
        )}

        {result?.warnings.length ? (
          <ul className="mt-3 text-[11px] text-amber-800 space-y-0.5">
            {result.warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
          <SummaryCard
            label="Pages crawled"
            value={result.crawl.pages.length}
            sub={`${(result.crawl.durationMs / 1000).toFixed(1)}s · ${result.crawl.truncated ? 'truncated' : 'complete'}`}
            tone="emerald"
          />
          <SummaryCard
            label="In sitemap"
            value={result.urls.length}
            sub={result.type}
            tone="primary"
          />
          <SummaryCard
            label="Diff"
            value={result.diff.onlyCrawled.length + result.diff.onlyInSitemap.length}
            sub={
              result.diff.onlyCrawled.length === 0 && result.diff.onlyInSitemap.length === 0
                ? 'crawl matches sitemap'
                : `${result.diff.onlyCrawled.length} crawl-only · ${result.diff.onlyInSitemap.length} sitemap-only`
            }
            tone={
              result.diff.onlyCrawled.length === 0 && result.diff.onlyInSitemap.length === 0
                ? 'emerald'
                : 'amber'
            }
          />
        </div>
      )}

      {result && (result.diff.onlyCrawled.length > 0 || result.diff.onlyInSitemap.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800 mb-2">
            Sitemap ↔ crawl diff
          </p>
          {result.diff.onlyCrawled.length > 0 && (
            <div className="mb-3">
              <p className="text-[12px] font-semibold text-amber-900 mb-1">
                Reachable via link but missing from sitemap ({result.diff.onlyCrawled.length})
              </p>
              <ul className="text-[11px] text-amber-800/85 space-y-0.5 max-h-40 overflow-y-auto">
                {result.diff.onlyCrawled.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">{u}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.diff.onlyInSitemap.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-amber-900 mb-1">
                In sitemap but not reached during crawl ({result.diff.onlyInSitemap.length})
              </p>
              <p className="text-[10px] text-amber-700/80 mb-1">
                Often orphans — pages with no internal links pointing at them.
              </p>
              <ul className="text-[11px] text-amber-800/85 space-y-0.5 max-h-40 overflow-y-auto">
                {result.diff.onlyInSitemap.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">{u}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-black/5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter URLs…"
              className="flex-1 text-sm rounded-md border border-black/10 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-foreground/55 tabular-nums shrink-0">
              {visible.length} of {result.urls.length}
            </p>
          </div>
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-foreground/55">
              {result.urls.length === 0 ? 'Sitemap returned no URLs.' : 'No URLs match the current filter.'}
            </p>
          ) : (
            <ol className="divide-y divide-black/5 max-h-[70vh] overflow-y-auto">
              {visible.map((url, i) => {
                const entry = result.entries.find((e) => e.loc === url);
                const lastmod = entry?.lastmod ?? null;
                let path = url;
                try {
                  const u = new URL(url);
                  path = u.pathname + u.search + u.hash;
                } catch { /* keep raw */ }
                return (
                  <li key={url + i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[10px] tabular-nums text-foreground/40 w-10 shrink-0">
                      {i + 1}.
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate text-[13px] text-primary hover:underline"
                      title={url}
                    >
                      {path}
                    </a>
                    {lastmod && (
                      <span className="shrink-0 text-[10px] text-foreground/45 tabular-nums">
                        {new Date(lastmod).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {!result && !running && !error && (
        <div className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 p-10 text-center">
          <p className="text-sm text-foreground/60">
            Click <span className="font-semibold">Run sitemap</span> to fetch the
            live <code className="font-mono text-[12px]">sitemap.xml</code> from{' '}
            <span className="font-mono">sevenarrowsrecoveryarizona.com</span>. Results
            land here with a download button.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  tone: 'emerald' | 'primary' | 'amber';
}) {
  const valueClass =
    tone === 'emerald' ? 'text-emerald-700'
    : tone === 'amber' ? 'text-amber-700'
    : 'text-primary';
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${valueClass}`}>{value}</p>
      <p className="text-[11px] text-foreground/55 mt-0.5">{sub}</p>
    </div>
  );
}
