'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  OperatorAgg,
  OperatorCallEntry,
  OpSortKey,
  parseDate,
  scoreColorClass,
} from './_shared';
import { AudioScrubber } from './AudioScrubber';
import { OperatorCallLinkButton } from './LinkButtons';

export function OperatorInsightsPanel({ rangeStart, rangeEnd, token, onOpenCall }: { rangeStart: Date; rangeEnd: Date; token: string | null; onOpenCall: (ctmId: string, calledAt: string) => void }) {
  const [operators, setOperators] = useState<OperatorAgg[] | null>(null);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<OpSortKey>('avgScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    const from = rangeStart.toISOString();
    const to = rangeEnd.toISOString();
    (async () => {
      try {
        const res = await fetch(`/api/calls/operators?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && !data.error) setOperators(data.operators ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd, token]);

  const playAudio = (url: string | null) => {
    if (!url) return;
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      setAudioTime(0);
      setAudioDuration(0);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(url);
    a.ontimeupdate = () => setAudioTime(a.currentTime || 0);
    a.onloadedmetadata = () => setAudioDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.ondurationchange = () => setAudioDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const reset = () => { setPlayingUrl(null); setAudioTime(0); setAudioDuration(0); };
    a.onended = reset;
    a.onerror = reset;
    a.play().catch(reset);
    audioRef.current = a;
    setPlayingUrl(url);
    setAudioTime(0);
    setAudioDuration(0);
  };

  const seekAudio = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || time));
    setAudioTime(audioRef.current.currentTime);
  };

  const sorted = useMemo(() => {
    if (!operators) return [];
    const copy = [...operators];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      const va = (a[sortKey] as number | null) ?? -1;
      const vb = (b[sortKey] as number | null) ?? -1;
      return (va - vb) * dir;
    });
    return copy;
  }, [operators, sortKey, sortDir]);

  const setSort = (key: OpSortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const Th = ({ k, label, align = 'center' }: { k: OpSortKey; label: string; align?: 'left' | 'center' | 'right' }) => {
    const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
    return (
      <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 ${alignClass}`} style={{ fontFamily: 'var(--font-body)' }}>
        <button type="button" onClick={() => setSort(k)} className={`inline-flex items-center gap-1 hover:text-foreground ${align === 'center' ? 'justify-center' : ''}`}>
          {label}
          <span className="text-[9px] opacity-60">
            {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <svg className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" strokeLinecap="round" />
          <path d="M12 8h.01" strokeLinecap="round" />
        </svg>
        <p className="text-xs text-blue-900/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          Sometimes AI is wrong and doesn&apos;t transcribe things right so this isn&apos;t perfect — but it&apos;s better than nothing! Treat these as directional signals, not performance reviews. &quot;Converted&quot; = meaningful calls the AI tagged with a specific client type (insurance, private pay, etc.).
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && !operators ? (
          <div className="text-center py-16 text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Loading operator insights…</div>
        ) : (operators ?? []).length === 0 ? (
          <div className="text-center py-16 text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No operator data yet for this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-warm-bg/40">
                <tr>
                  <Th k="name" label="Operator" align="left" />
                  <Th k="count" label="# of Calls" />
                  <Th k="avgFit" label="Avg Fit" />
                  <Th k="meaningful" label="Meaningful Taken" />
                  <Th k="converted" label="Converted" />
                  <Th k="successPct" label="Success %" />
                  <Th k="avgScore" label="Avg Score" />
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(op => {
                  const isOpen = expandedOp === op.name;
                  return (
                    <Fragment key={op.name}>
                      <tr
                        onClick={() => { setExpandedOp(isOpen ? null : op.name); setExpandedCall(null); }}
                        className="cursor-pointer hover:bg-warm-bg/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                              {(op.name.match(/[A-Za-z]/)?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{op.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{op.count}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground/70">{op.avgFit != null ? op.avgFit : '—'}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">{op.meaningful}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground/30">—</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{op.meaningful > 0 ? `${op.successPct}%` : '—'}</td>
                        <td className={`px-4 py-3 text-center text-xl font-bold ${scoreColorClass(op.avgScore)}`}>{op.avgScore}</td>
                        <td className="px-4 py-3 text-right">
                          <svg className={`w-4 h-4 text-foreground/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} className="px-4 pb-5 bg-warm-bg/10">
                            <div className="space-y-4 pt-4">
                              <OperatorOverview op={op} />
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Strengths</p>
                                  {op.strengths.length === 0 ? (
                                    <p className="text-xs text-emerald-800/60" style={{ fontFamily: 'var(--font-body)' }}>No strengths surfaced yet.</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {op.strengths.slice(0, 8).map(s => (
                                        <li key={s.text} className="text-xs text-emerald-900 flex items-start gap-2" style={{ fontFamily: 'var(--font-body)' }}>
                                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          <span>{s.text}{s.count > 1 && <span className="text-emerald-700/60"> · {s.count}×</span>}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Potential to Improve</p>
                                  {op.weaknesses.length === 0 ? (
                                    <p className="text-xs text-amber-800/60" style={{ fontFamily: 'var(--font-body)' }}>No improvement areas surfaced yet.</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {op.weaknesses.slice(0, 8).map(w => (
                                        <li key={w.text} className="text-xs text-amber-900 flex items-start gap-2" style={{ fontFamily: 'var(--font-body)' }}>
                                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                          <span>{w.text}{w.count > 1 && <span className="text-amber-700/60"> · {w.count}×</span>}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              <div className="bg-white rounded-xl border border-gray-100">
                                <p className="px-4 py-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider border-b border-gray-100" style={{ fontFamily: 'var(--font-body)' }}>
                                  Calls by {op.name}
                                </p>
                                <div className="divide-y divide-gray-50">
                                  {op.calls.map(c => {
                                    const callOpen = expandedCall === c.ctm_id;
                                    const d = parseDate(c.called_at);
                                    const time = d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' }) : '';
                                    const isPlaying = playingUrl === c.audio_url;
                                    return (
                                      <div key={c.ctm_id}>
                                        <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); playAudio(c.audio_url); }}
                                            disabled={!c.audio_url}
                                            title={c.audio_url ? 'Play recording' : 'No recording'}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${c.audio_url ? (isPlaying ? 'bg-primary text-white' : 'bg-warm-bg hover:bg-primary hover:text-white text-foreground/60') : 'bg-gray-50 text-foreground/20 cursor-not-allowed'}`}
                                          >
                                            {isPlaying ? (
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                                            ) : (
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            )}
                                          </button>
                                          <OperatorCallLinkButton
                                            ctmId={c.ctm_id}
                                            onOpen={() => onOpenCall(c.ctm_id, c.called_at)}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setExpandedCall(callOpen ? null : c.ctm_id)}
                                            className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${c.direction === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`} style={{ fontFamily: 'var(--font-body)' }}>
                                                {c.direction === 'inbound' ? 'In' : 'Out'}
                                              </span>
                                              <div className="min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                  {c.call_name || c.caller_name || c.caller_number_formatted || c.caller_number || 'Call'}
                                                </p>
                                                <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                                                  {time}{c.client_type ? ` · ${c.client_type}` : ''}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                              {c.fit_score != null && (
                                                <span className={`text-[11px] font-semibold ${scoreColorClass(c.fit_score)}`} style={{ fontFamily: 'var(--font-body)' }}>
                                                  {c.fit_score}/100 fit
                                                </span>
                                              )}
                                              <span className={`text-xs font-bold ${scoreColorClass(c.score)}`}>{c.score ?? '—'}</span>
                                              <svg className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${callOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </div>
                                          </button>
                                        </div>
                                        {isPlaying && (
                                          <div className="px-4 pb-2.5 pl-11">
                                            <AudioScrubber currentTime={audioTime} duration={audioDuration} onSeek={seekAudio} />
                                          </div>
                                        )}
                                        {callOpen && (
                                          <div className="px-4 pb-3 pt-0 space-y-2 pl-11">
                                            {c.summary && (
                                              <div>
                                                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Summary</p>
                                                <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{c.summary}</p>
                                              </div>
                                            )}
                                            {(c.strengths.length > 0 || c.weaknesses.length > 0) && (
                                              <div className="grid sm:grid-cols-2 gap-2">
                                                {c.strengths.length > 0 && (
                                                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Strengths</p>
                                                    <ul className="space-y-1">
                                                      {c.strengths.map(s => (
                                                        <li key={s} className="text-[11px] text-emerald-900" style={{ fontFamily: 'var(--font-body)' }}>• {s}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                                {c.weaknesses.length > 0 && (
                                                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Potential to Improve</p>
                                                    <ul className="space-y-1">
                                                      {c.weaknesses.map(w => (
                                                        <li key={w} className="text-[11px] text-amber-900" style={{ fontFamily: 'var(--font-body)' }}>• {w}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {c.next_steps && (
                                              <div>
                                                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Next Steps</p>
                                                <p className="text-xs text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>{c.next_steps}</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
        )}
      </div>

      <TopBottomCalls operators={operators ?? []} onOpenCall={onOpenCall} playingUrl={playingUrl} onPlay={playAudio} audioTime={audioTime} audioDuration={audioDuration} onSeek={seekAudio} />
    </div>
  );
}

function OperatorOverview({ op }: { op: OperatorAgg }) {
  const inbound = op.calls.filter(c => c.direction === 'inbound').length;
  const outbound = op.calls.filter(c => c.direction === 'outbound').length;
  const avgTalkSec = op.calls.length > 0
    ? Math.round(op.calls.reduce((acc, c) => acc + (c.talk_time ?? 0), 0) / op.calls.length)
    : 0;
  const topStrength = op.strengths[0]?.text;
  const topWeakness = op.weaknesses[0]?.text;

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Overview</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Calls</p>
          <p className="text-lg font-bold text-foreground">{op.count}</p>
          <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{inbound} in · {outbound} out</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Meaningful / Converted</p>
          <p className="text-lg font-bold text-blue-600">{op.meaningful}<span className="text-sm text-foreground/40"> / {op.converted}</span></p>
          <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{op.meaningful > 0 ? `${op.successPct}% success` : 'No meaningful'}</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Avg Score</p>
          <p className={`text-lg font-bold ${scoreColorClass(op.avgScore)}`}>{op.avgScore}</p>
          <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>out of 100</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Avg Talk</p>
          <p className="text-lg font-bold text-foreground">{Math.floor(avgTalkSec / 60)}:{String(avgTalkSec % 60).padStart(2, '0')}</p>
          <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>per call</p>
        </div>
      </div>
      {(topStrength || topWeakness) && (
        <div className="text-xs text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          {topStrength && (<><span className="font-semibold text-emerald-700">Leads with</span> {topStrength}. </>)}
          {topWeakness && (<><span className="font-semibold text-amber-700">Common gap:</span> {topWeakness}.</>)}
        </div>
      )}
    </div>
  );
}

function TopBottomCalls({
  operators,
  onOpenCall,
  playingUrl,
  onPlay,
  audioTime,
  audioDuration,
  onSeek,
}: {
  operators: OperatorAgg[];
  onOpenCall: (ctmId: string, calledAt: string) => void;
  playingUrl: string | null;
  onPlay: (url: string | null) => void;
  audioTime: number;
  audioDuration: number;
  onSeek: (t: number) => void;
}) {
  const allCalls = useMemo(() => {
    const out: (OperatorCallEntry & { operatorName: string })[] = [];
    for (const op of operators) {
      for (const c of op.calls) {
        if (c.score == null) continue;
        out.push({ ...c, operatorName: op.name });
      }
    }
    return out;
  }, [operators]);

  if (allCalls.length === 0) return null;

  const sortedDesc = [...allCalls].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = sortedDesc.slice(0, 5);
  const bottom = [...sortedDesc].reverse().slice(0, 5);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <CallsSpotlight title="Top 5 Scored Calls" variant="top" calls={top} onOpenCall={onOpenCall} playingUrl={playingUrl} onPlay={onPlay} audioTime={audioTime} audioDuration={audioDuration} onSeek={onSeek} />
      <CallsSpotlight title="Bottom 5 Scored Calls" variant="bottom" calls={bottom} onOpenCall={onOpenCall} playingUrl={playingUrl} onPlay={onPlay} audioTime={audioTime} audioDuration={audioDuration} onSeek={onSeek} />
    </div>
  );
}

function CallsSpotlight({
  title,
  variant,
  calls,
  onOpenCall,
  playingUrl,
  onPlay,
  audioTime,
  audioDuration,
  onSeek,
}: {
  title: string;
  variant: 'top' | 'bottom';
  calls: (OperatorCallEntry & { operatorName: string })[];
  onOpenCall: (ctmId: string, calledAt: string) => void;
  playingUrl: string | null;
  onPlay: (url: string | null) => void;
  audioTime: number;
  audioDuration: number;
  onSeek: (t: number) => void;
}) {
  const barColor = variant === 'top' ? 'bg-emerald-500' : 'bg-red-500';
  const labelColor = variant === 'top' ? 'text-emerald-700' : 'text-red-600';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className={`inline-block w-1.5 h-5 rounded-sm ${barColor}`} />
        <p className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`} style={{ fontFamily: 'var(--font-body)' }}>{title}</p>
      </div>
      {calls.length === 0 ? (
        <div className="px-5 py-8 text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No scored calls yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {calls.map(c => {
            const d = parseDate(c.called_at);
            const time = d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' }) : '';
            const isPlaying = playingUrl === c.audio_url;
            return (
              <div key={c.ctm_id}>
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPlay(c.audio_url); }}
                    disabled={!c.audio_url}
                    title={c.audio_url ? 'Play recording' : 'No recording'}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${c.audio_url ? (isPlaying ? 'bg-primary text-white' : 'bg-warm-bg hover:bg-primary hover:text-white text-foreground/60') : 'bg-gray-50 text-foreground/20 cursor-not-allowed'}`}
                  >
                    {isPlaying ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCall(c.ctm_id, c.called_at)}
                    className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {c.call_name || c.caller_name || c.caller_number_formatted || c.caller_number || 'Call'}
                      </p>
                      <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                        {c.operatorName} · {time}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {c.fit_score != null && (
                        <span className={`text-[11px] font-semibold ${scoreColorClass(c.fit_score)}`} style={{ fontFamily: 'var(--font-body)' }}>
                          {c.fit_score}/100 fit
                        </span>
                      )}
                      <span className={`text-sm font-bold ${scoreColorClass(c.score)}`}>{c.score}</span>
                    </div>
                  </button>
                </div>
                {isPlaying && (
                  <div className="px-4 pb-2.5 pl-11">
                    <AudioScrubber currentTime={audioTime} duration={audioDuration} onSeek={onSeek} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
