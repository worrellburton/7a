'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import type { PsiSnapshot } from '@/lib/seo/psi';

// Snapshot row shape returned by /api/seo/speed/latest. Mirrors the
// public.seo_speed_runs columns with `opportunities` already parsed
// from jsonb.
export interface SpeedSnapshotRow {
  id: string;
  ran_at: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  performance: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number }>;
  fetch_ms: number | null;
  ok: boolean;
  error: string | null;
}

// LocalStorage key for the admin's URL list. Keyed under `seo.speed`
// so it doesn't collide with anything else stored by the app.
const URLS_LS_KEY = 'seo.speed.urls.v1';

// Default URLs to score on first load — homepage + the two highest-
// intent landing pages. The admin can edit this list freely; their
// edits persist in localStorage on this device only (no server sync,
// since URL preference is per-admin-per-machine).
const DEFAULT_URLS: string[] = [
  'https://7thanchor.com/',
  'https://7thanchor.com/admissions',
  'https://7thanchor.com/programs',
];

// Merge fresh snapshots into the existing list, replacing any prior
// row for the same (url, strategy) and keeping everything else. This
// lets a partial run (one URL re-scored) update only its tile without
// blowing away other URLs' results.
function mergeSnapshots(prev: SpeedSnapshotRow[], fresh: SpeedSnapshotRow[]): SpeedSnapshotRow[] {
  const keyed = new Map<string, SpeedSnapshotRow>();
  for (const s of prev) keyed.set(`${s.url}|${s.strategy}`, s);
  for (const s of fresh) keyed.set(`${s.url}|${s.strategy}`, s);
  return Array.from(keyed.values());
}

function parseUrlList(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    } catch {
      // skip invalid lines silently — the textarea shows what the user typed
    }
  }
  return out;
}

export default function SpeedContent() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [urls, setUrls] = useState<string[]>(DEFAULT_URLS);
  // Raw textarea value — kept separate so the admin can type freely
  // (including invalid lines mid-edit) without losing what they typed.
  const [urlsDraft, setUrlsDraft] = useState<string>(DEFAULT_URLS.join('\n'));
  const [snapshots, setSnapshots] = useState<SpeedSnapshotRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate URL list from localStorage on mount. Defaults stay if the
  // key is missing or unparseable.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(URLS_LS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (u): u is string => typeof u === 'string' && /^https?:\/\//.test(u),
      );
      if (valid.length > 0) {
        setUrls(valid);
        setUrlsDraft(valid.join('\n'));
      }
    } catch {
      // ignore — we'll just use defaults
    }
  }, []);

  // Persist parsed URL list whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(URLS_LS_KEY, JSON.stringify(urls));
    } catch {
      // out of quota / private mode — non-fatal
    }
  }, [urls]);

  function commitDraft() {
    const next = parseUrlList(urlsDraft);
    if (next.length === 0) return;
    setUrls(next);
    setUrlsDraft(next.join('\n'));
  }

  function resetUrls() {
    setUrls(DEFAULT_URLS);
    setUrlsDraft(DEFAULT_URLS.join('\n'));
  }

  // Run All — POSTs to /api/seo/speed/run which scores every URL on
  // mobile + desktop in parallel. Each PSI call is 10-25s and we run
  // 2N in parallel, so a 3-URL run takes roughly the slowest single
  // call (~25s). The route persists every snapshot before responding.
  async function runAll() {
    if (running || urls.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/speed/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        snapshots?: PsiSnapshot[];
        error?: string;
        persisted?: boolean;
        persistError?: string | null;
      };
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.persisted === false) {
        // The PSI calls succeeded but the DB write didn't — surface
        // the issue so the admin knows the timeline won't update.
        setError(`Saved-to-DB failed: ${json.persistError ?? 'unknown'}`);
      }
      // Map the raw PsiSnapshot[] returned by /run into the row shape
      // the UI consumes. Server `id` / `ran_at` aren't echoed back, so
      // we fabricate placeholders; the next /latest hydrate (phase 13)
      // will replace them with the real persisted rows.
      const fresh: SpeedSnapshotRow[] = (json.snapshots ?? []).map((s, i) => ({
        id: `local-${Date.now()}-${i}`,
        ran_at: s.fetchedAt,
        url: s.url,
        strategy: s.strategy,
        performance: s.performance,
        fcp: s.metrics.fcp,
        lcp: s.metrics.lcp,
        cls: s.metrics.cls,
        tbt: s.metrics.tbt,
        si: s.metrics.si,
        opportunities: s.opportunities,
        fetch_ms: s.fetchMs,
        ok: s.ok,
        error: s.error,
      }));
      setSnapshots((prev) => mergeSnapshots(prev, fresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  }

  // Suppress "unused" noise until later phases consume these.
  useEffect(() => {
    void snapshots;
    void hydrated;
    void setHydrated;
  }, [snapshots, hydrated]);

  const draftDirty = useMemo(
    () => urlsDraft.trim() !== urls.join('\n').trim(),
    [urlsDraft, urls],
  );

  if (authLoading) return null;
  if (!user || !isAdmin) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        Speed is admin-only.
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">Speed</h1>
        <p className="text-sm text-neutral-400">
          Core Web Vitals via PageSpeed Insights. Run All scores every URL on
          mobile and desktop, then keeps the timeline.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-200">URLs to score</h2>
          <span className="text-xs text-neutral-500">{urls.length} URL{urls.length === 1 ? '' : 's'}</span>
        </div>
        <textarea
          value={urlsDraft}
          onChange={(e) => setUrlsDraft(e.target.value)}
          onBlur={commitDraft}
          spellCheck={false}
          rows={Math.max(3, Math.min(10, urlsDraft.split('\n').length + 1))}
          placeholder="https://example.com/&#10;https://example.com/about"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 outline-none focus:border-neutral-600"
        />
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>One URL per line. http(s) only. Saved per device.</span>
          <div className="flex gap-2">
            {draftDirty && (
              <button
                type="button"
                onClick={commitDraft}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-200 hover:border-neutral-500"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={resetUrls}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={running || urls.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? `Running ${urls.length * 2} PSI checks…` : `Run All (×${urls.length * 2})`}
        </button>
        <span className="text-xs text-neutral-500">
          Mobile + desktop per URL. Each PSI call takes 10-25s; runs in parallel.
        </span>
      </section>

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-500">
        {snapshots.length === 0
          ? 'No results yet. Hit Run All to score every URL.'
          : `${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'} loaded. Result cards arrive in the next phases.`}
      </div>
    </div>
  );
}

export type { PsiSnapshot };
