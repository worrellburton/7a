'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { OperatorSchedule } from './OperatorSchedule';
import { OperatorCheatSheet } from './OperatorCheatSheet';
import { CallsHeatmap } from './CallsHeatmap';
import {
  type AircallCallRow,
  PHOENIX_TZ,
  directionStyle,
  formatDuration,
  formatPhone,
  formatRelativeTime,
  formatWait,
  initials,
} from './_shared';
import { callerLocation } from './area-codes';

const PER_PAGE = 50;

type RangePreset = 'today' | '7d' | '30d' | 'all';
type DirectionFilter = 'all' | 'inbound' | 'outbound';

interface AgentUser { email: string; avatar_url: string | null; full_name: string | null; }

// Phoenix is UTC-7 year-round (no DST), so local midnight is 07:00 UTC.
function phoenixMidnightUtc(daysAgo = 0): Date {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo, 7, 0, 0, 0));
}

function rangeFrom(preset: RangePreset): string | undefined {
  switch (preset) {
    case 'today': return phoenixMidnightUtc(0).toISOString();
    case '7d': return phoenixMidnightUtc(6).toISOString();
    case '30d': return phoenixMidnightUtc(29).toISOString();
    case 'all': return undefined;
  }
}

export default function CallsContent() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const router = useRouter();

  const [calls, setCalls] = useState<AircallCallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Operator-assigned names per caller number, overlaid on the Caller
  // column. Small table — fetched once and keyed by digit-only number.
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/aircall/number-label', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled && res.ok) setLabels((json.labels ?? {}) as Record<string, string>);
      } catch { /* non-fatal — names just don't overlay */ }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [missedOnly, setMissedOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Agent → platform-user lookup (avatar + name), matched on email. Keyed
  // by lowercased email; `requestedAgents` guards against refetching the
  // same emails as the visible page changes.
  const [agentUsers, setAgentUsers] = useState<Record<string, AgentUser>>({});
  const requestedAgents = useRef<Set<string>>(new Set());

  const [insights, setInsights] = useState<{ today: number; missedToday: number; week: number; answeredRate: number | null } | null>(null);

  // Inline recording playback — one shared <audio> driven from the rows
  // so you can hit play without opening the call. Audio streams through
  // the authenticated /api/aircall/recording proxy (cookie-auth).
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const togglePlay = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const a = audioElRef.current;
    if (!a) return;
    if (playingId === id) { a.pause(); setPlayingId(null); return; }
    a.src = `/api/aircall/recording/${id}`;
    a.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null));
  };

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [debouncedSearch, preset, direction, missedOnly]);

  const buildParams = useCallback((overrides?: Record<string, string>) => {
    const p = new URLSearchParams();
    const from = rangeFrom(preset);
    if (from) p.set('from', from);
    if (direction !== 'all') p.set('direction', direction);
    if (missedOnly) p.set('missed', '1');
    if (debouncedSearch) p.set('search', debouncedSearch);
    p.set('page', String(page));
    p.set('perPage', String(PER_PAGE));
    if (overrides) for (const [k, v] of Object.entries(overrides)) p.set(k, v);
    return p;
  }, [preset, direction, missedOnly, debouncedSearch, page]);

  const loadCalls = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aircall/list?${buildParams().toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load calls');
      setCalls(json.calls ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [token, buildParams]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  // Resolve the agents in the current page to platform users so the Agent
  // column can show their profile picture. Matched on email against the
  // users table (same source the operator schedule uses).
  useEffect(() => {
    const emails = Array.from(
      new Set(calls.map((c) => c.user_email).filter((e): e is string => !!e)),
    );
    const toFetch = emails.filter((e) => !requestedAgents.current.has(e.toLowerCase()));
    if (toFetch.length === 0) return;
    toFetch.forEach((e) => requestedAgents.current.add(e.toLowerCase()));
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('email, avatar_url, full_name')
        .in('email', toFetch);
      if (cancelled || error || !data) return;
      setAgentUsers((prev) => {
        const next = { ...prev };
        for (const u of data as AgentUser[]) if (u.email) next[u.email.toLowerCase()] = u;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [calls]);

  // Insights — cheap count-only fetches (perPage=1, read total).
  const loadInsights = useCallback(async () => {
    if (!token) return;
    const todayFrom = phoenixMidnightUtc(0).toISOString();
    const weekFrom = phoenixMidnightUtc(6).toISOString();
    const headers = { Authorization: `Bearer ${token}` };
    const count = async (params: Record<string, string>) => {
      const p = new URLSearchParams({ perPage: '1', page: '1', ...params });
      const res = await fetch(`/api/aircall/list?${p.toString()}`, { headers });
      const j = await res.json().catch(() => ({}));
      return res.ok ? (j.total ?? 0) : 0;
    };
    const sample = async () => {
      // Pull today's calls to estimate the answered rate.
      const p = new URLSearchParams({ from: todayFrom, perPage: '100', page: '1' });
      const res = await fetch(`/api/aircall/list?${p.toString()}`, { headers });
      const j = await res.json().catch(() => ({}));
      const rows: AircallCallRow[] = res.ok ? (j.calls ?? []) : [];
      const inbound = rows.filter((r) => r.direction === 'inbound');
      if (inbound.length === 0) return null;
      const answered = inbound.filter((r) => !r.missed).length;
      return Math.round((answered / inbound.length) * 100);
    };
    try {
      const [today, missedToday, week, answeredRate] = await Promise.all([
        count({ from: todayFrom }),
        count({ from: todayFrom, missed: '1' }),
        count({ from: weekFrom }),
        sample(),
      ]);
      setInsights({ today, missedToday, week, answeredRate });
    } catch {
      /* non-fatal */
    }
  }, [token]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Live updates — refetch (debounced) whenever aircall_calls changes.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('aircall_calls_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aircall_calls' }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => {
          loadCalls();
          loadInsights();
        }, 600);
      })
      .subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loadCalls, loadInsights]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const stats = useMemo(() => ([
    { label: 'Calls today', value: insights ? insights.today.toLocaleString() : '—' },
    { label: 'Missed today', value: insights ? insights.missedToday.toLocaleString() : '—', alert: !!insights && insights.missedToday > 0 },
    { label: 'Last 7 days', value: insights ? insights.week.toLocaleString() : '—' },
    { label: 'Answered rate (today)', value: insights?.answeredRate != null ? `${insights.answeredRate}%` : '—' },
  ]), [insights]);

  // Agent cell — profile picture (matched on email) + name, with an
  // initials fallback when the agent isn't a platform user / has no avatar.
  const renderAgent = (c: AircallCallRow) => {
    if (!c.user_name && !c.user_email) return <span className="text-foreground/30">—</span>;
    const u = c.user_email ? agentUsers[c.user_email.toLowerCase()] : undefined;
    const name = c.user_name || u?.full_name || c.user_email || '—';
    // Avatar only — name shows on hover (native tooltip + aria-label).
    return u?.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={u.avatar_url} alt={name} title={name} aria-label={name} className="h-7 w-7 rounded-full object-cover ring-1 ring-white shadow-sm" />
    ) : (
      <span title={name} aria-label={name} className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center ring-1 ring-white">
        {initials(name)}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <header className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Calls</h1>
            <p className="mt-0.5 text-sm text-foreground/55">
              Live Aircall activity{total > 0 && <> · {total.toLocaleString()} in view</>}
              <span className="text-foreground/30"> · </span>
              <a href="/feather/ctm" className="text-primary hover:underline font-medium">CTM</a>
            </p>
          </div>
          <button
            onClick={() => { loadCalls(); loadInsights(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/85 border border-white/70 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-white transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Shared hidden player for inline row playback. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioElRef} className="hidden" onEnded={() => setPlayingId(null)} />

      {/* Operator schedule */}
      <OperatorSchedule token={token} />

      {/* Admissions call-flow cheat sheet — collapsed row, drops down. */}
      <OperatorCheatSheet />

      {/* Insight stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${s.alert ? 'text-rose-600' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, contact, agent, line…"
            className="w-full pl-9 pr-3 py-2 rounded-full border border-white/70 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="inline-flex rounded-full border border-white/70 bg-white/70 p-0.5 text-xs font-semibold">
          {(['today', '7d', '30d', 'all'] as RangePreset[]).map((r) => (
            <button key={r} onClick={() => setPreset(r)} className={`px-3 py-1.5 rounded-full transition-colors ${preset === r ? 'bg-primary text-white shadow-sm' : 'text-foreground/60 hover:text-foreground'}`}>
              {r === 'today' ? 'Today' : r === 'all' ? 'All' : r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as DirectionFilter)}
          className="px-3 py-2 rounded-full border border-white/70 bg-white/70 text-xs font-semibold text-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <button
          onClick={() => setMissedOnly((v) => !v)}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${missedOnly ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-white/70 border-white/70 text-foreground/60 hover:text-foreground'}`}
        >
          Missed only
        </button>
        <button
          onClick={() => setShowHeatmap((v) => !v)}
          aria-pressed={showHeatmap}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${showHeatmap ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white/70 border-white/70 text-foreground/60 hover:text-foreground'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
          </svg>
          Heatmap
        </button>
      </div>

      {/* Optional call-volume heatmap (weekday × hour). */}
      {showHeatmap && (
        <CallsHeatmap
          token={token}
          from={rangeFrom(preset)}
          direction={direction}
          missed={missedOnly}
          search={debouncedSearch}
        />
      )}

      {/* Call list */}
      <div className="rounded-3xl border border-white/70 bg-white/55 backdrop-blur-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="px-5 py-10 text-center text-sm text-rose-600">{error}</div>
        ) : loading && calls.length === 0 ? (
          <div className="divide-y divide-foreground/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-foreground/5 animate-pulse" />
                <div className="flex-1 h-4 rounded bg-foreground/5 animate-pulse" />
                <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">No calls in this view</p>
            <p className="mt-1 text-xs text-foreground/50 max-w-md mx-auto">
              Once Aircall is connected and the webhook/backfill have run, calls appear here automatically and update live. Try widening the date range to “All”.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm [&_td]:align-top">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-foreground/40 border-b border-foreground/10">
                  <th className="text-left font-semibold px-5 py-3">When</th>
                  <th className="text-left font-semibold px-3 py-3">Caller</th>
                  <th className="text-left font-semibold px-3 py-3">Location</th>
                  <th className="text-left font-semibold px-3 py-3">Agent</th>
                  <th className="text-left font-semibold px-3 py-3">Summary</th>
                  <th className="text-left font-semibold px-3 py-3">Line</th>
                  <th className="text-right font-semibold px-3 py-3">Wait</th>
                  <th className="text-right font-semibold px-3 py-3">Duration</th>
                  <th className="text-left font-semibold px-3 py-3">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {calls.map((c) => (
                  <tr
                    key={c.aircall_id}
                    onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                    className={`cursor-pointer hover:bg-white/60 transition-colors ${c.missed ? 'bg-rose-50/40' : ''}`}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-foreground/70">{formatRelativeTime(c.started_at)}</td>
                    <td className="px-3 py-3">
                      {(() => {
                        const key = c.caller_number || (c.raw_digits || '').replace(/\D/g, '');
                        const phone = formatPhone(c.raw_digits || c.caller_number);
                        const display = (key && labels[key]) || c.contact_name;
                        return (
                          <>
                            {display && <div className="font-medium text-foreground">{display}</div>}
                            {key ? (
                              <Link
                                href={`/feather/calls/number/${encodeURIComponent(key)}`}
                                onClick={(e) => e.stopPropagation()}
                                title="See every call from this number"
                                className={`${display ? 'text-[11px] text-foreground/45' : 'font-medium text-foreground'} hover:text-primary hover:underline`}
                              >
                                {phone}
                              </Link>
                            ) : (
                              <div className={display ? 'text-[11px] text-foreground/45' : 'font-medium text-foreground'}>{phone}</div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const loc = callerLocation(c.raw_digits || c.caller_number);
                        return loc
                          ? <span className="text-foreground/70" title={loc.name}>{loc.abbr}</span>
                          : <span className="text-foreground/30">—</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3">{renderAgent(c)}</td>
                    <td className="px-3 py-3">
                      {c.summary
                        ? <div className="max-w-[380px] whitespace-pre-line text-[12px] leading-snug text-foreground/60">{c.summary}</div>
                        : <span className="text-foreground/30">—</span>}
                    </td>
                    <td className="px-3 py-3 text-foreground/60 whitespace-nowrap">
                      {(() => {
                        // Show just the last 4 digits of the called line
                        // to keep the column narrow + single-line; the
                        // full line name + number live in the tooltip.
                        const digits = (c.number_digits || '').replace(/\D/g, '');
                        const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
                        const title = [c.number_name, c.number_digits ? formatPhone(c.number_digits) : null].filter(Boolean).join(' · ');
                        if (last4) return <span className="tabular-nums" title={title || undefined}>…{last4}</span>;
                        return c.number_name
                          ? <span title={c.number_name}>{c.number_name}</span>
                          : <span className="text-foreground/30">—</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground/60">{formatWait(c.started_at, c.answered_at)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground/70">{formatDuration(c.duration)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${directionStyle[c.direction ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.direction ?? 'call'}
                        </span>
                        {c.missed && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700">Missed</span>}
                        {c.voicemail && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Voicemail</span>}
                        {(c.tags ?? []).slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/5 text-foreground/60">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-foreground/30">
                        {c.recording_url && (
                          <button
                            onClick={(e) => togglePlay(e, c.aircall_id)}
                            aria-label={playingId === c.aircall_id ? 'Pause recording' : 'Play recording'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {playingId === c.aircall_id ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                          </button>
                        )}
                        {c.has_transcript && <svg className="w-4 h-4 text-emerald-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile rows */}
            <div className="sm:hidden divide-y divide-foreground/5">
              {calls.map((c) => (
                <div key={c.aircall_id} className={`px-4 py-3 flex items-center gap-3 ${c.missed ? 'bg-rose-50/40' : ''}`}>
                  <button
                    onClick={() => router.push(`/feather/calls/${c.aircall_id}`)}
                    className="min-w-0 flex-1 text-left flex items-center gap-3"
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${c.missed ? 'bg-rose-500' : c.direction === 'inbound' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{(c.caller_number && labels[c.caller_number]) || c.contact_name || formatPhone(c.raw_digits || c.caller_number)}</p>
                      <p className="text-[11px] text-foreground/45 truncate">{formatRelativeTime(c.started_at)} · {c.user_name || c.number_name || c.direction}</p>
                      {c.summary && (
                        <p className="mt-1 text-[11px] text-foreground/55 leading-snug whitespace-pre-line">
                          <span className="font-bold uppercase tracking-wider text-primary/80">AI</span> {c.summary}
                        </p>
                      )}
                    </div>
                  </button>
                  <span className="text-xs tabular-nums text-foreground/50 shrink-0">{formatDuration(c.duration)}</span>
                  {c.recording_url && (
                    <button
                      onClick={(e) => togglePlay(e, c.aircall_id)}
                      aria-label={playingId === c.aircall_id ? 'Pause recording' : 'Play recording'}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0"
                    >
                      {playingId === c.aircall_id ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                      ) : (
                        <svg className="w-4 h-4 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between mt-4 text-xs text-foreground/55">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-full border border-white/70 bg-white/70 font-semibold disabled:opacity-40 hover:bg-white transition-colors">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-full border border-white/70 bg-white/70 font-semibold disabled:opacity-40 hover:bg-white transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
