'use client';

import { useEffect, useMemo, useState } from 'react';
import { RangeSelector } from './RangeSelector';
import { SectionNav, SECTIONS, type AnalyticsSection } from './SectionNav';
import {
  type DateRange,
  rangeForPreset,
  toApiDate,
  fmtNumber,
  fmtDuration,
  fmtPct,
} from './shared';

interface Ga4Response {
  range: { startDate: string; endDate: string; days: number };
  summary: {
    sessions: number;
    activeUsers: number;
    pageViews: number;
    avgSessionDurationSec: number;
    bounceRate: number;
  };
  channels: { channel: string; sessions: number }[];
  topPages: { path: string; sessions: number; users: number }[];
  fetched_at: string;
}

export default function AnalyticsContent() {
  const [section, setSection] = useState<AnalyticsSection>('overview');
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('30d'));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Site-wide GA4 performance for sevenarrowsrecovery.com. Live from the
          Google Analytics Data API + Search Console.
        </p>
      </div>

      <RangeSelector range={range} onChange={setRange} />
      <SectionNav active={section} onChange={setSection} />

      {section === 'overview' && <OverviewSection range={range} />}
      {section !== 'overview' && <SectionStub section={section} />}
    </div>
  );
}

function OverviewSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<Ga4Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/google/ga4?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`;
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as Ga4Response);
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

  return (
    <>
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Couldn&apos;t load GA4:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="Sessions" value={data ? fmtNumber(data.summary.sessions) : loading ? '…' : '—'} />
        <Stat label="Active users" value={data ? fmtNumber(data.summary.activeUsers) : loading ? '…' : '—'} />
        <Stat label="Page views" value={data ? fmtNumber(data.summary.pageViews) : loading ? '…' : '—'} />
        <Stat
          label="Avg. session"
          value={data ? fmtDuration(data.summary.avgSessionDurationSec) : loading ? '…' : '—'}
        />
        <Stat label="Bounce rate" value={data ? fmtPct(data.summary.bounceRate) : loading ? '…' : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Traffic by channel">
          {data?.channels?.length ? (
            <ul className="text-sm divide-y divide-black/5">
              {data.channels.map((c) => (
                <li key={c.channel} className="flex items-center justify-between py-2">
                  <span className="text-foreground">{c.channel}</span>
                  <span className="font-semibold text-foreground">{fmtNumber(c.sessions)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>

        <Panel title="Top landing pages">
          {data?.topPages?.length ? (
            <ul className="text-sm divide-y divide-black/5">
              {data.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between py-2 gap-3">
                  <span className="text-foreground truncate" title={p.path}>{p.path || '/'}</span>
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {fmtNumber(p.sessions)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty loading={loading} />
          )}
        </Panel>
      </div>

      {data?.fetched_at ? (
        <p className="mt-6 text-xs text-foreground/40">
          Fetched {new Date(data.fetched_at).toLocaleString()} · range {data.range.startDate} → {data.range.endDate}
        </p>
      ) : null}
    </>
  );
}

function SectionStub({ section }: { section: AnalyticsSection }) {
  const meta = useMemo(() => SECTIONS.find((s) => s.key === section), [section]);
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-10 text-center">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40 mb-2">
        Coming next
      </p>
      <h2 className="text-xl font-bold text-foreground mb-1">{meta?.label}</h2>
      <p className="text-sm text-foreground/60 max-w-md mx-auto">
        {meta?.hint}. This section lands in a following phase — the range
        selector and navigation above are already wired, so it&apos;ll light up
        with live data as each phase ships.
      </p>
    </div>
  );
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
