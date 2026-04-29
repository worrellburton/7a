'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { supabase } from '@/lib/supabase';

// SERP Audit — runs `"<domain>" -site:<domain>` against Google
// (via SerpAPI) and lists every page that mentions the brand on
// some other domain. Useful for spotting scraped content, citation
// opportunities, and link-building leads.
//
// Each Run persists a row in public.seo_serp_audits. The page
// subscribes to the realtime channel so a run by one teammate shows
// up immediately on every other open tab.

const DEFAULT_DOMAIN = 'sevenarrowsrecoveryarizona.com';

interface SerpHit {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

interface RunRow {
  id: string;
  run_at: string;
  run_by: string | null;
  run_by_name: string | null;
  run_by_avatar_url: string | null;
  query: string;
  result_count: number;
  results: SerpHit[];
  error: string | null;
}

export default function SerpAuditContent() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/seo/serp-audit/runs', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = (json.runs ?? []) as RunRow[];
      setRuns(list);
      // Default the selection to the newest run.
      setSelectedId((cur) => cur ?? (list[0]?.id ?? null));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Realtime: any insert / update / delete on seo_serp_audits
    // triggers a refresh so a teammate's Run shows up live.
    const channel = supabase
      .channel('seo_serp_audits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seo_serp_audits' }, () => {
        refresh();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/serp-audit/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // Force-select the brand-new run; refresh may not have arrived yet
      // via the realtime subscription, so apply it locally.
      if (json.run?.id) {
        setSelectedId(json.run.id);
      }
      // Trigger an explicit refresh too — the realtime event usually
      // beats us here, but a manual fetch handles the rare case where
      // the subscription is briefly unsubscribed (tab just regained focus).
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const selected = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? runs[0] ?? null,
    [runs, selectedId],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <SeoSubNav />

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">SEO</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          SERP Audit
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Find every page on the open web that mentions{' '}
          <code className="px-1 py-0.5 rounded bg-warm-bg/60 text-[12px]">{DEFAULT_DOMAIN}</code>{' '}
          but isn&apos;t hosted on it. Click <strong>Run</strong> to query Google.
        </p>
      </header>

      <section className="rounded-2xl border border-black/10 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {running ? 'Running…' : 'Run audit'}
          </button>
          <code className="text-[11px] text-foreground/55 font-mono">
            &quot;{DEFAULT_DOMAIN}&quot; -site:{DEFAULT_DOMAIN}
          </code>
          {error && (
            <span className="ml-auto text-xs text-red-700">{error}</span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-5">
        {/* History strip — past runs, newest first. Click to load that
            run's results into the right pane. */}
        <aside className="rounded-2xl border border-black/10 bg-white p-3 max-h-[640px] overflow-y-auto">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2 px-1">Run history</h2>
          {loading && runs.length === 0 && (
            <p className="px-2 py-3 text-xs text-foreground/45">Loading…</p>
          )}
          {!loading && runs.length === 0 && (
            <p className="px-2 py-3 text-xs text-foreground/45 italic">No runs yet — click Run audit above.</p>
          )}
          <ul className="space-y-1">
            {runs.map((r) => {
              const active = r.id === selected?.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                      active ? 'bg-primary/10 border border-primary/30' : 'hover:bg-warm-bg/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RunByAvatar url={r.run_by_avatar_url} name={r.run_by_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {r.run_by_name ?? 'Unknown user'}
                        </p>
                        <p className="text-[10px] text-foreground/50">
                          {new Date(r.run_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold ${r.error ? 'text-red-600' : 'text-foreground/70'}`}>
                        {r.error ? '!' : r.result_count}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Results table for the selected run. */}
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          {!selected ? (
            <div className="p-8 text-center text-sm text-foreground/45">
              No run selected.
            </div>
          ) : selected.error ? (
            <div className="p-5">
              <p className="text-xs uppercase tracking-wider text-red-700 font-bold mb-1">Run failed</p>
              <p className="text-sm text-foreground/80">{selected.error}</p>
            </div>
          ) : selected.results.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/45">
              No results in this run.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/60 text-[11px] uppercase tracking-wider text-foreground/55">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-12">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Title + URL</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {selected.results.map((hit) => (
                    <tr key={`${selected.id}:${hit.position}`} className="align-top hover:bg-warm-bg/40">
                      <td className="px-4 py-3 text-foreground/55 font-mono text-[12px]">{hit.position}</td>
                      <td className="px-4 py-3 max-w-[420px]">
                        <a
                          href={hit.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline block"
                        >
                          {hit.title || hit.link}
                        </a>
                        <p className="text-[11px] text-foreground/45 truncate" title={hit.link}>
                          {hit.displayed_link || hit.link}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-foreground/70 leading-relaxed">
                        {hit.snippet ?? <span className="italic text-foreground/35">no snippet</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RunByAvatar({ url, name }: { url: string | null; name: string | null }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="w-7 h-7 rounded-full object-cover ring-1 ring-black/5"
        loading="lazy"
      />
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-foreground/10 text-foreground/65 inline-flex items-center justify-center text-[11px] font-bold">
      {initial}
    </span>
  );
}
