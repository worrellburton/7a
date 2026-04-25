'use client';

import { useEffect, useRef, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { Sparkline } from './Sparkline';
import { fmtNumber } from './shared';

interface RealtimeResponse {
  activeUsers: number;
  byMinute: number[];
  topPages: { title: string; activeUsers: number; views: number }[];
  topCountries: { country: string; activeUsers: number }[];
  devices: { device: string; activeUsers: number }[];
  platforms: { platform: string; activeUsers: number }[];
  events: { name: string; count: number }[];
  fetched_at: string;
}

const REFRESH_MS = 15_000;

export function RealtimeSection() {
  const [data, setData] = useState<RealtimeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/google/realtime', { cache: 'no-store' })
        .then(async (r) => {
          const json = await r.json();
          if (cancelled) return;
          if (!r.ok) {
            setError(json?.error ?? `HTTP ${r.status}`);
          } else {
            setError(null);
            setData(json as RealtimeResponse);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        });
    };
    load();
    if (!paused) {
      timerRef.current = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    }
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  useEffect(() => {
    if (tick === 0) return;
    const controller = new AbortController();
    fetch('/api/google/realtime', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) setError(json?.error ?? `HTTP ${r.status}`);
        else {
          setError(null);
          setData(json as RealtimeResponse);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [tick]);

  if (error) {
    return (
      <GoogleReconnectBanner label="realtime" error={error} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Live users banner */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-700 mb-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active users right now
            </p>
            <p className="text-6xl font-bold text-foreground">
              {data ? fmtNumber(data.activeUsers) : '…'}
            </p>
            <p className="text-xs text-foreground/60 mt-1">
              last 30 minutes · refreshes every 15 s {paused ? '(paused)' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.byMinute?.length ? (
              <Sparkline
                values={data.byMinute}
                width={320}
                height={80}
                strokeClassName="stroke-emerald-500"
                fillClassName="fill-emerald-500/15"
              />
            ) : null}
            <button
              onClick={() => setPaused((p) => !p)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white border border-black/10 text-foreground hover:bg-warm-bg"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LivePanel title="Active pages" rows={
          (data?.topPages ?? []).map((p) => ({
            label: p.title,
            value: p.activeUsers,
            secondary: `${fmtNumber(p.views)} views`,
          }))
        } />
        <LivePanel title="Active countries" rows={
          (data?.topCountries ?? []).map((c) => ({ label: c.country || '(unknown)', value: c.activeUsers }))
        } />
        <LivePanel title="Active devices" rows={
          (data?.devices ?? []).map((d) => ({ label: d.device, value: d.activeUsers }))
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LivePanel title="Platforms" rows={
          (data?.platforms ?? []).map((p) => ({ label: p.platform, value: p.activeUsers }))
        } />
        <LivePanel title="Recent events" rows={
          (data?.events ?? []).map((e) => ({ label: e.name, value: e.count }))
        } valueLabel="count" />
      </div>

      {data?.fetched_at ? (
        <p className="text-xs text-foreground/40">
          Fetched {new Date(data.fetched_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function LivePanel({
  title,
  rows,
  valueLabel,
}: {
  title: string;
  rows: { label: string; value: number; secondary?: string }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 10).map((r, i) => {
            const share = r.value / max;
            return (
              <li key={`${r.label}-${i}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-foreground truncate pr-2" title={r.label}>
                    {r.label || '(unknown)'}
                  </span>
                  <span className="text-foreground tabular-nums">
                    {fmtNumber(r.value)}
                    {valueLabel ? <span className="text-foreground/40 text-xs ml-1">{valueLabel}</span> : null}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-black/5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70"
                    style={{ width: `${(share * 100).toFixed(1)}%` }}
                  />
                </div>
                {r.secondary ? <p className="text-[10px] text-foreground/50 mt-0.5">{r.secondary}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-xs text-foreground/50 py-4">No live data.</div>
      )}
    </div>
  );
}
