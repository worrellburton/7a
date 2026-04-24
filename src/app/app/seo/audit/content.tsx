'use client';

import Link from 'next/link';
import { useState } from 'react';

interface HomepageSummary {
  url: string;
  finalUrl: string;
  status: number;
  fetchMs: number;
  bytes: number;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  lang: string | null;
  h1Count: number;
  h1: string[];
  h2Count: number;
  ogTags: number;
  twitterTags: number;
  jsonLdBlocks: number;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinkCount: number;
  externalLinkCount: number;
  warnings: string[];
}

interface AuditResult {
  origin: string;
  score: number | null;
  ranAt: string;
  durationMs: number;
  sitemap: {
    url: string;
    type?: string;
    urls: string[];
    count: number;
    childSitemaps?: string[];
    warnings?: string[];
  } | null;
  homepage?: HomepageSummary | null;
  crawl?: {
    crawled: number;
    ok: number;
    errors: number;
    skipped: number;
    trimmed: number;
    totalMs: number;
    avgFetchMs: number;
  } | null;
  pages: unknown[];
  categories: Record<string, unknown>;
  strengths: { title: string; detail: string }[];
  issues: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[];
  notice?: string;
}

export default function AuditContent() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function runAudit() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setResult(json as AuditResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <Link
            href="/app/seo"
            className="text-xs text-foreground/50 hover:text-foreground transition"
          >
            ← SEO
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">Site audit</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Crawls the live site, scores it 0–100 against modern SEO criteria, and
            generates a paste-ready prompt to push the score to 100. No Google
            Search Console required — this audit reads the site directly.
          </p>
        </div>
      </div>

      <ScoreCard
        score={result?.score ?? null}
        running={running}
        onRun={runAudit}
        ranAt={result?.ranAt ?? null}
        durationMs={result?.durationMs ?? null}
      />

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Audit failed:</strong> {error}
        </div>
      ) : null}

      {result?.notice ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {result.notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Panel title="What's working">
          {result?.strengths?.length ? (
            <ul className="space-y-2 text-sm">
              {result.strengths.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}.</strong>{' '}
                  <span className="text-foreground/70">{s.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{running ? 'Running…' : 'Run an audit to see the strengths.'}</Empty>
          )}
        </Panel>
        <Panel title="What's not">
          {result?.issues?.length ? (
            <ul className="space-y-2 text-sm">
              {result.issues.map((i) => (
                <li key={i.title}>
                  <strong>{i.title}.</strong>{' '}
                  <span className="text-foreground/70">{i.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {running ? 'Running…' : "Run an audit to see what's holding the score down."}
            </Empty>
          )}
        </Panel>
      </div>

      {result?.crawl ? (
        <Panel title="Crawl summary" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Pages crawled" value={result.crawl.crawled.toLocaleString()} />
            <Stat
              label="200 OK"
              value={`${result.crawl.ok} / ${result.crawl.crawled}`}
            />
            <Stat label="Errors" value={result.crawl.errors.toLocaleString()} />
            <Stat label="Avg latency" value={`${result.crawl.avgFetchMs} ms`} />
          </div>
          {result.crawl.trimmed > 0 ? (
            <p className="mt-3 text-[11px] text-foreground/50">
              {result.crawl.trimmed} URLs not crawled this run (over 100-page cap).
            </p>
          ) : null}
        </Panel>
      ) : null}

      {result?.homepage ? (
        <Panel title="Homepage extract" className="mt-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Title">{result.homepage.title || <Missing />}</Row>
            <Row label="Meta description">{result.homepage.metaDescription || <Missing />}</Row>
            <Row label="Canonical">{result.homepage.canonical || <Missing />}</Row>
            <Row label="Lang">{result.homepage.lang || <Missing />}</Row>
            <Row label="H1 / H2">
              {result.homepage.h1Count} / {result.homepage.h2Count}
            </Row>
            <Row label="Images (missing alt)">
              {result.homepage.imageCount} ({result.homepage.imagesMissingAlt})
            </Row>
            <Row label="Internal / external links">
              {result.homepage.internalLinkCount} / {result.homepage.externalLinkCount}
            </Row>
            <Row label="OG / Twitter / JSON-LD">
              {result.homepage.ogTags} / {result.homepage.twitterTags} /{' '}
              {result.homepage.jsonLdBlocks}
            </Row>
            <Row label="Status / latency / bytes">
              HTTP {result.homepage.status} · {result.homepage.fetchMs}ms ·{' '}
              {result.homepage.bytes.toLocaleString()} B
            </Row>
          </dl>
        </Panel>
      ) : null}

      <Panel title="Sitemap" className="mt-6">
        {result?.sitemap ? (
          <div className="text-sm">
            <p className="text-foreground/70 mb-3">
              <strong>{result.sitemap.count}</strong> URLs from{' '}
              <a
                href={result.sitemap.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted text-foreground hover:text-primary"
              >
                {result.sitemap.url}
              </a>
              {result.sitemap.type ? (
                <span className="ml-2 text-[11px] uppercase tracking-wider text-foreground/40">
                  {result.sitemap.type}
                </span>
              ) : null}
            </p>
            {result.sitemap.childSitemaps && result.sitemap.childSitemaps.length > 0 ? (
              <div className="mb-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50 mb-1">
                  Child sitemaps
                </p>
                <ul className="text-xs text-foreground/70 space-y-1">
                  {result.sitemap.childSitemaps.map((c) => (
                    <li key={c} className="truncate">{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50 mb-1">
                Pages ({result.sitemap.count})
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-black/5 bg-warm-bg/30 divide-y divide-black/5">
                {result.sitemap.urls.slice(0, 200).map((u) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-3 py-1.5 text-xs text-foreground/80 hover:bg-white truncate"
                    title={u}
                  >
                    {prettyPath(u)}
                  </a>
                ))}
                {result.sitemap.urls.length > 200 ? (
                  <p className="px-3 py-1.5 text-[11px] text-foreground/50">
                    + {result.sitemap.urls.length - 200} more
                  </p>
                ) : null}
              </div>
            </div>
            {result.sitemap.warnings && result.sitemap.warnings.length > 0 ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                <p className="font-semibold mb-1">Warnings</p>
                <ul className="space-y-0.5">
                  {result.sitemap.warnings.map((w, i) => (
                    <li key={i}>· {w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <Empty>{running ? 'Loading…' : 'Run an audit to load the live sitemap.'}</Empty>
        )}
      </Panel>

      <Panel title="Generate Claude prompt" className="mt-6">
        <Empty>
          After an audit completes, this section will produce a copy-pasteable
          prompt you can drop into Claude to bring the score to 100.
        </Empty>
      </Panel>
    </div>
  );
}

function ScoreCard({
  score,
  running,
  onRun,
  ranAt,
  durationMs,
}: {
  score: number | null;
  running: boolean;
  onRun: () => void;
  ranAt: string | null;
  durationMs: number | null;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 flex items-center gap-8">
      <div className="flex flex-col items-center">
        <div className="text-7xl font-bold text-foreground/30 leading-none">
          {score ?? '—'}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mt-2">
          out of 100
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-foreground mb-1">SEO score</h2>
        <p className="text-sm text-foreground/60">
          A weighted score across titles, meta, headings, schema, links, images,
          performance, and crawlability.
        </p>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Running audit…' : score == null ? 'Run audit' : 'Re-run audit'}
        </button>
        {ranAt ? (
          <p className="mt-2 text-[11px] text-foreground/40">
            Last run {new Date(ranAt).toLocaleString()}
            {typeof durationMs === 'number' ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-warm-bg/30 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-black/5 pb-2">
      <dt className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50 min-w-[140px]">
        {label}
      </dt>
      <dd className="text-foreground/80 truncate">{children}</dd>
    </div>
  );
}

function Missing() {
  return <span className="text-red-600">missing</span>;
}

function prettyPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-6 ${className}`}>
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
      {children}
    </div>
  );
}
