'use client';

import { useEffect, useMemo, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import { type DateRange, fmtDuration, fmtNumber, fmtPct, toApiDate } from './shared';

interface AudienceResponse {
  countries: { country: string; users: number; sessions: number; engagementRate: number }[];
  states: { state: string; users: number; sessions: number }[];
  cities: { city: string; users: number; sessions: number }[];
  devices: { device: string; users: number; sessions: number; engagementRate: number; avgDurationSec: number }[];
  browsers: { browser: string; users: number }[];
  os: { os: string; users: number }[];
  languages: { language: string; users: number }[];
  ageBrackets: { bracket: string; users: number }[];
  genders: { gender: string; users: number }[];
}

export function AudienceSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<AudienceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/audience?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as AudienceResponse);
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
  }, [queryKey]);

  const totalUsers = useMemo(
    () => (data?.devices ?? []).reduce((a, b) => a + b.users, 0),
    [data]
  );

  if (error) {
    return (
      <GoogleReconnectBanner label="audience" error={error} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Device split — big */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(data?.devices ?? []).map((d) => {
          const share = totalUsers ? d.users / totalUsers : 0;
          return (
            <div key={d.device} className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50">
                  {d.device}
                </p>
                <DeviceIcon device={d.device} />
              </div>
              <p className="text-3xl font-bold text-foreground">{fmtNumber(d.users)}</p>
              <p className="text-xs text-foreground/50 mt-1">
                {fmtNumber(d.sessions)} sessions · {fmtPct(share, 0)} of users
              </p>
              <div className="mt-3 w-full h-2 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full bg-primary/70" style={{ width: `${(share * 100).toFixed(1)}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-foreground/40 uppercase tracking-wider">Engage.</p>
                  <p className="font-semibold text-foreground">{fmtPct(d.engagementRate)}</p>
                </div>
                <div>
                  <p className="text-foreground/40 uppercase tracking-wider">Avg. dur.</p>
                  <p className="font-semibold text-foreground">{fmtDuration(d.avgDurationSec)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {loading && !data ? <div className="col-span-3 text-xs text-foreground/50 py-6">Loading…</div> : null}
      </div>

      {/* Geography — countries + states + cities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankedList
          title="Top countries"
          rows={(data?.countries ?? []).map((c) => ({
            label: c.country || '(unknown)',
            value: c.users,
            secondary: `${fmtNumber(c.sessions)} sess · ${fmtPct(c.engagementRate)} eng.`,
          }))}
          loading={loading}
        />
        <RankedList
          title="Top states / regions"
          rows={(data?.states ?? []).map((s) => ({
            label: s.state || '(unknown)',
            value: s.users,
            secondary: `${fmtNumber(s.sessions)} sess`,
          }))}
          loading={loading}
        />
        <RankedList
          title="Top cities"
          rows={(data?.cities ?? []).map((c) => ({
            label: c.city || '(unknown)',
            value: c.users,
            secondary: `${fmtNumber(c.sessions)} sess`,
          }))}
          loading={loading}
        />
      </div>

      {/* Technology — browser / OS / language */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankedList
          title="Browser"
          rows={(data?.browsers ?? []).map((b) => ({ label: b.browser, value: b.users }))}
          loading={loading}
        />
        <RankedList
          title="Operating system"
          rows={(data?.os ?? []).map((o) => ({ label: o.os, value: o.users }))}
          loading={loading}
        />
        <RankedList
          title="Language"
          rows={(data?.languages ?? []).map((l) => ({ label: l.language, value: l.users }))}
          loading={loading}
        />
      </div>

      {/* Demographics — only if data exists */}
      {((data?.ageBrackets?.length ?? 0) > 0 || (data?.genders?.length ?? 0) > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data?.ageBrackets?.length ? (
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <h2 className="text-base font-bold text-foreground mb-4">Age brackets</h2>
              <BarList
                rows={data.ageBrackets.map((a) => ({ label: a.bracket, value: a.users }))}
              />
            </div>
          ) : null}
          {data?.genders?.length ? (
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <h2 className="text-base font-bold text-foreground mb-4">Gender</h2>
              <BarList
                rows={data.genders.map((g) => ({
                  label: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
                  value: g.users,
                }))}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-black/10 bg-warm-bg/30 p-5 text-[12px] text-foreground/60">
          Age &amp; gender demographics are hidden because Google Signals isn&apos;t enabled (or volume is
          below GA4&apos;s privacy threshold). Enable it in GA4 Admin → Data collection →
          Google signals data collection to light up these charts.
        </div>
      )}
    </div>
  );
}

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase();
  const symbol = d === 'mobile' ? '📱' : d === 'tablet' ? '📔' : '💻';
  return <span className="text-lg opacity-50">{symbol}</span>;
}

function RankedList({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: { label: string; value: number; secondary?: string }[];
  loading: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 10).map((r) => {
            const share = r.value / max;
            return (
              <li key={r.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-foreground truncate pr-2" title={r.label}>
                    {r.label}
                  </span>
                  <span className="text-foreground tabular-nums">{fmtNumber(r.value)}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-black/5 overflow-hidden">
                  <div className="h-full bg-primary/60" style={{ width: `${(share * 100).toFixed(1)}%` }} />
                </div>
                {r.secondary ? <p className="text-[10px] text-foreground/50 mt-0.5">{r.secondary}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-xs text-foreground/50 py-4">
          {loading ? 'Loading…' : 'No data in this range.'}
        </div>
      )}
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-3 text-sm">
      {rows.map((r) => {
        const share = total ? r.value / total : 0;
        return (
          <li key={r.label}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-semibold text-foreground">{r.label}</span>
              <span className="text-foreground tabular-nums">
                {fmtNumber(r.value)}{' '}
                <span className="text-foreground/40 text-xs">({fmtPct(share, 0)})</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
              <div className="h-full bg-primary/70" style={{ width: `${(share * 100).toFixed(1)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
