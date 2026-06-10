'use client';

// Per-cron-path activity log. Lists the most recent ~200 cron runs
// across every Vercel-scheduled route, grouped by path so admins
// can spot a job that hasn't fired today + a job that's been
// erroring quietly. Source: public.cron_runs (written by
// lib/cron-observability.ts on every cron invocation).

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

interface CronRun {
  id: string;
  path: string;
  status: 'ok' | 'failed' | 'error';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  message: string | null;
  payload: Record<string, unknown> | null;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CronRunsContent() {
  const { session, isAdmin, isSuperAdmin } = useAuth();
  const canRead = isAdmin || isSuperAdmin;
  const [rows, setRows] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token || !canRead) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('cron_runs')
        .select('id, path, status, started_at, finished_at, duration_ms, message, payload')
        .order('started_at', { ascending: false })
        .limit(300);
      if (cancelled) return;
      setRows(Array.isArray(data) ? (data as CronRun[]) : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, canRead]);

  // Group runs by path → latest + failure count in window for the
  // per-path summary row. Each group surfaces the recent activity
  // pattern at a glance.
  const groups = useMemo(() => {
    const map = new Map<string, CronRun[]>();
    for (const r of rows) {
      const slot = map.get(r.path) ?? [];
      slot.push(r);
      map.set(r.path, slot);
    }
    return Array.from(map.entries())
      .map(([path, runs]) => ({
        path,
        runs,
        latest: runs[0],
        failures: runs.filter((r) => r.status !== 'ok').length,
      }))
      .sort((a, b) => b.latest.started_at.localeCompare(a.latest.started_at));
  }, [rows]);

  if (!canRead) {
    return (
      <div className="p-10 text-center text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Admins only. <Link href="/feather" className="text-primary underline">Back to home</Link>.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Cron runs
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/55">
          Every Vercel-scheduled cron route logs a row to <code className="bg-warm-bg/60 px-1 rounded">public.cron_runs</code> on each invocation. Use this view to spot silent failures (status = failed / error) or a job that hasn&apos;t fired in too long.
        </p>
      </header>

      {loading ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-10">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-10">
          No cron runs recorded yet. The first run will land here within ~60s of the next scheduled tick.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.path} className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2 flex-wrap">
                <code className="text-[12.5px] font-semibold text-foreground">{g.path}</code>
                <div className="flex items-center gap-2 text-[10.5px] tabular-nums">
                  <span className="text-foreground/55">last run {timeAgo(g.latest.started_at)}</span>
                  {g.failures > 0 ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                      {g.failures} failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      Healthy
                    </span>
                  )}
                </div>
              </header>
              <ul className="divide-y divide-black/5">
                {g.runs.slice(0, 8).map((r) => {
                  const toneCx =
                    r.status === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                    r.status === 'failed' ? 'bg-amber-50 text-amber-800 ring-amber-200' :
                    'bg-rose-50 text-rose-700 ring-rose-200';
                  return (
                    <li key={r.id} className="px-4 py-2 flex items-start gap-3 text-[12px]">
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.14em] ring-1 ${toneCx}`}>
                        {r.status}
                      </span>
                      <span className="shrink-0 text-foreground/55 tabular-nums w-24">{fmtTime(r.started_at)}</span>
                      <span className="shrink-0 text-foreground/55 tabular-nums w-12">{fmtDuration(r.duration_ms)}</span>
                      <span className="flex-1 min-w-0 text-foreground/70 truncate">
                        {r.message ?? (r.payload ? JSON.stringify(r.payload) : '—')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
