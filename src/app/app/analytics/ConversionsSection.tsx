'use client';

import { useEffect, useState } from 'react';
import { type DateRange, fmtNumber, fmtPct, toApiDate } from './shared';

interface ConversionsResponse {
  summary: {
    sessions: number;
    engagedSessions: number;
    keyEvents: number;
    activeUsers: number;
    inboundCalls: number;
    answeredCalls: number;
    answerRate: number;
    convRate: number;
  };
  funnel: { stage: string; value: number }[];
  events: { name: string; count: number; perUser: number; activeUsers: number }[];
  keyEventCandidates: { name: string; count: number; perUser: number; activeUsers: number }[];
  byChannel: { channel: string; sessions: number; keyEvents: number; conversionRate: number }[];
  byLanding: { path: string; sessions: number; keyEvents: number; conversionRate: number }[];
  callTrend: { date: string; count: number }[];
}

export function ConversionsSection({ range }: { range: DateRange }) {
  const [data, setData] = useState<ConversionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryKey = `${toApiDate(range.start)}_${toApiDate(range.end)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/google/conversions?startDate=${toApiDate(range.start)}&endDate=${toApiDate(range.end)}`,
      { cache: 'no-store' }
    )
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(json as ConversionsResponse);
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

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <strong>Couldn&apos;t load conversions:</strong> {error}
      </div>
    );
  }

  const topStage = data?.funnel?.[0]?.value ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Sessions" value={data ? fmtNumber(data.summary.sessions) : loading ? '…' : '—'} />
        <Stat label="Engaged" value={data ? fmtNumber(data.summary.engagedSessions) : loading ? '…' : '—'} />
        <Stat label="Key events" value={data ? fmtNumber(data.summary.keyEvents) : loading ? '…' : '—'} />
        <Stat
          label="Conv. rate"
          value={data ? fmtPct(data.summary.convRate) : loading ? '…' : '—'}
          accent
        />
        <Stat
          label="Inbound calls"
          value={data ? fmtNumber(data.summary.inboundCalls) : loading ? '…' : '—'}
        />
        <Stat
          label="Answered"
          value={data ? fmtPct(data.summary.answerRate) : loading ? '…' : '—'}
        />
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-base font-bold text-foreground mb-1">Admissions funnel</h2>
        <p className="text-[11px] text-foreground/50 mb-4">
          Session → engagement → key event → call → answered call
        </p>
        {data?.funnel?.length ? (
          <div className="space-y-3">
            {data.funnel.map((f, i) => {
              const share = topStage ? f.value / topStage : 0;
              const dropFromPrev =
                i > 0 && data.funnel[i - 1].value > 0
                  ? 1 - f.value / data.funnel[i - 1].value
                  : 0;
              return (
                <div key={f.stage}>
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="font-semibold text-foreground">{f.stage}</span>
                    <span className="text-foreground">
                      {fmtNumber(f.value)}
                      {i > 0 ? (
                        <span className="text-foreground/40 ml-2 text-xs">
                          (-{fmtPct(dropFromPrev, 0)} from previous)
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="w-full h-5 rounded-lg bg-black/5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        i === 0
                          ? 'bg-primary/90'
                          : i === data.funnel.length - 1
                          ? 'bg-emerald-500/80'
                          : 'bg-primary/60'
                      }`}
                      style={{ width: `${Math.max(2, share * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty loading={loading} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Key events */}
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-base font-bold text-foreground">Conversion events</h2>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Auto-matched event names that look like leads (click, submit, phone, form, cta, lead)
            </p>
          </div>
          {data?.keyEventCandidates?.length ? (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Event</th>
                    <th className="px-5 py-3 text-right font-semibold">Count</th>
                    <th className="px-5 py-3 text-right font-semibold">Users</th>
                    <th className="px-5 py-3 text-right font-semibold">Per user</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keyEventCandidates.map((e) => (
                    <tr key={e.name} className="border-t border-black/5">
                      <td className="px-5 py-2.5 font-mono text-[12px] text-foreground">{e.name}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{fmtNumber(e.count)}</td>
                      <td className="px-5 py-2.5 text-right">{fmtNumber(e.activeUsers)}</td>
                      <td className="px-5 py-2.5 text-right">{e.perUser.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-6 text-xs text-foreground/50">
              {loading
                ? 'Loading…'
                : 'No conversion-looking events in range. Mark events as Key Events in GA4 Admin → Events, and/or add click+submit tracking to your phone and form CTAs.'}
            </div>
          )}
        </div>

        {/* Call volume trend */}
        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="text-base font-bold text-foreground">Inbound calls</h2>
          <p className="text-[11px] text-foreground/50 mt-0.5 mb-4">
            From CallTrackingMetrics, daily within range
          </p>
          {data?.callTrend?.length ? (
            <CallBarChart data={data.callTrend} />
          ) : (
            <Empty loading={loading} />
          )}
        </div>
      </div>

      {/* Conversion by channel + landing page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-base font-bold text-foreground">By channel</h2>
          </div>
          {data?.byChannel?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Channel</th>
                    <th className="px-5 py-3 text-right font-semibold">Sessions</th>
                    <th className="px-5 py-3 text-right font-semibold">Key events</th>
                    <th className="px-5 py-3 text-right font-semibold">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byChannel.map((c) => (
                    <tr key={c.channel} className="border-t border-black/5">
                      <td className="px-5 py-2.5 font-semibold text-foreground">{c.channel}</td>
                      <td className="px-5 py-2.5 text-right">{fmtNumber(c.sessions)}</td>
                      <td className="px-5 py-2.5 text-right">{fmtNumber(c.keyEvents)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{fmtPct(c.conversionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-base font-bold text-foreground">By landing page</h2>
          </div>
          {data?.byLanding?.length ? (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-[0.15em] text-foreground/50 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Landing page</th>
                    <th className="px-5 py-3 text-right font-semibold">Sessions</th>
                    <th className="px-5 py-3 text-right font-semibold">Key events</th>
                    <th className="px-5 py-3 text-right font-semibold">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byLanding.map((l) => (
                    <tr key={l.path} className="border-t border-black/5">
                      <td className="px-5 py-2.5 font-mono text-[12px] text-foreground truncate max-w-[260px]" title={l.path}>
                        {l.path || '/'}
                      </td>
                      <td className="px-5 py-2.5 text-right">{fmtNumber(l.sessions)}</td>
                      <td className="px-5 py-2.5 text-right">{fmtNumber(l.keyEvents)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{fmtPct(l.conversionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}

function CallBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-sm bg-primary/60 hover:bg-primary transition-colors"
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            title={`${d.date}: ${d.count} calls`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-foreground/50 mt-1">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? 'border-primary/20 bg-primary/5' : 'border-black/5 bg-white'
      }`}
    >
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-none ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="text-xs text-foreground/50 py-4 px-5">
      {loading ? 'Loading…' : 'No data in this range.'}
    </div>
  );
}
