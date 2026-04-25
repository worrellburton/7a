'use client';

import { useEffect, useRef, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { Sparkline } from './Sparkline';
import { fmtNumber } from './shared';

interface RealtimeResponse {
  activeUsers: number;
  newUsers: number;
  byMinute: number[];
  topPages: { title: string; activeUsers: number; views: number }[];
  topCountries: { country: string; activeUsers: number }[];
  topCities: { city: string; country: string; activeUsers: number }[];
  devices: { device: string; activeUsers: number }[];
  platforms: { platform: string; activeUsers: number }[];
  events: { name: string; count: number }[];
  fetched_at: string;
  cached?: boolean;
  quota_exhausted?: boolean;
  quota_message?: string;
}

// 60 s between polls. The realtime API charges quota tokens per
// dimension query, and 8 fan-out calls × 4 polls/min was burning
// the GA4 hourly budget. 60 s is fresh enough for a "right now"
// dashboard and stays well inside quota even with several admins
// watching at once.
const REFRESH_MS = 60_000;
// When GA4 reports the hourly quota is exhausted we stop polling
// for this long before retrying. Quota windows are hourly, so 5
// minutes between attempts is a reasonable middle ground — fast
// enough to recover quickly, slow enough not to immediately re-
// trip the limit.
const BACKOFF_MS = 5 * 60_000;

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
            // Quota errors come back as 429 — pause auto-refresh
            // for BACKOFF_MS instead of pounding the API.
            if (r.status === 429 && timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = setInterval(() => setTick((t) => t + 1), BACKOFF_MS);
            }
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
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          if (r.status === 429 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setTick((t) => t + 1), BACKOFF_MS);
          }
        } else {
          setError(null);
          setData(json as RealtimeResponse);
          // Came back ok after a backoff — restore normal cadence.
          if (timerRef.current && !paused) {
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
          }
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
      {data?.quota_exhausted && data?.cached ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12px] text-amber-900 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>
            {data.quota_message ||
              'GA4 hourly quota exhausted — showing the last known snapshot. The page will catch up once the quota resets (typically &lt;60 min).'}
          </span>
        </div>
      ) : null}

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
            <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
              {data && data.newUsers > 0 ? (
                <span className="inline-flex items-baseline gap-1.5 text-xs">
                  <span className="font-bold text-emerald-700 tabular-nums">{fmtNumber(data.newUsers)}</span>
                  <span className="text-foreground/55">first-time {data.newUsers === 1 ? 'visitor' : 'visitors'}</span>
                </span>
              ) : null}
              <span className="text-xs text-foreground/60">
                last 30 minutes · refreshes every 60 s {paused ? '(paused)' : ''}
              </span>
            </div>
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
            <button
              onClick={() => {
                // Pop the realtime tab out as a chrome-less window
                // sized for a side monitor. window.open returns null
                // when the popup is blocked — fall back to a normal
                // navigation in that case.
                const w = 980;
                const h = 760;
                const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
                const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
                const features = [
                  `width=${w}`,
                  `height=${h}`,
                  `left=${left}`,
                  `top=${top}`,
                  'popup=yes',
                  'noopener=yes',
                  'noreferrer=yes',
                ].join(',');
                const url = '/app/analytics?tab=realtime&popout=1';
                const popup = window.open(url, 'realtime-popout', features);
                if (!popup) {
                  // Most likely a popup blocker — open inline so the
                  // click isn't a dead end.
                  window.open(url, '_blank');
                }
              }}
              title="Open Realtime in a side window so you can keep it visible while working in another tab."
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white border border-black/10 text-foreground hover:bg-warm-bg"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M21 3l-9 9" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
              Pop out
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LivePanel title="Active pages" rows={
          (data?.topPages ?? []).map((p) => ({
            label: p.title,
            value: p.activeUsers,
            secondary: `${fmtNumber(p.views)} views`,
          }))
        } />
        <LivePanel
          title="Active cities"
          rows={(data?.topCities ?? []).map((c) => ({
            label: c.city,
            value: c.activeUsers,
            secondary: c.country || undefined,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LivePanel title="Active countries" rows={
          (data?.topCountries ?? []).map((c) => ({ label: c.country || '(unknown)', value: c.activeUsers }))
        } />
        <LivePanel title="Active devices" rows={
          (data?.devices ?? []).map((d) => ({ label: d.device, value: d.activeUsers }))
        } />
        <LivePanel title="Platforms" rows={
          (data?.platforms ?? []).map((p) => ({ label: p.platform, value: p.activeUsers }))
        } />
      </div>

      <LivePanel title="Recent events" rows={
        (data?.events ?? []).map((e) => ({ label: e.name, value: e.count }))
      } valueLabel="count" />

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
