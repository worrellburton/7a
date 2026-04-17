'use client';

import { useAuth } from '@/lib/AuthProvider';
import { getAuthToken } from '@/lib/db';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CallAiBadge from './CallAiHover';

interface ScoreRow {
  call_id: string;
  score: number;
  call_name: string | null;
  caller_name: string | null;
  operator_name: string | null;
  caller_interest: string | null;
  client_type: string | null;
  fit_score: number | null;
  summary: string;
  operator_strengths: string[];
  operator_weaknesses: string[];
  next_steps: string | null;
  sentiment: string | null;
  transcript: string | null;
  scored_at: string;
}

interface Call {
  id: number;
  name: string;
  caller_number: string;
  caller_number_formatted: string;
  tracking_number: string;
  tracking_number_formatted: string;
  receiving_number: string;
  receiving_number_formatted: string;
  duration: number;
  talk_time: number;
  ring_time: number;
  direction: string;
  source: string;
  source_name: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  called_at: string;
  tracking_label: string;
  audio: string;
  tag_list: string[];
  status: string;
  voicemail: boolean;
  first_call: boolean;
  business_number: string;
  score: number | null;
  notes: string;
}

interface CTMResponse {
  calls?: Call[];
  total_entries?: number;
  total_pages?: number;
  page?: number;
  per_page?: number;
  error?: string;
}

type Tab = 'calls' | 'sources';

interface Insights {
  today: number;
  yesterday: number;
  thisWeek: number;
  allTime: number;
  avgDuration: number;
  inbound: number;
  outbound: number;
  dailyCounts: { label: string; short: string; date: string; count: number; sources: { name: string; count: number }[] }[];
}

async function ctmFetch(endpoint: string, params?: Record<string, string | number>): Promise<CTMResponse> {
  const token = getAuthToken();
  const res = await fetch('/api/ctm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params }),
  });
  return res.json();
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return dateStr; }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  } catch { return ''; }
}

const directionStyle: Record<string, string> = {
  inbound: 'bg-emerald-50 text-emerald-700',
  outbound: 'bg-blue-50 text-blue-700',
};

function clientTypeBg(type: string): string {
  switch (type) {
    case 'Insurance': return 'bg-blue-50 text-blue-700';
    case 'Private Pay': return 'bg-amber-50 text-amber-700';
    case 'Mental Health': return 'bg-purple-50 text-purple-700';
    case 'Addiction': return 'bg-red-50 text-red-700';
    case 'Dual Diagnosis': return 'bg-indigo-50 text-indigo-700';
    case 'Family/Loved One': return 'bg-pink-50 text-pink-700';
    default: return 'bg-gray-50 text-gray-600';
  }
}

function fitScoreBg(s: number): string {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-400';
}

