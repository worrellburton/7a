'use client';

import { Fragment, useMemo, useState } from 'react';
import { Call, ScoreRow, parseDate, scoreColorClass } from './_shared';

export function SourcesPanel({ calls, scores, onOpenCall }: { calls: Call[]; scores: Record<string, ScoreRow>; onOpenCall: (id: number) => void }) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const MEANINGFUL = 60;

  const rows = useMemo(() => {
    const bySource = new Map<string, { count: number; meaningful: number; calls: Call[] }>();
    for (const c of calls) {
      const src = c.source_name || c.source || 'Unknown';
      let bucket = bySource.get(src);
      if (!bucket) { bucket = { count: 0, meaningful: 0, calls: [] }; bySource.set(src, bucket); }
      bucket.count++;
      const s = scores[String(c.id)];
      if (s?.fit_score != null && s.fit_score >= MEANINGFUL) bucket.meaningful++;
      bucket.calls.push(c);
    }
    for (const b of bySource.values()) {
      b.calls.sort((a, b) => {
        const ta = parseDate(a.called_at)?.getTime() ?? 0;
        const tb = parseDate(b.called_at)?.getTime() ?? 0;
        return tb - ta;
      });
    }
    return Array.from(bySource.entries())
      .map(([name, b]) => ({ name, ...b }))
      .sort((a, b) => b.count - a.count);
  }, [calls, scores]);

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="text-center py-16">
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Load calls first to see source breakdown</p>
        </div>
      </div>
    );
  }

  const total = calls.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Source</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Calls</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Meaningful</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>%</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(s => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              const meaningfulPct = s.count > 0 ? Math.round((s.meaningful / s.count) * 100) : 0;
              const isOpen = expandedSource === s.name;
              return (
                <Fragment key={s.name}>
                  <tr
                    onClick={() => setExpandedSource(isOpen ? null : s.name)}
                    className="cursor-pointer hover:bg-warm-bg/20 transition-colors"
                  >
                    <td className="px-3 sm:px-5 py-3.5 text-sm font-medium text-foreground">{s.name}</td>
                    <td className="px-3 sm:px-5 py-3.5 text-right text-sm font-bold text-foreground">{s.count}</td>
                    <td className="px-3 sm:px-5 py-3.5 text-right text-sm">
                      <span className="font-semibold text-blue-600">{s.meaningful}</span>
                      {s.count > 0 && <span className="text-foreground/40 text-[11px] ml-1">({meaningfulPct}%)</span>}
                    </td>
                    <td className="px-3 sm:px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-warm-bg rounded-full max-w-[120px]">
                          <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-foreground/40 w-8" style={{ fontFamily: 'var(--font-body)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-5 py-3.5 text-right">
                      <svg className={`inline w-4 h-4 text-foreground/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="bg-warm-bg/10 px-5 py-3">
                        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                          {s.calls.map(c => {
                            const score = scores[String(c.id)];
                            const d = parseDate(c.called_at);
                            const time = d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' }) : '';
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => onOpenCall(c.id)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-warm-bg/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${c.direction === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`} style={{ fontFamily: 'var(--font-body)' }}>
                                    {c.direction === 'inbound' ? 'In' : 'Out'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                      {score?.call_name || score?.caller_name || c.caller_number_formatted || c.caller_number || 'Call'}
                                    </p>
                                    <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{time}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {score?.fit_score != null && (
                                    <span className={`text-[11px] font-semibold ${scoreColorClass(score.fit_score)}`} style={{ fontFamily: 'var(--font-body)' }}>
                                      {score.fit_score}/100 fit
                                    </span>
                                  )}
                                  <span className={`text-xs font-bold ${scoreColorClass(score?.score ?? null)}`}>{score?.score ?? '—'}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
