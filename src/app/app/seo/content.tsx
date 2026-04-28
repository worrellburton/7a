'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SeoSubNav from './SeoSubNav';
import { SeoRangePicker } from './SeoRangePicker';
import {
  CATEGORY_LABELS,
  KEYWORDS,
  type Keyword,
  type KeywordCategory,
  type KeywordDifficulty,
} from '@/lib/seo/keywords';
import {
  suggestionsForFit,
  buildClaudeCodePrompt,
  ideasForKeyword,
  buildBlogCreationPrompt,
  type FitBreakdown,
  type FitSuggestion,
  type BlogIdea,
  type KeywordCategoryForIdeas,
} from '@/lib/seo/keywordFit';

const KEYWORD_STORAGE_KEY = 'sa-seo:keyword-ranks';

interface RankRow {
  id: string;
  keyword: string;
  rank: number | null;
  url: string | null;
  totalResults: number;
  error: string | null;
}

interface RankResponse {
  ranAt: string;
  durationMs: number;
  domain: string;
  results: RankRow[];
  summary: { total: number; ranked: number; errors: number };
  notice?: string;
}

interface RankHistoryPoint {
  rank: number | null;
  checked_at: string;
}

interface RankHistoryEntry {
  id: string;
  text: string;
  latest: { rank: number | null; url: string | null; checked_at: string; features: Record<string, unknown> | null } | null;
  previous: { rank: number | null; checked_at: string } | null;
  /** previous.rank − latest.rank — positive means we improved (lower
   *  position number is better). Null when either side is missing. */
  delta: number | null;
  sparkline: RankHistoryPoint[];
}

interface RankHistoryResponse {
  domain: string;
  latestRanAt: string | null;
  keywords: RankHistoryEntry[];
}

export interface FitRow {
  keyword_id: string;
  score: number;
  bucket: 'strong' | 'good' | 'partial' | 'weak' | 'none';
  best_url: string | null;
  best_h1: string | null;
  best_title: string | null;
  breakdown: Record<string, unknown> | null;
  scanned_at?: string | null;
}

interface FitListResponse {
  rows: FitRow[];
  lastScannedAt: string | null;
}

interface FitScanResponse {
  origin: string;
  pagesCrawled: number;
  keywords: number;
  durationMs: number;
  fits: Array<{
    keyword_id: string;
    keyword_text: string;
    score: number;
    bucket: FitRow['bucket'];
    best_url: string | null;
    best_h1: string | null;
    best_title: string | null;
    breakdown: Record<string, unknown> | null;
  }>;
}

interface GscResponse {
  range: { startDate: string; endDate: string; days: number };
  site: string;
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  topPages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  fetched_at: string;
}

