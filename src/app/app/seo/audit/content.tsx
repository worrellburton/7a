'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sa-seo-audit:last-result';

interface CategoryAudit {
  id: string;
  label: string;
  score: number;
  weight: number;
  passed: number;
  total: number;
  summary: string;
  issues: { url: string; severity: 'low' | 'medium' | 'high'; message: string }[];
}

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
  grade?: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  headline?: string;
  effectiveWeight?: number;
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
  categories: CategoryAudit[];
  insights?: {
    strengths: { title: string; detail: string; categoryId: string; score: number }[];
    weaknesses: {
      key: string;
      categoryId: string;
      category: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      count: number;
      examples: string[];
      impact: number;
    }[];
  };
  prompt?: string;
  strengths: { title: string; detail: string }[];
  issues: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[];
  notice?: string;
}

export default function AuditContent() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  // Restore the most recent audit from localStorage on mount so a
  // page refresh doesn't lose it. Server-side persistence ships once
  // the supabase/migrations/20260424_seo_audits.sql migration is
  // applied; until then this is the durability story.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuditResult;
      setResult(parsed);
    } catch {
      // Stale / corrupt — ignore silently.
    }
  }, []);

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
      const audit = json as AuditResult;
      setResult(audit);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audit));
      } catch {
        // Quota exceeded — non-fatal.
      }
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
        grade={result?.grade ?? null}
        headline={result?.headline ?? null}
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
          {result?.insights?.strengths.length || result?.strengths?.length ? (
            <ul className="space-y-3 text-sm">
              {(result?.insights?.strengths ?? []).map((s) => (
                <li key={s.categoryId}>
                  <span className="inline-block min-w-[44px] mr-2 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[11px] font-bold text-center">
                    {s.score}
                  </span>
                  <strong>{s.title}.</strong>{' '}
                  <span className="text-foreground/70">{s.detail}</span>
                </li>
              ))}
              {(result?.strengths ?? []).map((s) => (
                <li key={`legacy-${s.title}`}>
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
          {result?.insights?.weaknesses.length || result?.issues?.length ? (
            <ul className="space-y-3 text-sm">
              {(result?.insights?.weaknesses ?? []).slice(0, 12).map((w) => (
                <li key={w.key}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        w.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : w.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-black/5 text-foreground/60'
                      }`}
                    >
                      {w.severity}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-foreground/50">
                      {w.category}
                    </span>
                    {w.count > 1 ? (
                      <span className="text-[10px] text-foreground/50">
                        ({w.count} pages)
                      </span>
                    ) : null}
                  </div>
                  <p className="text-foreground/80">{w.message}</p>
                  {w.examples.length > 0 && w.count > 1 ? (
                    <details className="mt-1">
                      <summary className="text-[11px] text-foreground/50 cursor-pointer hover:text-foreground/80">
                        Examples
                      </summary>
                      <ul className="mt-1 ml-4 text-[11px] text-foreground/60 space-y-0.5">
                        {w.examples.map((u) => (
                          <li key={u} className="truncate">
                            <a
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-primary"
                            >
                              {prettyPath(u)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ))}
              {(result?.issues ?? []).map((i) => (
                <li key={`legacy-${i.title}`}>
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

      {result?.categories && result.categories.length > 0 ? (
        <Panel title="Audit categories" className="mt-6">
          <div className="space-y-3">
            {result.categories.map((c) => {
              const counted = c.weight > 0 && c.total > 0;
              const color = !counted
                ? 'bg-black/10'
                : c.score >= 90
                  ? 'bg-emerald-500'
                  : c.score >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500';
              const txt = !counted
                ? 'text-foreground/40'
                : c.score >= 90
                  ? 'text-emerald-600'
                  : c.score >= 70
                    ? 'text-amber-600'
                    : 'text-red-600';
              return (
                <div
                  key={c.id}
                  className="border-b border-black/5 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="min-w-[180px] text-sm font-semibold text-foreground">
                      {c.label}
                    </span>
                    <span className={`min-w-[60px] text-sm font-bold ${txt}`}>
                      {counted ? `${c.score}/100` : 'skipped'}
                    </span>
                    <span className="text-[11px] text-foreground/50 min-w-[80px]">
                      {counted ? `weight ${c.weight}` : ''}
                    </span>
                    <span className="text-xs text-foreground/60 flex-1">
                      {c.summary}
                    </span>
                  </div>
                  {counted ? (
                    <div className="mt-2 ml-[180px] h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${Math.max(2, c.score)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

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

      <ClaudePromptPanel prompt={result?.prompt ?? null} running={running} />
    </div>
  );
}

function ClaudePromptPanel({
  prompt,
  running,
}: {
  prompt: string | null;
  running: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea contents.
      const ta = document.getElementById('audit-claude-prompt') as HTMLTextAreaElement | null;
      if (ta) {
        ta.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <Panel title="Generate Claude prompt" className="mt-6">
      {prompt ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-foreground/60">
              Paste this into Claude (or Claude Code) to push the score to 100.
            </p>
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <textarea
            id="audit-claude-prompt"
            readOnly
            value={prompt}
            className="w-full h-72 rounded-lg border border-black/10 bg-warm-bg/30 p-3 font-mono text-[11px] text-foreground/80 leading-relaxed resize-y"
          />
        </div>
      ) : (
        <Empty>
          {running
            ? 'Building prompt…'
            : 'After an audit completes, this section will produce a copy-pasteable prompt you can drop into Claude to bring the score to 100.'}
        </Empty>
      )}
    </Panel>
  );
}

function ScoreCard({
  score,
  grade,
  headline,
  running,
  onRun,
  ranAt,
  durationMs,
}: {
  score: number | null;
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+' | null;
  headline: string | null;
  running: boolean;
  onRun: () => void;
  ranAt: string | null;
  durationMs: number | null;
}) {
  const color =
    score == null
      ? 'text-foreground/30'
      : score >= 90
        ? 'text-emerald-600'
        : score >= 75
          ? 'text-amber-600'
          : 'text-red-600';

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 flex items-center gap-8">
      <div className="flex flex-col items-center">
        <div className={`text-7xl font-bold leading-none ${color}`}>
          {score ?? '—'}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mt-2">
          out of 100
          {grade ? <span className="ml-1 text-foreground/70">· {grade}</span> : null}
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-foreground mb-1">SEO score</h2>
        <p className="text-sm text-foreground/60">
          {headline ??
            'A weighted score across titles, meta, headings, schema, links, images, performance, and crawlability.'}
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
