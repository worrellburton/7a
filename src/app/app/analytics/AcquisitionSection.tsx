'use client';

import { useEffect, useMemo, useState } from 'react';
import GoogleReconnectBanner from './GoogleReconnectBanner';
import {
  type DateRange,
  fmtDuration,
  fmtNumber,
  fmtPct,
  toApiDate,
} from './shared';

interface ChannelRow {
  channel: string;
  sessions: number;
  activeUsers: number;
  engagementRate: number;
  avgDurationSec: number;
  pagesPerSession: number;
  bounceRate: number;
}

interface SourceRow {
  source: string;
  medium: string;
  sessions: number;
  activeUsers: number;
  engagementRate: number;
  avgDurationSec: number;
  bounceRate: number;
}

interface CampaignRow {
  campaign: string;
  sessions: number;
  activeUsers: number;
  engagementRate: number;
  avgDurationSec: number;
}

interface ReferrerRow {
  host: string;
  sessions: number;
  activeUsers: number;
}

interface AcquisitionResponse {
  channels: ChannelRow[];
  sources: SourceRow[];
  campaigns: CampaignRow[];
  referrers: ReferrerRow[];
  landingByChannel: Record<string, { path: string; sessions: number }[]>;
}

export function AcquisitionSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<AcquisitionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/acquisition?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as AcquisitionResponse);
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

  const totalSessions = useMemo(
    () => (data?.channels ?? []).reduce((sum, c) => sum + c.sessions, 0),
    [data]
  );

  if (error) {
    return (
      <GoogleReconnectBanner label="acquisition data" error={error} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel grid — the big one */}
      <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Traffic by channel</h2>
          <span className="text-[11px] text-foreground/50">Default Channel Grouping</span>
        </div>
        {loading && !data ? (
          <LoadingRow />
        ) : data?.channels?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                <tr>
                  <Th align="left">Channel</Th>
                  <Th align="right">Sessions</Th>
                  <Th align="right">Users</Th>
                  <Th align="right">Engagement</Th>
                  <Th align="right">Avg. dur.</Th>
                  <Th align="right">Pages/sess.</Th>
                  <Th align="right">Bounce</Th>
                  <Th align="right">Share</Th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((c) => {
                  const share = totalSessions ? c.sessions / totalSessions : 0;
                  return (
                    <tr key={c.channel} className="border-t border-black/5">
                      <Td className="font-semibold text-foreground">{c.channel}</Td>
                      <Td align="right">{fmtNumber(c.sessions)}</Td>
                      <Td align="right">{fmtNumber(c.activeUsers)}</Td>
                      <Td align="right">{fmtPct(c.engagementRate)}</Td>
                      <Td align="right">{fmtDuration(c.avgDurationSec)}</Td>
                      <Td align="right">{c.pagesPerSession.toFixed(2)}</Td>
                      <Td align="right">{fmtPct(c.bounceRate)}</Td>
                      <Td align="right">
                        <div className="inline-flex items-center gap-2">
                          <span className="w-20 h-1.5 rounded-full bg-black/5 overflow-hidden">
                            <span
                              className="block h-full bg-primary/60"
                              style={{ width: `${(share * 100).toFixed(1)}%` }}
                            />
                          </span>
                          <span className="tabular-nums">{fmtPct(share, 0)}</span>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty loading={loading} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source / Medium */}
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-base font-bold text-foreground">Source &amp; medium</h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Top 15 by sessions
            </p>
          </div>
          {data?.sources?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                  <tr>
                    <Th align="left">Source / Medium</Th>
                    <Th align="right">Sess.</Th>
                    <Th align="right">Eng.</Th>
                    <Th align="right">Avg. dur.</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.slice(0, 15).map((s) => (
                    <tr key={`${s.source}/${s.medium}`} className="border-t border-black/5">
                      <Td>
                        <span className="font-semibold text-foreground">{s.source}</span>
                        <span className="text-foreground/40 mx-1">/</span>
                        <span className="text-foreground/70">{s.medium}</span>
                      </Td>
                      <Td align="right">{fmtNumber(s.sessions)}</Td>
                      <Td align="right">{fmtPct(s.engagementRate)}</Td>
                      <Td align="right">{fmtDuration(s.avgDurationSec)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>

        {/* Campaigns + Referrers stacked */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5">
              <h2 className="text-base font-bold text-foreground">Campaigns</h2>
              <p className="text-[11px] text-foreground/50 mt-0.5">
                UTM-tagged only (paid, email, promotions)
              </p>
            </div>
            {data?.campaigns?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                    <tr>
                      <Th align="left">Campaign</Th>
                      <Th align="right">Sess.</Th>
                      <Th align="right">Eng.</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.slice(0, 8).map((c) => (
                      <tr key={c.campaign} className="border-t border-black/5">
                        <Td className="font-semibold text-foreground truncate max-w-[200px]" title={c.campaign}>
                          {c.campaign}
                        </Td>
                        <Td align="right">{fmtNumber(c.sessions)}</Td>
                        <Td align="right">{fmtPct(c.engagementRate)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-xs text-foreground/50">
                {loading ? 'Loading…' : 'No UTM-tagged campaigns in this range. Tag paid traffic with utm_campaign to see it here.'}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5">
              <h2 className="text-base font-bold text-foreground">Referrers</h2>
              <p className="text-[11px] text-foreground/50 mt-0.5">
                Domains sending traffic via referral
              </p>
            </div>
            {data?.referrers?.length ? (
              <ul className="divide-y divide-black/5 text-sm">
                {data.referrers.map((r) => (
                  <li key={r.host} className="flex items-center justify-between px-5 py-2">
                    <a
                      href={`https://${r.host}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary truncate"
                      title={r.host}
                    >
                      {r.host}
                    </a>
                    <span className="font-semibold text-foreground">{fmtNumber(r.sessions)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty loading={loading} />
            )}
          </div>
        </div>
      </div>

      {/* Landing page by channel */}
      {data?.landingByChannel && Object.keys(data.landingByChannel).length > 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-base font-bold text-foreground">Top landing pages by channel</h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Entry pages driving sessions within each channel
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-black/5">
            {Object.entries(data.landingByChannel)
              .sort((a, b) => {
                const aTop = a[1][0]?.sessions ?? 0;
                const bTop = b[1][0]?.sessions ?? 0;
                return bTop - aTop;
              })
              .slice(0, 6)
              .map(([channel, pages]) => (
                <div key={channel} className="p-5">
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-3">
                    {channel}
                  </p>
                  <ul className="space-y-1.5 text-[13px]">
                    {pages.map((p) => (
                      <li key={p.path} className="flex items-center justify-between gap-3">
                        <span className="truncate text-foreground/80" title={p.path}>
                          {p.path || '/'}
                        </span>
                        <span className="font-semibold text-foreground whitespace-nowrap">
                          {fmtNumber(p.sessions)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Th({ align = 'left', children }: { align?: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <th className={`px-5 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({
  align = 'left',
  className = '',
  children,
  title,
}: {
  align?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <td
      className={`px-5 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      title={title}
    >
      {children}
    </td>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="px-5 py-6 text-xs text-foreground/50">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="px-5 py-8 text-xs text-foreground/50">Loading channels…</div>
  );
}