export default function SeoContent() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<GscResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keyword research card state.
  const [ranks, setRanks] = useState<RankResponse | null>(null);
  const [ranksLoading, setRanksLoading] = useState(false);
  const [ranksError, setRanksError] = useState<string | null>(null);

  // Persisted rank history from public.seo_keyword_ranks. Hydrated
  // from /api/seo/keywords/rank GET on mount + after every sweep so
  // RankCell can render a sparkline + Δ-vs-last-week.
  const [rankHistory, setRankHistory] = useState<Record<string, RankHistoryEntry>>({});

  // Current-fit card state — one row per keyword with a score from
  // the live-site scanner (H1/title/URL/meta/body match).
  const [fits, setFits] = useState<Record<string, FitRow>>({});
  const [fitsLastScannedAt, setFitsLastScannedAt] = useState<string | null>(null);
  const [fitsLoading, setFitsLoading] = useState(false);
  const [fitsError, setFitsError] = useState<string | null>(null);

  // Hydrate cached rank data so the card shows immediately on reload.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(KEYWORD_STORAGE_KEY);
      if (raw) setRanks(JSON.parse(raw) as RankResponse);
    } catch {
      // stale / corrupt — ignore
    }
  }, []);

  // Pull the persisted rank history on mount so the table can show
  // Δ-vs-last-week + a sparkline immediately. Refreshed after every
  // sweep via refreshHistory() below so a fresh sweep updates the
  // viz without a full page reload.
  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/seo/keywords/rank', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as RankHistoryResponse;
      const map: Record<string, RankHistoryEntry> = {};
      for (const k of json.keywords) map[k.id] = k;
      setRankHistory(map);
    } catch {
      // Non-fatal — sparklines just won't render this load.
    }
  }, []);
  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  // Hydrate current-fit data from Supabase on mount. This is admin-
  // gated so we can't cache in localStorage (staff collaborate) —
  // single-select is cheap enough to refetch every visit.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/seo/keywords/fit', { cache: 'no-store', credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as FitListResponse;
      })
      .then((json) => {
        if (cancelled || !json) return;
        const map: Record<string, FitRow> = {};
        for (const row of json.rows) map[row.keyword_id] = row;
        setFits(map);
        setFitsLastScannedAt(json.lastScannedAt);
      })
      .catch(() => { /* non-fatal — scan button still works */ });
    return () => { cancelled = true; };
  }, []);

  async function runFitScan() {
    setFitsLoading(true);
    setFitsError(null);
    try {
      const res = await fetch('/api/seo/keywords/fit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const payload = json as FitScanResponse;
      const map: Record<string, FitRow> = {};
      const now = new Date().toISOString();
      for (const f of payload.fits) {
        map[f.keyword_id] = {
          keyword_id: f.keyword_id,
          score: f.score,
          bucket: f.bucket,
          best_url: f.best_url,
          best_h1: f.best_h1,
          best_title: f.best_title,
          breakdown: f.breakdown,
          scanned_at: now,
        };
      }
      setFits(map);
      setFitsLastScannedAt(now);
    } catch (e) {
      setFitsError(e instanceof Error ? e.message : String(e));
    } finally {
      setFitsLoading(false);
    }
  }

  async function checkRankings() {
    setRanksLoading(true);
    setRanksError(null);
    try {
      const res = await fetch('/api/seo/keywords/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const payload = json as RankResponse;
      setRanks(payload);
      try {
        window.localStorage.setItem(KEYWORD_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // quota — non-fatal
      }
      // Refresh the persisted history so deltas + sparklines reflect
      // the just-completed sweep without a page reload.
      void refreshHistory();
    } catch (e) {
      setRanksError(e instanceof Error ? e.message : String(e));
    } finally {
      setRanksLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/google/search-console?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as GscResponse);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const fmt = (n: number) => n.toLocaleString();
  const fmtPct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <h1 className="text-2xl font-bold text-foreground">SEO</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Live Search Console performance for {data?.site ?? 'sevenarrowsrecoveryarizona.com'}.
            Top queries, top pages, and how the site is performing in Google results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncSerpApiButton onDone={refreshHistory} />
          {/* Image + video sync moved off the Overview header — both
              flows now live inside the Media tab where they belong.
              Date range chooser is in its own analytics-style card
              below. */}
        </div>
      </div>

      <SeoRangePicker days={days} onChange={setDays} />
      <SeoSubNav />

      <SourceCommandCenter />

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Couldn&apos;t load Search Console:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Clicks" value={data ? fmt(data.summary.clicks) : loading ? '…' : '—'} />
        <Stat label="Impressions" value={data ? fmt(data.summary.impressions) : loading ? '…' : '—'} />
        <Stat label="CTR" value={data ? fmtPct(data.summary.ctr) : loading ? '…' : '—'} />
        <Stat
          label="Avg. position"
          value={data ? fmtPos(data.summary.position) : loading ? '…' : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top queries">
          {data?.topQueries?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
                    <th className="py-2 pr-2">Query</th>
                    <th className="py-2 px-2 text-right">Clicks</th>
                    <th className="py-2 px-2 text-right">Impr.</th>
                    <th className="py-2 pl-2 text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.topQueries.map((q) => (
                    <tr key={q.query}>
                      <td className="py-2 pr-2 text-foreground truncate max-w-[260px]" title={q.query}>{q.query || '—'}</td>
                      <td className="py-2 px-2 text-right font-semibold">{fmt(q.clicks)}</td>
                      <td className="py-2 px-2 text-right text-foreground/70">{fmt(q.impressions)}</td>
                      <td className="py-2 pl-2 text-right text-foreground/70">{fmtPos(q.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>

        <Panel title="Top pages">
          {data?.topPages?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
                    <th className="py-2 pr-2">Page</th>
                    <th className="py-2 px-2 text-right">Clicks</th>
                    <th className="py-2 px-2 text-right">Impr.</th>
                    <th className="py-2 pl-2 text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.topPages.map((p) => (
                    <tr key={p.page}>
                      <td className="py-2 pr-2 text-foreground truncate max-w-[260px]" title={p.page}>
                        {prettyPath(p.page)}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">{fmt(p.clicks)}</td>
                      <td className="py-2 px-2 text-right text-foreground/70">{fmt(p.impressions)}</td>
                      <td className="py-2 pl-2 text-right text-foreground/70">{fmtPos(p.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>
      </div>

      <KeywordResearchCard
        ranks={ranks}
        rankHistory={rankHistory}
        loading={ranksLoading}
        error={ranksError}
        onCheck={checkRankings}
        fits={fits}
        fitsLoading={fitsLoading}
        fitsError={fitsError}
        fitsLastScannedAt={fitsLastScannedAt}
        onRunFitScan={runFitScan}
      />

      {data?.fetched_at ? (
        <p className="mt-6 text-xs text-foreground/40">
          Fetched {new Date(data.fetched_at).toLocaleString()} · range {data.range.startDate} → {data.range.endDate} · Search Console lags ~2 days
        </p>
      ) : null}
    </div>
  );
}

function KeywordResearchCard({
  ranks,
  rankHistory,
  loading,
  error,
  onCheck,
  fits,
  fitsLoading,
  fitsError,
  fitsLastScannedAt,
  onRunFitScan,
}: {
  ranks: RankResponse | null;
  rankHistory: Record<string, RankHistoryEntry>;
  loading: boolean;
  error: string | null;
  onCheck: () => void;
  fits: Record<string, FitRow>;
  fitsLoading: boolean;
  fitsError: string | null;
  fitsLastScannedAt: string | null;
  onRunFitScan: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<KeywordCategory, boolean>>({
    location: false,
    modality: false,
    insurance: false,
    substance: false,
    brand: false,
    decision: false,
  });
  const [openFitKeywordId, setOpenFitKeywordId] = useState<string | null>(null);

  const rankMap = new Map<string, RankRow>();
  for (const r of ranks?.results ?? []) rankMap.set(r.id, r);

  // Group keywords by category, sorted within each group by volume desc.
  const grouped = new Map<KeywordCategory, Keyword[]>();
  for (const k of KEYWORDS) {
    const bucket = grouped.get(k.category) ?? [];
    bucket.push(k);
    grouped.set(k.category, bucket);
  }
  for (const arr of grouped.values()) arr.sort((a, b) => b.volume - a.volume);

  // Roll-up numbers for the card header.
  const totalVolume = KEYWORDS.reduce((s, k) => s + k.volume, 0);
  const rankedCount = ranks
    ? ranks.results.filter((r) => r.rank != null).length
    : 0;
  const top10Count = ranks
    ? ranks.results.filter((r) => r.rank != null && r.rank <= 10).length
    : 0;

  return (
    <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground mb-1">
            Keyword research
          </h2>
          <p className="text-xs text-foreground/60 max-w-2xl">
            High-intent queries the admissions funnel depends on, with curated
            monthly volume + difficulty. Click{' '}
            <strong>Check rankings</strong> to query Google via SerpAPI and
            see where <code className="text-[11px]">sevenarrowsrecoveryarizona.com</code>{' '}
            lands in the top 100 for each.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onRunFitScan}
            disabled={fitsLoading}
            title="Crawl the public site and score every keyword against H1 / title / URL / meta / body content"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {fitsLoading
              ? 'Scanning site…'
              : fitsLastScannedAt
                ? 'Re-scan site fit'
                : 'Scan site fit'}
          </button>
          <button
            type="button"
            onClick={onCheck}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Checking…'
              : ranks
                ? 'Re-check rankings'
                : 'Check rankings'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <KeywordStat
          label="Keywords tracked"
          value={KEYWORDS.length.toLocaleString()}
        />
        <KeywordStat
          label="Total monthly vol."
          value={totalVolume.toLocaleString()}
        />
        <KeywordStat
          label="Ranking top 100"
          value={ranks ? `${rankedCount} / ${ranks.results.length}` : '—'}
        />
        <KeywordStat
          label="Ranking top 10"
          value={ranks ? `${top10Count} / ${ranks.results.length}` : '—'}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <strong>Rank check failed:</strong> {error}
        </div>
      ) : null}

      {fitsError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <strong>Fit scan failed:</strong> {fitsError}
        </div>
      ) : null}

      {ranks?.notice ? (
        <p className="mt-4 text-[11px] text-foreground/50">
          Last check {new Date(ranks.ranAt).toLocaleString()} · {ranks.notice}
        </p>
      ) : null}

      {fitsLastScannedAt ? (
        <p className="mt-2 text-[11px] text-foreground/50">
          Fit last scanned {new Date(fitsLastScannedAt).toLocaleString()}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] text-foreground/40">
        Volume + difficulty are curated estimates (Google Keyword Planner
        ranges + industry benchmarks). Rank is live from Google via SerpAPI
        when the key is set. <strong>Current fit</strong> crawls the live
        site and scores each keyword against H1 / title / URL / meta / body
        content (0 = nothing on-page targets it, 100 = exact H1 match).
      </p>

      <div className="mt-5 space-y-5">
        {(Array.from(grouped.keys()) as KeywordCategory[]).map((cat) => {
          const list = grouped.get(cat) ?? [];
          const catVolume = list.reduce((s, k) => s + k.volume, 0);
          const catRanked = list.filter((k) => {
            const r = rankMap.get(k.id);
            return r?.rank != null;
          }).length;
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat}>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
                }
                className="flex items-center gap-2 mb-2 w-full text-left hover:opacity-80 transition"
              >
                <svg
                  className={`w-3 h-3 text-foreground/40 transition-transform ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/60">
                  {CATEGORY_LABELS[cat]} · {list.length}
                </span>
                <span className="text-[10px] text-foreground/40">
                  {catVolume.toLocaleString()} vol/mo
                  {ranks ? ` · ${catRanked}/${list.length} ranking` : ''}
                </span>
              </button>
              {!isCollapsed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
                        <th className="py-2 pr-2">Keyword</th>
                        <th className="py-2 px-2 text-right w-24">Volume</th>
                        <th className="py-2 px-2 text-center w-24">Difficulty</th>
                        <th className="py-2 px-2 text-center w-16">Pri.</th>
                        <th className="py-2 px-2 text-center w-28">Current fit</th>
                        <th className="py-2 pl-2 text-right w-28">Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {list.map((k) => {
                        const r = rankMap.get(k.id);
                        const fit = fits[k.id];
                        const h = rankHistory[k.id];
                        return (
                          <tr key={k.id}>
                            <td
                              className="py-2 pr-2 text-foreground truncate max-w-[320px]"
                              title={k.note ?? k.text}
                            >
                              {k.text}
                              {k.note ? (
                                <span className="ml-2 text-[10px] text-foreground/40">
                                  {k.note}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold tabular-nums">
                              {k.volume.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <DifficultyPill d={k.difficulty} />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <PriorityPill p={k.priority} />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <FitCell
                                row={fit}
                                loading={fitsLoading}
                                onOpen={() => setOpenFitKeywordId(k.id)}
                              />
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <RankCell row={r} history={h} loading={loading} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {openFitKeywordId ? (() => {
        const kw = KEYWORDS.find((k) => k.id === openFitKeywordId);
        const fit = fits[openFitKeywordId];
        if (!kw) return null;
        return (
          <FitDetailsModal
            keyword={kw}
            fit={fit}
            onClose={() => setOpenFitKeywordId(null)}
          />
        );
      })() : null}
    </div>
  );
}

function KeywordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-warm-bg/30 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground/50">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function DifficultyPill({ d }: { d: KeywordDifficulty }) {
  const cls =
    d === 'low'
      ? 'bg-emerald-50 text-emerald-700'
      : d === 'medium'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-red-50 text-red-700';
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {d}
    </span>
  );
}

function PriorityPill({ p }: { p: 1 | 2 | 3 }) {
  const cls =
    p === 1
      ? 'bg-red-50 text-red-700'
      : p === 2
        ? 'bg-amber-50 text-amber-800'
        : 'bg-black/5 text-foreground/50';
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}
      title={`Priority ${p}`}
    >
      P{p}
    </span>
  );
}

function RankCell({
  row,
  history,
  loading,
}: {
  row: RankRow | undefined;
  history: RankHistoryEntry | undefined;
  loading: boolean;
}) {
  if (!row) {
    // Without a fresh sweep result, fall back to the persisted
    // history's latest rank — that way the page is informative even
    // before the admin clicks "Check rankings".
    if (history?.latest?.rank != null) {
      return <RankBadge rank={history.latest.rank} url={history.latest.url ?? null} delta={history.delta ?? null} sparkline={history.sparkline} stale />;
    }
    return <span className="text-foreground/40">{loading ? '…' : '—'}</span>;
  }
  if (row.error) {
    return (
      <span
        className="text-red-600 text-[10px] truncate inline-block max-w-[100px]"
        title={row.error}
      >
        err
      </span>
    );
  }
  if (row.rank == null) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-foreground/50 text-[11px]">not in top 100</span>
        {history && history.sparkline.length > 1 ? (
          <Sparkline points={history.sparkline} />
        ) : null}
      </div>
    );
  }
  return (
    <RankBadge
      rank={row.rank}
      url={row.url}
      delta={history?.delta ?? null}
      sparkline={history?.sparkline ?? []}
    />
  );
}

function RankBadge({
  rank,
  url,
  delta,
  sparkline,
  stale,
}: {
  rank: number;
  url: string | null;
  delta: number | null;
  sparkline: { rank: number | null; checked_at: string }[];
  stale?: boolean;
}) {
  const cls =
    rank <= 3
      ? 'text-emerald-600'
      : rank <= 10
        ? 'text-amber-600'
        : 'text-foreground/70';
  // delta = previous − current. Lower rank number is better, so a
  // positive delta means "we moved up". Use a generous stale class
  // when the rank came from history rather than a fresh sweep.
  const arrow =
    delta == null ? null : delta > 0 ? '▲' : delta < 0 ? '▼' : '·';
  const arrowClass =
    delta == null
      ? ''
      : delta > 0
        ? 'text-emerald-600'
        : delta < 0
          ? 'text-rose-600'
          : 'text-foreground/40';
  return (
    <div className={`flex items-center justify-end gap-2 ${stale ? 'opacity-70' : ''}`} title={stale ? 'From last persisted check — run a new sweep for live rank' : ''}>
      {sparkline.length > 1 ? <Sparkline points={sparkline} /> : null}
      <a
        href={url ?? '#'}
        target="_blank"
        rel="noreferrer"
        className={`font-bold tabular-nums hover:underline ${cls}`}
        title={url ?? ''}
      >
        #{rank}
      </a>
      {arrow && delta != null ? (
        <span className={`text-[10px] font-semibold tabular-nums ${arrowClass}`} title={`${delta > 0 ? 'Improved' : delta < 0 ? 'Dropped' : 'No change'} ${Math.abs(delta)} positions vs ~7 days ago`}>
          {arrow}{Math.abs(delta) > 0 ? Math.abs(delta) : ''}
        </span>
      ) : null}
    </div>
  );
}

// Tiny inline rank sparkline. The y-axis is inverted because lower
// rank numbers are better — visually, a high spark line means
// "ranking high (small position number)". Null ranks are clamped to
// the bottom (101) so an off-the-chart day is obvious.
function Sparkline({
  points,
}: {
  points: { rank: number | null; checked_at: string }[];
}) {
  const w = 44;
  const h = 14;
  const ranks = points.map((p) => (p.rank == null ? 101 : Math.min(101, Math.max(1, p.rank))));
  if (ranks.length < 2) return null;
  const minR = Math.max(1, Math.min(...ranks) - 1);
  const maxR = Math.min(101, Math.max(...ranks) + 1);
  const span = Math.max(1, maxR - minR);
  // Invert: lower rank → higher pixel.
  const ys = ranks.map((r) => h - ((r - minR) / span) * h);
  const xs = ranks.map((_, i) => (ranks.length === 1 ? 0 : (i / (ranks.length - 1)) * w));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const last = ranks[ranks.length - 1];
  const stroke =
    last <= 3 ? '#059669' : last <= 10 ? '#d97706' : '#a8a29e';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={1.6} fill={stroke} />
    </svg>
  );
}

function FitCell({
  row, loading, onOpen,
}: {
  row: FitRow | undefined;
  loading: boolean;
  onOpen: () => void;
}) {
  if (!row) {
    return <span className="text-foreground/40">{loading ? '…' : '—'}</span>;
  }
  const tone =
    row.bucket === 'strong'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : row.bucket === 'good'
        ? 'bg-lime-50 text-lime-800 border-lime-200'
        : row.bucket === 'partial'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : row.bucket === 'weak'
            ? 'bg-orange-50 text-orange-800 border-orange-200'
            : 'bg-red-50 text-red-700 border-red-200';
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Click for suggestions to get ${row.score}/100 → 100`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition ${tone}`}
    >
      <span className="tabular-nums">{row.score}</span>
      <span>{row.bucket}</span>
    </button>
  );
}

function FitDetailsModal({
  keyword, fit, onClose,
}: {
  keyword: Keyword;
  fit: FitRow | undefined;
  onClose: () => void;
}) {
  // ESC-to-close + scroll-lock while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const breakdown = (fit?.breakdown ?? null) as FitBreakdown | null;
  const score = fit?.score ?? 0;
  const gap = Math.max(0, 100 - score);
  const suggestions: FitSuggestion[] = suggestionsForFit({
    keyword_text: keyword.text,
    breakdown,
    best_url: fit?.best_url ?? null,
    best_h1: fit?.best_h1 ?? null,
    best_title: fit?.best_title ?? null,
  });

  const potentialGain = suggestions.reduce((s, x) => (x.done ? s : s + x.points), 0);

  const toneHeader =
    fit?.bucket === 'strong'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : fit?.bucket === 'good'
        ? 'bg-lime-50 text-lime-800 border-lime-200'
        : fit?.bucket === 'partial'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : fit?.bucket === 'weak'
            ? 'bg-orange-50 text-orange-800 border-orange-200'
            : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fit-details-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/5 px-6 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50">
              Current fit · {CATEGORY_LABELS[keyword.category]}
            </p>
            <h2
              id="fit-details-heading"
              className="mt-1 text-lg font-bold text-foreground truncate"
              title={keyword.text}
            >
              {keyword.text}
            </h2>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${toneHeader}`}>
                <span className="tabular-nums">{score}</span>
                <span>{fit?.bucket ?? 'none'}</span>
              </span>
              {gap > 0 && (
                <span className="text-[11px] text-foreground/60">
                  {gap} pts to 100
                  {potentialGain > 0 && potentialGain < gap && ` · ${potentialGain} available from signals below`}
                </span>
              )}
              {gap === 0 && <span className="text-[11px] text-emerald-700 font-semibold">Topped out.</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground/50 hover:text-foreground hover:bg-black/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Breakdown bars */}
          <section>
            <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-foreground/55 mb-2">
              Signal breakdown
            </h3>
            <ul className="space-y-1.5">
              <BreakdownRow label="H1 heading" earned={breakdown?.h1_points ?? 0} max={40} />
              <BreakdownRow label="Title tag" earned={breakdown?.title_points ?? 0} max={20} />
              <BreakdownRow label="URL slug" earned={breakdown?.url_points ?? 0} max={12} />
              <BreakdownRow label="H2 heading" earned={breakdown?.h2_points ?? 0} max={10} />
              <BreakdownRow label="Meta description" earned={breakdown?.meta_points ?? 0} max={8} />
              <BreakdownRow label="Body mentions" earned={breakdown?.body_points ?? 0} max={5} />
            </ul>
          </section>

          {/* Best page */}
          {(fit?.best_url || fit?.best_h1 || fit?.best_title) && (
            <section className="rounded-lg border border-black/5 bg-warm-bg/40 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/55 mb-2">
                Best-fitting page
              </p>
              {fit.best_h1 && (
                <p className="text-sm text-foreground">
                  <span className="text-[10px] tracking-wider uppercase text-foreground/50 mr-1.5">H1</span>
                  <span className="font-medium">{fit.best_h1}</span>
                </p>
              )}
              {fit.best_title && (
                <p className="mt-1 text-xs text-foreground/70">
                  <span className="text-[10px] tracking-wider uppercase text-foreground/50 mr-1.5">Title</span>
                  {fit.best_title}
                </p>
              )}
              {fit.best_url && (
                <p className="mt-2">
                  <a
                    href={fit.best_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    Open page
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </p>
              )}
            </section>
          )}

          {/* Suggestions list */}
          <section>
            <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-foreground/55 mb-2">
              Ways to raise the score
            </h3>
            <ol className="space-y-2.5">
              {suggestions.map((s, i) => (
                <SuggestionRow key={`${s.signal}-${i}`} suggestion={s} />
              ))}
            </ol>
            {gap > 0 && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    Hand it to Claude Code
                  </p>
                  <p className="text-[11px] text-foreground/60">
                    Copies a prompt with the exact changes, the page path, and the project conventions.
                  </p>
                </div>
                <CopyPromptButton
                  getPrompt={() => buildClaudeCodePrompt({
                    keyword_text: keyword.text,
                    score,
                    bucket: fit?.bucket ?? 'none',
                    breakdown,
                    best_url: fit?.best_url ?? null,
                    best_h1: fit?.best_h1 ?? null,
                    best_title: fit?.best_title ?? null,
                    suggestions,
                  })}
                  label="Copy Claude Code prompt"
                />
              </div>
            )}
          </section>

          {/* Blog idea pack — Recovery Roadmap style */}
          <BlogIdeasSection
            keywordText={keyword.text}
            category={keyword.category as KeywordCategoryForIdeas}
          />

          <p className="text-[11px] text-foreground/40">
            Re-run the fit scan after publishing changes to see the score update. The
            score caps at 100 — some signals share weight so the best-fitting page
            won't always need all of them to sit in the "strong" band.
          </p>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, earned, max }: { label: string; earned: number; max: number }) {
  const pct = Math.min(100, Math.round((earned / max) * 100));
  const tone = earned >= max
    ? 'bg-emerald-500'
    : earned > 0
      ? 'bg-amber-400'
      : 'bg-black/15';
  return (
    <li className="grid grid-cols-[120px_1fr_60px] items-center gap-3 text-xs">
      <span className="text-foreground/70">{label}</span>
      <span className="relative h-2 rounded-full bg-black/5 overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 ${tone} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-right tabular-nums text-foreground/70">
        {earned}/{max}
      </span>
    </li>
  );
}

function SuggestionRow({ suggestion }: { suggestion: FitSuggestion }) {
  const icon = suggestion.done ? (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
  return (
    <li className="flex gap-3 items-start">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${suggestion.done ? 'text-foreground/70' : 'text-foreground'}`}>
            {suggestion.title}
          </p>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider tabular-nums ${
              suggestion.done ? 'text-emerald-700' : 'text-primary'
            }`}
          >
            {suggestion.done ? `+${suggestion.points} earned` : `+${suggestion.points} pts`}
          </span>
        </div>
        <p className="text-xs text-foreground/60 mt-0.5 leading-snug">{suggestion.detail}</p>
      </div>
    </li>
  );
}

function CopyPromptButton({
  getPrompt, label = 'Copy prompt', size = 'md',
}: {
  getPrompt: () => string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    const text = getPrompt();
    setFailed(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for very old browsers / non-secure contexts.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2400);
    }
  }

  const sizing = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-md font-semibold transition-colors ${sizing} ${
        copied
          ? 'bg-emerald-600 text-white'
          : failed
            ? 'bg-red-600 text-white'
            : 'bg-primary text-white hover:bg-primary/90'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : failed ? (
        'Copy failed'
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 012-2h9" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function BlogIdeasSection({
  keywordText, category,
}: {
  keywordText: string;
  category: KeywordCategoryForIdeas;
}) {
  const ideas: BlogIdea[] = ideasForKeyword(keywordText, category);
  return (
    <section>
      <h3 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-foreground/55 mb-2">
        Road to Recovery blog ideas
      </h3>
      <p className="text-[11px] text-foreground/50 mb-3">
        Recovery Roadmap-style episode pitches that target <em className="not-italic font-semibold">&ldquo;{keywordText}&rdquo;</em> in the H1, URL, title, meta, and body. Each card copies a Claude Code prompt that builds the full episode in the Recovery Roadmap voice and registers it on the hub.
      </p>
      <ul className="space-y-2">
        {ideas.map((idea) => (
          <li
            key={idea.slug}
            className="rounded-lg border border-black/5 bg-warm-bg/30 px-3 py-2.5 flex gap-3 items-start"
          >
            <div className="shrink-0 mt-0.5 text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug">{idea.title}</p>
              <p className="text-[11px] text-foreground/60 mt-0.5 leading-snug">{idea.subtitle}</p>
              <p className="text-[10px] text-foreground/40 mt-1 font-mono">
                /who-we-are/blog/{idea.slug}
              </p>
            </div>
            <CopyPromptButton
              getPrompt={() => buildBlogCreationPrompt({ keyword_text: keywordText, idea })}
              label="Copy prompt"
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function prettyPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-5">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 min-h-[260px]">
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}

// ── Source command center ────────────────────────────────────────
//
// Pulls from /api/seo/source-health to render four "source" cards
// at the top of the Overview, each showing the latest write into
// its persisted table + a one-click jump to the full page. Lets
// admins scan "what's stale" before they pick a tab.

interface SourceHealthShape {
  serpapi: { configured: boolean; usage: { count: number; cap: number; remaining: number } };
  freshness: Array<{ table: string; label: string; latest_at: string | null; count_30d: number }>;
}

function SourceCommandCenter() {
  const [data, setData] = useState<SourceHealthShape | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/seo/source-health', { cache: 'no-store' })
      .then(async (r) => (r.ok ? ((await r.json()) as SourceHealthShape) : null))
      .then((j) => { if (!cancelled && j) setData(j); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  const byTable = new Map((data?.freshness ?? []).map((f) => [f.table, f] as const));
  const cards: { href: string; label: string; tableKey: string; emoji: string }[] = [
    { href: '/app/seo', label: 'Keyword ranks', tableKey: 'seo_keyword_ranks', emoji: '◷' },
    { href: '/app/seo/local', label: 'Local pack', tableKey: 'seo_local_ranks', emoji: '◉' },
    { href: '/app/seo/questions', label: 'PAA questions', tableKey: 'seo_paa_questions', emoji: '?' },
    { href: '/app/seo/competitors', label: 'Competitors', tableKey: 'seo_competitor_serps', emoji: '⌘' },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/45">
          Source command center
        </p>
        {data?.serpapi.configured ? (
          <p className="text-[11px] text-foreground/45 tabular-nums">
            SerpAPI {data.serpapi.usage.count} / {data.serpapi.usage.cap} today
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const f = byTable.get(c.tableKey);
          const fresh = f?.latest_at ? Date.now() - new Date(f.latest_at).getTime() : null;
          const isStale = fresh != null && fresh > 14 * 24 * 60 * 60 * 1000;
          const tone = !f?.latest_at
            ? 'border-rose-200 bg-rose-50/40'
            : isStale
              ? 'border-amber-200 bg-amber-50/40'
              : 'border-emerald-200 bg-emerald-50/30';
          return (
            <Link
              key={c.tableKey}
              href={c.href}
              className={`block rounded-2xl border p-4 hover:shadow-sm transition ${tone}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] text-foreground/55" aria-hidden="true">{c.emoji}</span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/65">
                  {c.label}
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {f?.count_30d ?? 0}
              </p>
              <p className="text-[11px] text-foreground/55 mt-1">
                {f?.latest_at
                  ? `Last write ${new Date(f.latest_at).toLocaleDateString()}`
                  : 'No data yet'}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Sync with SerpAPI ────────────────────────────────────────────
//
// Single button that fans out to the four SerpAPI-backed sweeps —
// keyword ranks, local pack, PAA mining, autocomplete discovery —
// in parallel, then triggers the parent's history refresh so the
// Overview's source cards + keyword sparklines update without a
// page reload. Each per-sweep failure surfaces as a toast-style
// caption beneath the button rather than aborting the whole batch.

function SyncSerpApiButton({ onDone }: { onDone: () => void | Promise<void> }) {
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<{ ok: number; failed: number; at: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    const endpoints = [
      '/api/seo/keywords/rank',
      '/api/seo/local',
      '/api/seo/questions',
      '/api/seo/discover',
    ];
    const results = await Promise.allSettled(
      endpoints.map((e) => fetch(e, { method: 'POST' }).then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error((body?.error as string) ?? `HTTP ${r.status}`);
        return body;
      })),
    );
    let ok = 0;
    let failed = 0;
    const messages: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok += 1;
      else {
        failed += 1;
        messages.push(`${endpoints[i].split('/').pop()}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
      }
    });
    setLast({ ok, failed, at: new Date() });
    if (messages.length > 0) setError(messages.join(' · '));
    setRunning(false);
    await onDone();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
          running ? 'bg-foreground/40 text-white cursor-wait' : 'bg-primary text-white hover:bg-primary-dark'
        }`}
        title="Run keyword ranks + local pack + PAA mining + autocomplete discovery in parallel."
      >
        <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
        {running ? 'Syncing…' : 'Sync with SerpAPI'}
      </button>
      {last ? (
        <p className="text-[10px] text-foreground/45 tabular-nums">
          {last.ok}/{last.ok + last.failed} sweeps ok · {last.at.toLocaleTimeString()}
        </p>
      ) : null}
      {error ? (
        <p className="text-[10px] text-rose-700 max-w-xs truncate" title={error}>{error}</p>
      ) : null}
    </div>
  );
}
