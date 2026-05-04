'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Local Pack tracker. Pulls from public.seo_local_ranks (latest row
// per keyword × market) and renders a 3-column grid: Phoenix /
// Scottsdale / Tucson, with each cell showing whether we own one of
// the three pack slots and which competitors hold the others.
//
// "Re-run probe" fires /api/seo/local POST which sweeps every
// configured market × every "location" keyword in the curated set
// and persists results. Reads come from GET; writes from POST.

interface LocalCompetitor {
  position: number;
  title: string;
  rating: number | null;
  reviews: number | null;
  type: string | null;
  address: string | null;
  phone: string | null;
  place_id: string | null;
  link: string | null;
  is_us: boolean;
}

interface LocalRow {
  keyword_id: string;
  keyword_text: string;
  query: string;
  location: string;
  our_position: number | null;
  our_place_id: string | null;
  our_title: string | null;
  competitors: LocalCompetitor[];
  total_results: number;
  checked_at: string;
}

interface LocalGetResponse {
  markets: { id: string; label: string; location: string }[];
  keywords: { id: string; text: string }[];
  latest: LocalRow[];
}

export default function LocalContent() {
  const [data, setData] = useState<LocalGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/local', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setData(json as LocalGetResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/local', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  // Index latest rows by (keyword_id × location) for cell lookup.
  const cellMap = useMemo(() => {
    const m = new Map<string, LocalRow>();
    for (const r of data?.latest ?? []) {
      m.set(`${r.keyword_id}::${r.location}`, r);
    }
    return m;
  }, [data]);

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
            Local Pack
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Where Seven Arrows sits in the Google Maps 3-pack across our
            three core markets — Phoenix, Scottsdale, Tucson — for every
            location keyword in the curated set. Re-run sweeps every
            keyword × market via SerpAPI and persists results.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
            running ? 'bg-foreground/40 text-white cursor-wait' : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          {running ? 'Sweeping…' : 'Re-run probe'}
        </button>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t load local pack:</strong> {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-foreground/55 py-10 text-center">Loading…</p>
      ) : (
        <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-72">Keyword</th>
                {(data?.markets ?? []).map((m) => (
                  <th key={m.id} className="text-left px-3 py-2.5 font-semibold border-b border-black/10">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(data?.keywords ?? []).map((k) => (
                <tr key={k.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground truncate">{k.text}</p>
                    <p className="text-[10px] text-foreground/40 mt-0.5 font-mono">{k.id}</p>
                  </td>
                  {(data?.markets ?? []).map((m) => {
                    const row = cellMap.get(`${k.id}::${m.location}`);
                    return (
                      <td key={m.id} className="px-3 py-2.5">
                        <LocalCell row={row} />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {(data?.keywords ?? []).length === 0 ? (
                <tr>
                  <td colSpan={(data?.markets?.length ?? 0) + 1} className="px-4 py-10 text-center text-sm text-foreground/50">
                    No location keywords in the curated set.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LocalCell({ row }: { row: LocalRow | undefined }) {
  if (!row) {
    return <span className="text-foreground/35 text-[12px]">No data — run a sweep.</span>;
  }
  if (row.competitors.length === 0) {
    return <span className="text-foreground/45 text-[12px]">Pack didn&apos;t fire</span>;
  }
  const us = row.our_position;
  return (
    <div className="space-y-1.5">
      <div>
        {us != null ? (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              us === 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : us <= 3
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-foreground/5 text-foreground/55 border-black/10'
            }`}
          >
            We&apos;re #{us}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            Not in pack
          </span>
        )}
        <span className="ml-2 text-[10px] text-foreground/40 tabular-nums">
          {row.competitors.length} {row.competitors.length === 1 ? 'place' : 'places'}
        </span>
      </div>
      <ol className="space-y-0.5 text-[12px]">
        {row.competitors.slice(0, 6).map((c) => (
          <li
            key={`${c.position}-${c.place_id ?? c.title}`}
            className={`flex items-baseline gap-1 truncate ${
              c.is_us ? 'text-emerald-700 font-semibold' : 'text-foreground/65'
            }`}
            title={c.address ?? c.title}
          >
            <span className="tabular-nums shrink-0 w-4">{c.position}.</span>
            <span className="truncate">{c.title}</span>
            {c.rating != null && c.reviews != null ? (
              <span className="ml-1 text-foreground/40 text-[10px] shrink-0">
                ★ {c.rating.toFixed(1)} · {c.reviews}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-foreground/40">
        Last checked {new Date(row.checked_at).toLocaleString()}
      </p>
    </div>
  );
}
