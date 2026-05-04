'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

type Status = 'new' | 'watching' | 'curated' | 'ignore';

interface Discovery {
  id: string;
  suggestion: string;
  seed: string | null;
  relevance: number | null;
  status: Status;
  notes: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

const STATUS_LABELS: Record<Status, string> = {
  new: 'New',
  watching: 'Watching',
  curated: 'Curated',
  ignore: 'Ignore',
};

const STATUS_TONE: Record<Status, string> = {
  new: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  watching: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  curated: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  ignore: 'bg-foreground/5 text-foreground/55 border-black/10 hover:bg-foreground/10',
};

const STATUS_CYCLE: Record<Status, Status> = {
  new: 'watching',
  watching: 'curated',
  curated: 'new',
  ignore: 'new',
};

export default function DiscoverContent() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'new' | 'all' | Status>('new');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/discover', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setDiscoveries((json.discoveries ?? []) as Discovery[]);
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
      const res = await fetch('/api/seo/discover', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function patchDiscovery(id: string, body: Partial<Pick<Discovery, 'status' | 'notes'>>) {
    const before = discoveries;
    setDiscoveries((prev) => prev.map((d) => (d.id === id ? { ...d, ...body } : d)));
    try {
      const res = await fetch(`/api/seo/discover/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setDiscoveries((prev) => prev.map((d) => (d.id === id ? (json.discovery as Discovery) : d)));
    } catch (e) {
      setDiscoveries(before);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const counts = useMemo(() => {
    const c = { all: discoveries.length, new: 0, watching: 0, curated: 0, ignore: 0 };
    for (const d of discoveries) c[d.status] += 1;
    return c;
  }, [discoveries]);

  const visible = useMemo(() => {
    const qq = query.trim().toLowerCase();
    return discoveries.filter((d) => {
      if (filter === 'new' && d.status !== 'new') return false;
      if (filter !== 'new' && filter !== 'all' && d.status !== filter) return false;
      if (!qq) return true;
      return (
        d.suggestion.includes(qq) ||
        (d.seed ?? '').toLowerCase().includes(qq) ||
        (d.notes ?? '').toLowerCase().includes(qq)
      );
    });
  }, [discoveries, filter, query]);

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
            Discover
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Keyword candidates mined from Google&apos;s autocomplete on
            seed prefixes (rehab in / drug rehab phoenix / equine therapy
            rehab / etc.). Each one is a phrase real people are typing —
            triage to "Curated" and we should add it to the priority
            keyword set.
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
          {running ? 'Mining…' : 'Mine autocomplete'}
        </button>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t complete that:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <Stat label="Total" value={counts.all} />
        <Stat label="New" value={counts.new} accent="amber" />
        <Stat label="Watching" value={counts.watching} accent="sky" />
        <Stat label="Curated" value={counts.curated} accent="emerald" />
        <Stat label="Ignore" value={counts.ignore} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip active={filter === 'new'} onClick={() => setFilter('new')} label="New" count={counts.new} />
        <Chip active={filter === 'watching'} onClick={() => setFilter('watching')} label="Watching" count={counts.watching} />
        <Chip active={filter === 'curated'} onClick={() => setFilter('curated')} label="Curated" count={counts.curated} />
        <Chip active={filter === 'ignore'} onClick={() => setFilter('ignore')} label="Ignore" count={counts.ignore} />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search suggestions…"
          className="ml-auto text-sm rounded-md border border-black/10 bg-white px-3 py-1.5 w-64 max-w-full"
        />
      </div>

      {loading ? (
        <p className="text-sm text-foreground/55 py-8 text-center">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-warm-bg/40 p-10 text-center">
          <p className="text-sm text-foreground/60">
            {discoveries.length === 0
              ? 'No suggestions yet. Click "Mine autocomplete" to fetch.'
              : 'No suggestions match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10">Suggestion</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-44">Seed</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-28">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-32">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{d.suggestion}</p>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/65 text-[12px]">{d.seed ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => patchDiscovery(d.id, { status: STATUS_CYCLE[d.status] })}
                      className={`inline-flex items-center px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${STATUS_TONE[d.status]}`}
                    >
                      {STATUS_LABELS[d.status]}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/55 text-[12px]">
                    {new Date(d.last_seen_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'sky' | 'emerald' }) {
  const tone = accent === 'amber' ? 'text-amber-600' : accent === 'sky' ? 'text-sky-600' : accent === 'emerald' ? 'text-emerald-600' : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/40'
      }`}
    >
      {label}
      <span className={`ml-1 ${active ? 'text-white/70' : 'text-foreground/40'}`}>· {count}</span>
    </button>
  );
}
