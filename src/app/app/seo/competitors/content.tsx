'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Competitors — for each keyword, the current top-10 organic
// SERP plus the snapshot from ~7 days prior, side by side, with
// "jumped us" / "we jumped" deltas highlighted. Source data is
// seo_competitor_serps which the rank route fills on every sweep
// (no extra SerpAPI calls needed here).

interface Row {
  keyword_id: string;
  keyword_text: string;
  position: number;
  url: string;
  domain: string;
  title: string | null;
  snippet: string | null;
  is_us: boolean;
  checked_at: string;
}

interface KeywordCompetitors {
  id: string;
  text: string;
  latest_checked_at: string | null;
  current: Row[];
  previous: Row[];
}

interface ApiResponse {
  keywords: KeywordCompetitors[];
}

export default function CompetitorsContent() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/competitors', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setData(json as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    let coveredKeywords = 0;
    let weJumpedCount = 0;
    let jumpedUsCount = 0;
    for (const k of data?.keywords ?? []) {
      if (k.current.length === 0) continue;
      coveredKeywords += 1;
      const prevByDomain = new Map(k.previous.map((r) => [r.domain, r.position] as const));
      for (const r of k.current) {
        const prev = prevByDomain.get(r.domain);
        if (prev == null) continue;
        if (r.position < prev) {
          // moved up = lower position number
          if (r.is_us) weJumpedCount += 1;
          else jumpedUsCount += 1; // a competitor moved up
        }
      }
    }
    return { coveredKeywords, weJumpedCount, jumpedUsCount };
  }, [data]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Competitors
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Top-10 organic SERPs for every curated keyword, with last
            week&apos;s snapshot beside the current one so the team
            sees who jumped us at a glance. Data is captured on every
            keyword-rank sweep — no extra SerpAPI cost.
          </p>
        </div>
        <Link
          href="/app/seo"
          className="text-[12px] font-semibold text-primary hover:underline"
        >
          Run new sweep on Overview →
        </Link>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t load competitors:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Keywords with data" value={stats.coveredKeywords} />
        <Stat label="We jumped (last 7d)" value={stats.weJumpedCount} accent="emerald" />
        <Stat label="Jumped us (last 7d)" value={stats.jumpedUsCount} accent="rose" />
      </div>

      {loading ? (
        <p className="text-sm text-foreground/55 py-10 text-center">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {(data?.keywords ?? []).map((k) => {
            const open = expanded.has(k.id);
            const ourPos = k.current.find((r) => r.is_us)?.position ?? null;
            const prevByDomain = new Map(k.previous.map((r) => [r.domain, r.position] as const));
            return (
              <li key={k.id} className="rounded-xl border border-black/10 bg-white">
                <button
                  type="button"
                  onClick={() => toggle(k.id)}
                  className="w-full flex items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{k.text}</p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">
                      {k.latest_checked_at
                        ? `Last sweep ${new Date(k.latest_checked_at).toLocaleString()}`
                        : 'No sweep yet — run one on Overview'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ourPos != null ? (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                          ourPos <= 3
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ourPos <= 10
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-foreground/5 text-foreground/55 border-black/10'
                        }`}
                      >
                        We&apos;re #{ourPos}
                      </span>
                    ) : k.current.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        Off page 1
                      </span>
                    ) : null}
                    <svg className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>
                {open ? (
                  <div className="border-t border-black/5 overflow-hidden">
                    {k.current.length === 0 ? (
                      <p className="px-4 py-6 text-[12px] text-foreground/55">No data yet for this keyword.</p>
                    ) : (
                      <ol className="divide-y divide-black/5">
                        {k.current.map((r) => {
                          const prev = prevByDomain.get(r.domain);
                          const delta = prev != null ? prev - r.position : null;
                          const newEntry = prev == null;
                          return (
                            <li key={`${r.position}-${r.domain}`} className={`px-4 py-2 flex items-center gap-3 text-[13px] ${r.is_us ? 'bg-emerald-50/40' : ''}`}>
                              <span className="text-foreground/45 tabular-nums shrink-0 w-6 text-right">{r.position}.</span>
                              <div className="flex-1 min-w-0">
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className={`truncate block ${r.is_us ? 'text-emerald-700 font-semibold' : 'text-foreground/75 hover:text-primary hover:underline'}`} title={r.title ?? r.url}>
                                  {r.is_us ? 'Seven Arrows' : r.domain}
                                </a>
                                <p className="text-[10.5px] text-foreground/40 truncate" title={r.url}>{r.title ?? r.url}</p>
                              </div>
                              <div className="text-[10px] tabular-nums shrink-0 text-right min-w-[60px]">
                                {newEntry ? (
                                  <span className="text-emerald-700 font-semibold">NEW</span>
                                ) : delta != null && delta > 0 ? (
                                  <span className="text-emerald-700 font-semibold">▲ {delta}</span>
                                ) : delta != null && delta < 0 ? (
                                  <span className="text-rose-600 font-semibold">▼ {Math.abs(delta)}</span>
                                ) : (
                                  <span className="text-foreground/40">·</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'rose' }) {
  const tone = accent === 'emerald' ? 'text-emerald-600' : accent === 'rose' ? 'text-rose-600' : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}