export default function CallsContent() {
  const { user, session } = useAuth();
  const [tab, setTab] = useState<Tab>('calls');
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [miniPopoverId, setMiniPopoverId] = useState<number | null>(null);
  const [transcriptFor, setTranscriptFor] = useState<number | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [sources, setSources] = useState<{ name: string; count: number }[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [scoringErrors, setScoringErrors] = useState<Record<string, string>>({});
  const scoringRef = useRef(false);

  const knownOperators = useMemo(() => {
    const names = new Set<string>();
    for (const s of Object.values(scores)) {
      if (s?.operator_name) names.add(s.operator_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [scores]);

  const setManualOperator = useCallback(async (callId: string, operatorName: string | null) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/claude/calls/set-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId, operator_name: operatorName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) setScores((prev) => ({ ...prev, [callId]: data.result }));
      }
    } catch { /* swallow — UI keeps the stale value */ }
  }, [session?.access_token]);

  const rescoreCall = useCallback(async (callId: string, force: boolean) => {
    if (!session?.access_token) {
      setScoringErrors((prev) => ({ ...prev, [callId]: 'Not signed in' }));
      return;
    }
    const call = calls.find((c) => String(c.id) === callId);
    if (!call) {
      setScoringErrors((prev) => ({ ...prev, [callId]: 'Call not found' }));
      return;
    }
    setScoringIds((prev) => { const n = new Set(prev); n.add(callId); return n; });
    setScoringErrors((prev) => { const n = { ...prev }; delete n[callId]; return n; });
    try {
      const res = await fetch('/api/claude/calls/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId, call, force }),
      });
      let data: { result?: ScoreRow; error?: string; detail?: string } = {};
      try { data = await res.json(); } catch { /* non-json response */ }
      if (!res.ok) {
        const msg = data.error || data.detail || `Analyze failed (${res.status})`;
        setScoringErrors((prev) => ({ ...prev, [callId]: msg }));
        return;
      }
      if (data.result) {
        setScores((prev) => ({ ...prev, [callId]: data.result! }));
      } else {
        setScoringErrors((prev) => ({ ...prev, [callId]: data.error || 'No result returned' }));
      }
    } catch (err) {
      setScoringErrors((prev) => ({ ...prev, [callId]: err instanceof Error ? err.message : 'Network error' }));
    } finally {
      setScoringIds((prev) => { const n = new Set(prev); n.delete(callId); return n; });
    }
  }, [calls, session?.access_token]);

  // Discover account ID first
  useEffect(() => {
    if (!session?.access_token) return;
    async function discoverAccount() {
      // CTM accounts endpoint to get the account ID
      const data = await ctmFetch('/accounts.json');
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      // The response might be an array of accounts or a single account
      const accounts = (data as Record<string, unknown>).accounts as { id: number }[] | undefined;
      if (accounts && accounts.length > 0) {
        setAccountId(String(accounts[0].id));
      } else if ((data as Record<string, unknown>).id) {
        setAccountId(String((data as Record<string, unknown>).id));
      } else {
        // Try common pattern: the response itself might list calls
        setError('Could not determine CTM account ID. Check API credentials.');
        setLoading(false);
      }
    }
    discoverAccount();
  }, [session]);

  // Fetch insights data — grab all calls and compute stats client-side
  useEffect(() => {
    if (!accountId) return;
    async function loadInsights() {
      setInsightsLoading(true);
      try {
        // Fetch all calls (paginate if needed)
        let allCalls: Call[] = [];
        let pg = 1;
        let totalPages = 1;
        let allTime = 0;
        while (pg <= totalPages && pg <= 10) { // cap at 10 pages (250 calls)
          const data = await ctmFetch(`/accounts/${accountId}/calls.json`, { page: pg, per_page: 25 });
          if (data.calls) allCalls = allCalls.concat(data.calls);
          totalPages = data.total_pages || 1;
          allTime = data.total_entries || 0;
          pg++;
        }

        const now = new Date();
        // Build last 7 days in Arizona time
        const days: { label: string; short: string; date: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
          const label = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Phoenix' });
          const short = d.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'America/Phoenix' });
          days.push({ label, short, date: dateStr });
        }

        const todayStr = days[6].date;
        const yesterdayStr = days[5].date;
        const weekDates = new Set(days.map(d => d.date));

        // Group all calls by date, tracking source breakdowns per day
        const dayCounts = new Map<string, number>();
        const daySources = new Map<string, Map<string, number>>();
        let weekDuration = 0;
        let weekCallCount = 0;
        let inboundCount = 0;
        let outboundCount = 0;

        allCalls.forEach(c => {
          const callDate = new Date(c.called_at).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
          dayCounts.set(callDate, (dayCounts.get(callDate) || 0) + 1);
          const src = c.source_name || c.source || 'Unknown';
          if (!daySources.has(callDate)) daySources.set(callDate, new Map());
          const bucket = daySources.get(callDate)!;
          bucket.set(src, (bucket.get(src) || 0) + 1);
          if (weekDates.has(callDate)) {
            weekDuration += c.duration || 0;
            weekCallCount++;
            if (c.direction === 'inbound') inboundCount++;
            if (c.direction === 'outbound') outboundCount++;
          }
        });

        const dailyCounts = days.map(d => {
          const bucket = daySources.get(d.date);
          const sources = bucket
            ? Array.from(bucket.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
            : [];
          return { ...d, count: dayCounts.get(d.date) || 0, sources };
        });

        setInsights({
          today: dayCounts.get(todayStr) || 0,
          yesterday: dayCounts.get(yesterdayStr) || 0,
          thisWeek: weekCallCount,
          allTime,
          avgDuration: weekCallCount > 0 ? Math.round(weekDuration / weekCallCount) : 0,
          inbound: inboundCount,
          outbound: outboundCount,
          dailyCounts,
        });
      } catch {
        // Insights are non-critical
      }
      setInsightsLoading(false);
    }
    loadInsights();
  }, [accountId]);

  const fetchCalls = useCallback(async (p: number) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page: p, per_page: 25 };
    if (searchQuery) params.search = searchQuery;
    if (dateFilter) params.start_date = dateFilter;
    if (directionFilter !== 'all') params.direction = directionFilter;

    const data = await ctmFetch(`/accounts/${accountId}/calls.json`, params);

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    if (data.calls) {
      setCalls(data.calls);
      setTotalPages(data.total_pages || 1);
      setTotalEntries(data.total_entries || 0);
      setPage(data.page || p);

      // Build sources summary
      const sourceMap = new Map<string, number>();
      data.calls.forEach((c: Call) => {
        const src = c.source_name || c.source || 'Unknown';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      setSources(Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }

    setLoading(false);
  }, [accountId, searchQuery, dateFilter, directionFilter]);

  useEffect(() => {
    if (accountId) fetchCalls(1);
  }, [accountId, fetchCalls]);

  // Auto-score: fetch existing scores, then queue unscored calls
  useEffect(() => {
    if (!session?.access_token || calls.length === 0) return;
    let cancelled = false;
    (async () => {
      const callIds = calls.map((c) => String(c.id));
      try {
        const res = await fetch('/api/claude/calls/scores-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ callIds }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.scores) {
          setScores((prev) => ({ ...prev, ...data.scores }));
        }
        // Auto-score unscored calls
        const unscoredCalls = calls.filter((c) => !data.scores?.[String(c.id)]);
        if (unscoredCalls.length > 0 && !scoringRef.current) {
          scoringRef.current = true;
          for (const call of unscoredCalls) {
            if (cancelled) break;
            try {
              const scoreRes = await fetch('/api/claude/calls/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ callId: String(call.id), call }),
              });
              if (scoreRes.ok) {
                const scoreData = await scoreRes.json();
                if (scoreData.result) {
                  setScores((prev) => ({ ...prev, [String(call.id)]: scoreData.result }));
                }
              }
            } catch { /* continue */ }
          }
          scoringRef.current = false;
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, calls]);

  const playRecording = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(url);
  };

  if (!user) return null;

  return (
    <div className="p-3 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Calls</h1>
          <p className="text-xs sm:text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Call tracking powered by CTM
            {totalEntries > 0 && <span> &middot; {totalEntries.toLocaleString()} total calls</span>}
          </p>
        </div>
        <a
          href="/app/calls/heatmap"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h2v2H7zM11 8h2v2h-2zM15 8h2v2h-2zM7 12h2v2H7zM11 12h2v2h-2zM15 12h2v2h-2zM7 16h2v0H7zM11 16h2v0h-2zM15 16h2v0h-2z" />
          </svg>
          View Heatmap
        </a>
      </div>

      {/* Insights Dashboard */}
      {insightsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-16 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : insights && (
        <div className="mb-6 space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Today</p>
              <p className="text-2xl font-bold text-foreground">{insights.today}</p>
              <p className="text-xs text-foreground/30 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {insights.inbound > 0 || insights.outbound > 0 ? `${insights.inbound} in / ${insights.outbound} out this week` : 'No calls yet'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Yesterday</p>
              <p className="text-2xl font-bold text-foreground">{insights.yesterday}</p>
              <p className="text-xs text-foreground/30 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {insights.yesterday > insights.today ? (
                  <span className="text-red-400">{insights.yesterday - insights.today} more than today</span>
                ) : insights.today > insights.yesterday ? (
                  <span className="text-emerald-500">{insights.today - insights.yesterday} fewer than today</span>
                ) : 'Same as today'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>This Week</p>
              <p className="text-2xl font-bold text-foreground">{insights.thisWeek}</p>
              <p className="text-xs text-foreground/30 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Avg {formatDuration(insights.avgDuration)} per call
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>All Time</p>
              <p className="text-2xl font-bold text-foreground">{insights.allTime.toLocaleString()}</p>
              <p className="text-xs text-foreground/30 mt-1" style={{ fontFamily: 'var(--font-body)' }}>Total calls tracked</p>
            </div>
          </div>

          {/* Weekly Line Graph */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>This Week</p>
              <div className="flex items-center gap-3">
                {dateFilter && (
                  <button
                    onClick={() => { setDateFilter(''); }}
                    className="text-[11px] text-foreground/40 hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Clear day filter
                  </button>
                )}
                <span className="flex items-center gap-1 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="w-2 h-2 rounded-full bg-[#a0522d]" /> Calls
                </span>
              </div>
            </div>
            <WeekGraph
              data={insights.dailyCounts}
              selectedDate={dateFilter}
              onDayClick={(date) => {
                setDateFilter(date);
                setTab('calls');
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
          <p className="text-sm text-red-700 font-medium">CTM API Error</p>
          <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-warm-bg rounded-xl p-1 w-fit">
        {(['calls', 'sources'] as Tab[]).map(t => {
          const label = t === 'calls' ? 'Call Log' : 'Sources';
          return (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {tab === 'calls' && (
        <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchCalls(1); }}
            placeholder="Search calls..."
            className="px-3 py-2 rounded-lg text-sm border border-gray-100 bg-white focus:outline-none focus:border-primary flex-1 min-w-[140px] sm:w-48 sm:flex-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); }}
            className="px-3 py-2 rounded-lg text-sm border border-gray-100 bg-white focus:outline-none focus:border-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="relative">
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="relative">
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="all">All Operators</option>
              {Array.from(new Set(
                Object.values(scores)
                  .map(s => s.operator_name)
                  .filter((n): n is string => !!n)
              )).sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button onClick={() => fetchCalls(1)} className="px-4 py-2 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Search
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Call Log Tab */}
      {tab === 'calls' && !loading && (
        <>
          {calls.length === 0 && !error ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
              <svg className="w-12 h-12 mx-auto text-foreground/15 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No calls found</p>
            </div>
          ) : calls.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-warm-bg/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Call ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Fit</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Call Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date / Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Number</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Caller</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Operator</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Direction</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Source</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Duration</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Location</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recording</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Transcript</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {calls.filter(call => {
                      if (operatorFilter === 'all') return true;
                      const s = scores[String(call.id)];
                      return s?.operator_name === operatorFilter;
                    }).map(call => {
                      const expanded = expandedId === call.id;
                      return (
                        <Fragment key={call.id}>
                          <tr onClick={() => setExpandedId(expanded ? null : call.id)} className={`border-b transition-colors cursor-pointer ${(call.voicemail || (call.talk_time ?? 0) < 3) && call.direction === 'inbound' ? 'missed-call-row bg-red-600 hover:bg-red-700 border-red-700 text-white' : 'border-gray-50 hover:bg-warm-bg/20'}`}>
                            <td className="px-3 sm:px-5 py-3.5">
                              <div className="text-xs font-mono text-foreground/50 whitespace-nowrap">#{call.id}</div>
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                              {scores[String(call.id)]?.fit_score != null ? (
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold text-white ${fitScoreBg(scores[String(call.id)].fit_score!)}`}>
                                  {scores[String(call.id)].fit_score}
                                </span>
                              ) : (
                                <span className="text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/80 max-w-[180px]" style={{ fontFamily: 'var(--font-body)' }}>
                              {scores[String(call.id)]?.call_name ? (
                                <span className="font-medium">{scores[String(call.id)].call_name}</span>
                              ) : (
                                <span className="text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5">
                              <div className="text-sm font-medium text-foreground whitespace-nowrap">{formatDate(call.called_at)}</div>
                              <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{formatTime(call.called_at)}</div>
                            </td>
                            <td className="px-3 sm:px-5 py-3.5">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">{call.caller_number_formatted || call.caller_number || 'Unknown'}</div>
                                {call.name && call.name !== 'Unknown' && <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{call.name}</div>}
                              </div>
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/70 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                              {scores[String(call.id)]?.caller_name ? (
                                <span className="font-medium">{scores[String(call.id)].caller_name}</span>
                              ) : (
                                <span className="text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/70 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <OperatorPicker
                                  currentName={scores[String(call.id)]?.operator_name || null}
                                  knownOperators={knownOperators}
                                  noAnswer={call.voicemail || (call.talk_time ?? 0) < 3}
                                  voicemail={!!call.voicemail}
                                  error={scoringErrors[String(call.id)]}
                                  onPick={(name) => setManualOperator(String(call.id), name)}
                                />
                                <CallAiBadge
                                  call={call}
                                  preScore={scores[String(call.id)] || null}
                                  loading={scoringIds.has(String(call.id))}
                                  onClick={() => setMiniPopoverId(miniPopoverId === call.id ? null : call.id)}
                                />
                              </div>
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                              {scores[String(call.id)]?.client_type ? (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${clientTypeBg(scores[String(call.id)].client_type!)}`}>
                                  {scores[String(call.id)].client_type}
                                </span>
                              ) : (
                                <span className="text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
                                {call.direction || 'unknown'}
                              </span>
                              {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ml-1">VM</span>}
                              {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ml-1">1st</span>}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/60 max-w-[180px] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                              {call.source_name || call.source || '—'}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm font-mono text-foreground whitespace-nowrap">
                              {formatDuration(call.duration)}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/50 whitespace-nowrap hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>
                              {[call.city, call.state].filter(Boolean).join(', ') || '—'}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5" onClick={e => e.stopPropagation()}>
                              {call.audio ? (
                                <button
                                  onClick={() => playRecording(call.audio)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${playingAudio === call.audio ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                  style={{ fontFamily: 'var(--font-body)' }}
                                >
                                  {playingAudio === call.audio ? (
                                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Stop</>
                                  ) : (
                                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play</>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5" onClick={e => e.stopPropagation()}>
                              {scores[String(call.id)]?.transcript ? (
                                <button
                                  onClick={() => setTranscriptFor(call.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  style={{ fontFamily: 'var(--font-body)' }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                  View
                                </button>
                              ) : (
                                <span className="text-xs text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5">
                              <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-warm-bg/30 border-b border-gray-50">
                              <td colSpan={15} className="px-5 py-5">
                                <CallDetail
                                  call={call}
                                  score={scores[String(call.id)] || null}
                                  scoring={scoringIds.has(String(call.id))}
                                  onRescore={rescoreCall}
                                />
                              </td>
                            </tr>
                          )}
                          {!expanded && miniPopoverId === call.id && (
                            <tr className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-50" onClick={(e) => e.stopPropagation()}>
                              <td colSpan={15} className="px-5 py-4">
                                <ScoreMiniPopover
                                  score={scores[String(call.id)] || null}
                                  scoring={scoringIds.has(String(call.id))}
                                  error={scoringErrors[String(call.id)]}
                                  onClose={() => setMiniPopoverId(null)}
                                  onRescore={() => rescoreCall(String(call.id), true)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-warm-bg/30">
                  <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    Page {page} of {totalPages} &middot; {totalEntries.toLocaleString()} calls
                  </p>
                  <div className="flex items-center gap-1">
                    <button disabled={page <= 1} onClick={() => fetchCalls(page - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/60 hover:bg-warm-bg disabled:opacity-30 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Prev</button>
                    <button disabled={page >= totalPages} onClick={() => fetchCalls(page + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/60 hover:bg-warm-bg disabled:opacity-30 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sources Tab */}
      {tab === 'sources' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {sources.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Load calls first to see source breakdown</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Source</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Calls</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => {
                    const pct = totalEntries > 0 ? Math.round((s.count / calls.length) * 100) : 0;
                    return (
                      <tr key={s.name} className="border-b border-gray-50">
                        <td className="px-3 sm:px-5 py-3.5 text-sm font-medium text-foreground">{s.name}</td>
                        <td className="px-3 sm:px-5 py-3.5 text-sm font-bold text-foreground">{s.count}</td>
                        <td className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-warm-bg rounded-full max-w-[120px]">
                              <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-foreground/40 w-8" style={{ fontFamily: 'var(--font-body)' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {transcriptFor !== null && (() => {
        const call = calls.find((c) => c.id === transcriptFor);
        const transcript = call ? scores[String(call.id)]?.transcript : null;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTranscriptFor(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Call transcript</h3>
                  {call && <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{formatDate(call.called_at)} · {formatTime(call.called_at)}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setTranscriptFor(null)}
                  className="text-foreground/40 hover:text-foreground/70 p-1 rounded-lg hover:bg-warm-bg"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto flex-1">
                {transcript ? (
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{transcript}</pre>
                ) : (
                  <p className="text-sm text-foreground/40 italic">No transcript available for this call yet. Click Analyze to generate one.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Inline operator selector shown in every row. Displays the current
// operator name (AI-picked or manually set) and lets staff override via
// a dropdown of known operators, or type a brand-new name.
function OperatorPicker({ currentName, knownOperators, noAnswer, voicemail, error, onPick }: {
  currentName: string | null;
  knownOperators: string[];
  noAnswer: boolean;
  voicemail: boolean;
  error?: string;
  onPick: (name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState('');

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { if (custom.trim()) onPick(custom.trim()); setEditing(false); }
            if (e.key === 'Escape') { setEditing(false); setCustom(''); }
          }}
          placeholder="Operator name"
          className="text-xs px-2 py-1 rounded-md border border-gray-200 focus:outline-none focus:border-primary/40 w-28"
        />
        <button type="button" onClick={() => { if (custom.trim()) onPick(custom.trim()); setEditing(false); }} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-primary text-white hover:opacity-90">Save</button>
        <button type="button" onClick={() => { setEditing(false); setCustom(''); }} className="text-[10px] text-foreground/40 hover:text-foreground/70">Cancel</button>
      </div>
    );
  }

  const options = Array.from(new Set([...(currentName ? [currentName] : []), ...knownOperators])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {currentName ? (
        <span className="font-medium">{currentName}</span>
      ) : noAnswer ? (
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
          {voicemail ? 'Voicemail' : 'No answer'}
        </span>
      ) : error ? (
        <span title={error} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A9 9 0 1 1 2.982 12 9 9 0 0 1 12 2.714Zm0 13.036h.008v.008H12v-.008Z" /></svg>
          Error
        </span>
      ) : (
        <span className="text-foreground/20">—</span>
      )}
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          if (v === '__new__') { setEditing(true); return; }
          if (v === '__clear__') { onPick(null); return; }
          onPick(v);
        }}
        className="text-[10px] px-1.5 py-1 rounded-md border border-gray-200 bg-white text-foreground/60 hover:border-primary/30 focus:outline-none focus:border-primary/40 cursor-pointer"
        title={currentName ? 'Change operator' : 'Set operator'}
      >
        <option value="">{currentName ? 'Change…' : 'Set…'}</option>
        {options.map((n) => <option key={n} value={n}>{n}</option>)}
        <option value="__new__">+ New name…</option>
        {currentName && <option value="__clear__">Clear</option>}
      </select>
    </div>
  );
}

// Simple label/value cell used inside the expanded call detail drawer.
function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && String(value).trim() ? String(value) : '—';
  return (
    <div>
      <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-sm ${display === '—' ? 'text-foreground/30' : 'text-foreground/80'} break-words`} style={{ fontFamily: 'var(--font-body)' }}>{display}</p>
    </div>
  );
}

function scoreColorHex(s: number): string {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#3b82f6';
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

// Compact inline popover shown when the user clicks the score badge.
// Shows strengths / coaching notes only — NOT the full expanded detail.
function ScoreMiniPopover({ score, scoring, error, onClose, onRescore }: {
  score: ScoreRow | null;
  scoring: boolean;
  error?: string;
  onClose: () => void;
  onRescore: () => void;
}) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Analysis failed</p>
            <p className="text-xs text-red-800 mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}
      <div className="flex items-start gap-4">
      {score ? (
        <>
          <div className="flex-1 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Strengths</p>
              {score.operator_strengths?.length > 0 ? (
                <ul className="text-xs text-emerald-900/80 space-y-0.5 list-disc pl-4">
                  {score.operator_strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-emerald-900/50 italic">No strengths noted</p>
              )}
            </div>
            <div className="rounded-lg bg-red-50/80 border border-red-100 p-2.5">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Areas to coach</p>
              {score.operator_weaknesses?.length > 0 ? (
                <ul className="text-xs text-red-900/80 space-y-0.5 list-disc pl-4">
                  {score.operator_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-red-900/50 italic">No weaknesses identified</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={onRescore} disabled={scoring} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/60 hover:text-primary hover:bg-white border border-gray-200 disabled:opacity-50">{scoring ? 'Analyzing…' : 'Re-analyze'}</button>
            <button type="button" onClick={onClose} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/40 hover:text-foreground/70 hover:bg-white border border-gray-200">Close</button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-between gap-4">
          <p className="text-xs text-foreground/50 italic">{error ? 'Analysis could not complete.' : 'No analysis yet for this call.'}</p>
          <div className="flex gap-1">
            <button type="button" onClick={onRescore} disabled={scoring} className="text-[10px] font-semibold px-2 py-1 rounded-md text-primary hover:bg-white border border-primary/30 disabled:opacity-50">{scoring ? 'Analyzing…' : error ? 'Try again' : 'Analyze now'}</button>
            <button type="button" onClick={onClose} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/40 hover:text-foreground/70 hover:bg-white border border-gray-200">Close</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function sentimentStyle(s: string | null): string {
  if (s === 'positive') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (s === 'negative') return 'text-red-700 bg-red-50 border-red-200';
  if (s === 'neutral') return 'text-slate-700 bg-slate-50 border-slate-200';
  return 'text-foreground/50 bg-gray-50 border-gray-200';
}

// Expanded row contents: key metadata at top, AI analysis integrated with it,
// then full metadata grid tucked in a details/summary at the bottom.
function CallDetail({
  call,
  score,
  scoring,
  onRescore,
}: {
  call: Call;
  score: ScoreRow | null;
  scoring: boolean;
  onRescore: (callId: string, force: boolean) => void;
}) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
      {/* Header: score + caller + operator + sentiment + rescore */}
      <div className="flex items-start gap-4 flex-wrap pb-4 border-b border-gray-100">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
          style={{ backgroundColor: score ? scoreColorHex(score.score) : '#e5e7eb', color: score ? '#fff' : '#9ca3af' }}
          title={score ? `AI score ${score.score}/100` : 'Not scored yet'}
        >
          {score ? score.score : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {score?.caller_name || (call.name && call.name !== 'Unknown' ? call.name : call.caller_number_formatted || call.caller_number || 'Unknown caller')}
          </h3>
          {score?.caller_interest && (
            <p className="text-sm text-foreground/70 mt-0.5">{score.caller_interest}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {score?.operator_name && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                Operator: {score.operator_name}
              </span>
            )}
            {score?.client_type && (
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${clientTypeBg(score.client_type)}`}>
                {score.client_type}
              </span>
            )}
            {score?.fit_score != null && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white ${fitScoreBg(score.fit_score)}`}>
                Fit: {score.fit_score}
              </span>
            )}
            {score?.sentiment && (
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sentimentStyle(score.sentiment)} capitalize`}>
                {score.sentiment}
              </span>
            )}
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
              {call.direction || 'unknown'}
            </span>
            {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">Voicemail</span>}
            {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700">First-time caller</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRescore(String(call.id), true)}
          disabled={scoring}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-foreground/60 hover:text-primary hover:bg-white transition-colors border border-gray-200 disabled:opacity-50 flex items-center gap-1.5"
          title="Run AI analysis on this call"
        >
          <svg className={`w-3.5 h-3.5 ${scoring ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {scoring ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Key metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-4 border-b border-gray-100">
        <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        <DetailField label="Duration" value={`${formatDuration(call.duration)}${call.talk_time ? ` (${formatDuration(call.talk_time)} talk)` : ''}`} />
        <DetailField label="Source" value={call.source_name || call.source} />
        <DetailField label="Location" value={[call.city, call.state].filter(Boolean).join(', ')} />
      </div>

      {/* AI analysis body */}
      {score ? (
        <div className="pt-4 space-y-4">
          {score.summary && (
            <div>
              <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{score.summary}</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {score.operator_strengths?.length > 0 && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">Operator strengths</p>
                <ul className="text-xs text-emerald-900/80 space-y-1 list-disc pl-4">
                  {score.operator_strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-xl bg-red-50/60 border border-red-100 p-3">
              <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1.5">Areas to coach</p>
              {score.operator_weaknesses?.length > 0 ? (
                <ul className="text-xs text-red-900/80 space-y-1 list-disc pl-4">
                  {score.operator_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-red-900/50 italic">No weaknesses identified</p>
              )}
            </div>
          </div>
          {score.next_steps && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Recommended next step</p>
              <p className="text-sm text-foreground/80">{score.next_steps}</p>
            </div>
          )}
          <p className="text-[10px] text-foreground/30">
            Scored {new Date(score.scored_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      ) : (
        <div className="pt-4 text-sm text-foreground/40">
          {scoring ? 'Running AI analysis on this call…' : 'No AI analysis yet. Click Score now.'}
        </div>
      )}

      {/* Tags + Notes + Recording */}
      {call.tag_list && call.tag_list.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {call.tag_list.map((tag, i) => (
              <span key={i} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{tag}</span>
            ))}
          </div>
        </div>
      )}
      {call.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{call.notes}</p>
        </div>
      )}
      {call.audio && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5">Recording</p>
          <audio controls src={call.audio} className="h-9 w-full max-w-md" />
        </div>
      )}

      {/* Everything else */}
      <details className="mt-4 pt-4 border-t border-gray-100 group">
        <summary className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider cursor-pointer select-none hover:text-foreground/70">
          All call metadata
        </summary>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm mt-3">
          <DetailField label="Caller name" value={call.name && call.name !== 'Unknown' ? call.name : undefined} />
          <DetailField label="Caller number" value={call.caller_number_formatted || call.caller_number} />
          <DetailField label="Tracking number" value={call.tracking_number_formatted || call.tracking_number} />
          <DetailField label="Tracking label" value={call.tracking_label} />
          <DetailField label="Receiving number" value={call.receiving_number_formatted || call.receiving_number} />
          <DetailField label="Business number" value={call.business_number} />
          <DetailField label="Source" value={call.source_name || call.source} />
          <DetailField label="Status" value={call.status} />
          <DetailField label="Direction" value={call.direction} />
          <DetailField label="Total duration" value={formatDuration(call.duration)} />
          <DetailField label="Talk time" value={call.talk_time ? formatDuration(call.talk_time) : undefined} />
          <DetailField label="Ring time" value={call.ring_time ? formatDuration(call.ring_time) : undefined} />
          <DetailField label="Location" value={[call.city, call.state, call.zip].filter(Boolean).join(', ')} />
          <DetailField label="Country" value={call.country} />
          <DetailField label="CTM score" value={call.score != null ? String(call.score) : undefined} />
          <DetailField label="First call" value={call.first_call ? 'Yes' : undefined} />
          <DetailField label="Voicemail" value={call.voicemail ? 'Yes' : undefined} />
          <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        </div>
      </details>
    </div>
  );
}

// ------------------------------------------------------------
// WeekGraph — SVG line chart animated left→right.
// Clickable day points filter the call log to that day.
// ------------------------------------------------------------

function WeekGraph({
  data,
  selectedDate,
  onDayClick,
}: {
  data: { label: string; short: string; date: string; count: number; sources: { name: string; count: number }[] }[];
  selectedDate: string;
  onDayClick: (date: string) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 720;
  const H = 170;
  const padL = 24;
  const padR = 24;
  const padT = 24;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.count), 1);

  const pts = data.map((d, i) => {
    const x = padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padT + innerH - (d.count / max) * innerH;
    return { x, y, ...d };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`;

  // Build subtle horizontal gridlines (4 bands).
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + innerH * t);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full block select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ maxHeight: 200 }}
    >
      <defs>
        <linearGradient id="wg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a0522d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#a0522d" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="wg-clip">
          <rect x={padL} y={padT - 4} width={innerW} height={innerH + 8}>
            <animate attributeName="width" from="0" to={innerW} dur="1.8s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
          </rect>
        </clipPath>
      </defs>

      {/* grid */}
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1={padL}
          x2={W - padR}
          y1={y}
          y2={y}
          stroke="rgba(0,0,0,0.05)"
          strokeDasharray={i === gridYs.length - 1 ? '0' : '2 4'}
        />
      ))}

      {/* area under line, clipped to animate left→right */}
      <g clipPath="url(#wg-clip)">
        <path d={areaPath} fill="url(#wg-area)" />
        <path
          d={linePath}
          fill="none"
          stroke="#a0522d"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* day points + labels (appear staggered with fade) */}
      {pts.map((p, i) => {
        const isSelected = p.date === selectedDate;
        const isLast = i === pts.length - 1;
        const delay = 0.3 + i * 0.18;
        return (
          <g
            key={p.date}
            className="cursor-pointer"
            onClick={() => onDayClick(p.date)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx((cur) => (cur === i ? null : cur))}
          >
            {/* hover target */}
            <rect
              x={p.x - innerW / pts.length / 2}
              y={padT - 4}
              width={innerW / pts.length}
              height={innerH + padB}
              fill="transparent"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={isSelected ? 6.5 : 4.5}
              fill={isSelected ? '#a0522d' : '#ffffff'}
              stroke="#a0522d"
              strokeWidth="2"
              style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay}s forwards` }}
            />
            {p.count > 0 && (
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={isSelected ? '#a0522d' : 'rgba(26,26,26,0.8)'}
                style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.05}s forwards`, fontFamily: 'var(--font-body)' }}
              >
                {p.count}
              </text>
            )}
            <text
              x={p.x}
              y={H - 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isSelected || isLast ? 700 : 500}
              fill={isSelected ? '#a0522d' : isLast ? 'rgba(26,26,26,0.9)' : 'rgba(26,26,26,0.4)'}
              style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.1}s forwards`, fontFamily: 'var(--font-body)' }}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {/* Source-breakdown tooltip for the hovered day */}
      {hoveredIdx !== null && pts[hoveredIdx] && pts[hoveredIdx].sources.length > 0 && (() => {
        const p = pts[hoveredIdx];
        const visible = p.sources.slice(0, 5);
        const extra = p.sources.length - visible.length;
        const rows = visible.length + (extra > 0 ? 1 : 0);
        const boxW = 220;
        const headerH = 22;
        const rowH = 16;
        const pad = 8;
        const boxH = headerH + rows * rowH + pad;
        // Try to place above the point; if not enough room, place below.
        let tipX = p.x - boxW / 2;
        if (tipX < padL) tipX = padL;
        if (tipX + boxW > W - padR) tipX = W - padR - boxW;
        const placeAbove = p.y - boxH - 12 > padT;
        const tipY = placeAbove ? p.y - boxH - 12 : p.y + 14;
        return (
          <g className="pointer-events-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}>
            <rect
              x={tipX}
              y={tipY}
              width={boxW}
              height={boxH}
              rx={8}
              fill="#ffffff"
              stroke="rgba(0,0,0,0.08)"
            />
            <text
              x={tipX + 10}
              y={tipY + 14}
              fontSize="10"
              fontWeight="700"
              fill="rgba(26,26,26,0.5)"
              style={{ fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              {p.label} · {p.count} call{p.count === 1 ? '' : 's'}
            </text>
            {visible.map((s, i) => (
              <g key={s.name}>
                <text
                  x={tipX + 10}
                  y={tipY + headerH + i * rowH + 10}
                  fontSize="11"
                  fill="rgba(26,26,26,0.75)"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.name.length > 26 ? s.name.slice(0, 25) + '…' : s.name}
                </text>
                <text
                  x={tipX + boxW - 10}
                  y={tipY + headerH + i * rowH + 10}
                  fontSize="11"
                  fontWeight="700"
                  fill="#a0522d"
                  textAnchor="end"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.count}
                </text>
              </g>
            ))}
            {extra > 0 && (
              <text
                x={tipX + 10}
                y={tipY + headerH + visible.length * rowH + 10}
                fontSize="10"
                fill="rgba(26,26,26,0.35)"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                +{extra} more…
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
