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

type Tab = 'calls' | 'sources' | 'spam';

const SPAM_STORAGE_KEY = 'calls_spam_numbers_v1';

function normalizePhone(num: string | null | undefined): string {
  if (!num) return '';
  return num.replace(/\D/g, '');
}

interface Insights {
  today: number;
  yesterday: number;
  thisWeek: number;
  allTime: number;
  avgDuration: number;
  inbound: number;
  outbound: number;
  missedThisWeek: number;
  missedPaidThisWeek: number;
  returnedMissedThisWeek: number;
  returnedPickedUpThisWeek: number;
  dailyCounts: { label: string; short: string; date: string; count: number; missedCount: number; returnedCount: number; sources: { name: string; count: number }[] }[];
}

// Treat anything that isn't obviously organic / direct / unattributed as a
// "paid" source for the purposes of missed-paid-call reporting.
function isPaidSource(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  if (!s) return false;
  if (s.includes('organic') || s.includes('direct') || s === 'unknown' || s === 'none') return false;
  return true;
}

function isMissedCall(c: { direction?: string | null; voicemail?: boolean | null; talk_time?: number | null }): boolean {
  if (c.direction !== 'inbound') return false;
  return !!c.voicemail || (c.talk_time ?? 0) < 3;
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

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // CTM sometimes returns "YYYY-MM-DD HH:MM:SS +ZZZZ" without 'T'
  d = new Date(String(dateStr).replace(' ', 'T').replace(' +', '+').replace(' -', '-'));
  if (!isNaN(d.getTime())) return d;
  // Try Unix timestamp (seconds)
  const n = Number(dateStr);
  if (n > 1e9 && n < 2e10) return new Date(n * 1000);
  return null;
}

function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return '—'; }
}

function formatTime(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return '—';
  try {
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
  const { user, session, isAdmin } = useAuth();
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [tab, setTab] = useState<Tab>('calls');
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
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
  const [sortKey, setSortKey] = useState<string>('called_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sources, setSources] = useState<{ name: string; count: number }[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [allCallsRaw, setAllCallsRaw] = useState<Call[]>([]);
  const [timelineBounds, setTimelineBounds] = useState<{ min: Date; max: Date } | null>(null);
  const [rangeStart, setRangeStart] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [rangeEnd, setRangeEnd] = useState<Date>(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [scoringErrors, setScoringErrors] = useState<Record<string, string>>({});
  const autoScoreInFlight = useRef<Set<string>>(new Set());
  const [spamNumbers, setSpamNumbers] = useState<Set<string>>(new Set());
  const [reportingSpam, setReportingSpam] = useState<string | null>(null);

  // Load spam list from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SPAM_STORAGE_KEY) : null;
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSpamNumbers(new Set(arr.filter((x) => typeof x === 'string')));
      }
    } catch { /* ignore */ }
  }, []);

  const persistSpam = useCallback((next: Set<string>) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SPAM_STORAGE_KEY, JSON.stringify(Array.from(next)));
      }
    } catch { /* ignore */ }
  }, []);

  const reportSpam = useCallback((num: string) => {
    const key = normalizePhone(num);
    if (!key) return;
    setSpamNumbers((prev) => {
      const next = new Set(prev);
      next.add(key);
      persistSpam(next);
      return next;
    });
  }, [persistSpam]);

  const unreportSpam = useCallback((num: string) => {
    const key = normalizePhone(num);
    if (!key) return;
    setSpamNumbers((prev) => {
      const next = new Set(prev);
      next.delete(key);
      persistSpam(next);
      return next;
    });
  }, [persistSpam]);

  const isSpamCall = useCallback((call: { caller_number?: string | null; caller_number_formatted?: string | null; receiving_number?: string | null; receiving_number_formatted?: string | null }) => {
    const candidates = [
      call.caller_number,
      call.caller_number_formatted,
      call.receiving_number,
      call.receiving_number_formatted,
    ];
    for (const raw of candidates) {
      const key = normalizePhone(raw);
      if (key && spamNumbers.has(key)) return true;
    }
    return false;
  }, [spamNumbers]);

  const knownOperators = useMemo(() => {
    const names = new Set<string>();
    for (const s of Object.values(scores)) {
      if (s?.operator_name) names.add(s.operator_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [scores]);

  const knownClientTypes = useMemo(() => {
    const types = new Set<string>([
      'Insurance', 'Private Pay', 'Mental Health', 'Addiction',
      'Dual Diagnosis', 'Family/Loved One', 'Other',
    ]);
    for (const s of Object.values(scores)) {
      if (s?.client_type) types.add(s.client_type);
    }
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [scores]);

  const MEANINGFUL_THRESHOLD = 60;

  const rangeInsights = useMemo(() => {
    const startIso = rangeStart.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const endIso = rangeEnd.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const dayMs = 24 * 60 * 60 * 1000;

    // Union allCallsRaw with currently loaded `calls`, dedupe by id.
    // Ensures that freshly paginated/loaded calls show up in stats even if
    // the one-shot allCallsRaw fetch hasn't caught up.
    const seenIds = new Set<number>();
    const sourceCalls: Call[] = [];
    for (const c of allCallsRaw) {
      if (seenIds.has(c.id)) continue;
      seenIds.add(c.id);
      sourceCalls.push(c);
    }
    for (const c of calls) {
      if (seenIds.has(c.id)) continue;
      seenIds.add(c.id);
      sourceCalls.push(c);
    }

    // Generate one entry per day in the range (for the chart)
    const days: { label: string; short: string; date: string }[] = [];
    const cursor = new Date(rangeStart); cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd); endDay.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= endDay.getTime()) {
      const dateStr = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      days.push({
        label: cursor.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Phoenix' }),
        short: cursor.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'America/Phoenix' }),
        date: dateStr,
      });
      cursor.setTime(cursor.getTime() + dayMs);
    }
    const rangeDates = new Set(days.map(d => d.date));

    const dayCounts = new Map<string, number>();
    const daySources = new Map<string, Map<string, number>>();
    const dayMissedCounts = new Map<string, number>();
    const dayReturnedCounts = new Map<string, number>();
    const dayMeaningfulCounts = new Map<string, number>();
    const missedNumbers = new Set<string>();
    let totalCalls = 0;
    let totalDuration = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    let missed = 0;
    let missedPaid = 0;
    let meaningful = 0;
    let spam = 0;

    for (const c of sourceCalls) {
      const p = parseDate(c.called_at);
      if (!p) continue;
      const callDate = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      if (!rangeDates.has(callDate)) continue;
      const isSpam = isSpamCall(c);
      if (isSpam) { spam++; continue; }
      totalCalls++;
      totalDuration += c.duration || 0;
      dayCounts.set(callDate, (dayCounts.get(callDate) || 0) + 1);
      const src = c.source_name || c.source || 'Unknown';
      if (!daySources.has(callDate)) daySources.set(callDate, new Map());
      daySources.get(callDate)!.set(src, (daySources.get(callDate)!.get(src) || 0) + 1);
      if (c.direction === 'inbound') inboundCount++;
      if (c.direction === 'outbound') outboundCount++;
      if (isMissedCall(c)) {
        missed++;
        dayMissedCounts.set(callDate, (dayMissedCounts.get(callDate) || 0) + 1);
        if (c.caller_number) missedNumbers.add(c.caller_number);
        if (isPaidSource(c.source_name || c.source)) missedPaid++;
      }
      const s = scores[String(c.id)];
      if (s?.fit_score != null && s.fit_score >= MEANINGFUL_THRESHOLD) {
        meaningful++;
        dayMeaningfulCounts.set(callDate, (dayMeaningfulCounts.get(callDate) || 0) + 1);
      }
    }

    let returnedMissed = 0;
    let returnedPickedUp = 0;
    for (const c of sourceCalls) {
      if (c.direction !== 'outbound') continue;
      const p = parseDate(c.called_at);
      if (!p) continue;
      const callDate = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      if (!rangeDates.has(callDate)) continue;
      const target = c.caller_number || c.receiving_number;
      if (target && missedNumbers.has(target)) {
        returnedMissed++;
        dayReturnedCounts.set(callDate, (dayReturnedCounts.get(callDate) || 0) + 1);
        if ((c.talk_time ?? 0) >= 3) returnedPickedUp++;
      }
    }

    const dailyCounts = days.map(d => {
      const bucket = daySources.get(d.date);
      const sources = bucket ? Array.from(bucket.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) : [];
      return {
        ...d,
        count: dayCounts.get(d.date) || 0,
        missedCount: dayMissedCounts.get(d.date) || 0,
        returnedCount: dayReturnedCounts.get(d.date) || 0,
        meaningfulCount: dayMeaningfulCounts.get(d.date) || 0,
        sources,
      };
    });

    return {
      totalCalls,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      inbound: inboundCount,
      outbound: outboundCount,
      missed,
      missedPaid,
      meaningful,
      spam,
      returnedMissed,
      returnedPickedUp,
      dailyCounts,
      startIso,
      endIso,
    };
  }, [allCallsRaw, calls, scores, rangeStart, rangeEnd, isSpamCall]);

  const spamCount = useMemo(() => {
    let count = 0;
    const seen = new Set<number>();
    for (const c of allCallsRaw) {
      if (!seen.has(c.id)) { seen.add(c.id); if (isSpamCall(c)) count++; }
    }
    for (const c of calls) {
      if (!seen.has(c.id)) { seen.add(c.id); if (isSpamCall(c)) count++; }
    }
    return count;
  }, [allCallsRaw, calls, isSpamCall]);

  // Detect single-day range (e.g. Today / Yesterday) so we can show a
  // narrative Daily Summary instead of the multi-day chart.
  const rangeStartIso = rangeStart.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const rangeEndIso = rangeEnd.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const isSingleDay = rangeStartIso === rangeEndIso;
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const isTodaySelected = isSingleDay && rangeStartIso === todayIso;

  const dailyCalls = useMemo(() => {
    if (!isSingleDay) return [] as Call[];
    const seen = new Set<number>();
    const out: Call[] = [];
    for (const c of [...allCallsRaw, ...calls]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const p = parseDate(c.called_at);
      if (!p) continue;
      if (p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }) !== rangeStartIso) continue;
      out.push(c);
    }
    out.sort((a, b) => {
      const ta = parseDate(a.called_at)?.getTime() ?? 0;
      const tb = parseDate(b.called_at)?.getTime() ?? 0;
      return ta - tb;
    });
    return out;
  }, [allCallsRaw, calls, isSingleDay, rangeStartIso]);

  const hourlyCounts = useMemo(() => {
    const hours: { hour: number; label: string; count: number; missedCount: number; returnedCount: number; meaningfulCount: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const ap = h < 12 ? 'a' : 'p';
      hours.push({ hour: h, label: `${hh}${ap}`, count: 0, missedCount: 0, returnedCount: 0, meaningfulCount: 0 });
    }
    if (!isSingleDay) return hours;

    const missedNumbers = new Set<string>();
    for (const c of dailyCalls) {
      if (isSpamCall(c)) continue;
      if (isMissedCall(c) && c.caller_number) missedNumbers.add(c.caller_number);
    }

    for (const c of dailyCalls) {
      if (isSpamCall(c)) continue;
      const p = parseDate(c.called_at);
      if (!p) continue;
      const hourStr = p.toLocaleString('en-US', { timeZone: 'America/Phoenix', hour: '2-digit', hour12: false });
      const h = Math.max(0, Math.min(23, parseInt(hourStr, 10) || 0));
      const bucket = hours[h];
      bucket.count++;
      if (isMissedCall(c)) bucket.missedCount++;
      const target = c.caller_number || c.receiving_number;
      if (c.direction === 'outbound' && target && missedNumbers.has(target)) bucket.returnedCount++;
      const s = scores[String(c.id)];
      if (s?.fit_score != null && s.fit_score >= MEANINGFUL_THRESHOLD) bucket.meaningfulCount++;
    }
    return hours;
  }, [dailyCalls, isSingleDay, isSpamCall, scores]);

  const meaningfulData = useMemo(() => {
    let thisWeek = 0;
    const dailyCounts = new Map<string, number>();
    if (!insights) return { thisWeek: 0, today: 0, yesterday: 0, dailyCounts };
    const weekDates = new Set(insights.dailyCounts.map(d => d.date));
    const todayStr = insights.dailyCounts[6]?.date;
    const yesterdayStr = insights.dailyCounts[5]?.date;
    for (const call of calls) {
      const s = scores[String(call.id)];
      if (!s || s.fit_score == null || s.fit_score < MEANINGFUL_THRESHOLD) continue;
      const parsedM = parseDate(call.called_at);
      if (!parsedM) continue;
      const callDate = parsedM.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      if (weekDates.has(callDate)) {
        thisWeek++;
        dailyCounts.set(callDate, (dailyCounts.get(callDate) || 0) + 1);
      }
    }
    return {
      thisWeek,
      today: dailyCounts.get(todayStr) || 0,
      yesterday: dailyCounts.get(yesterdayStr) || 0,
      dailyCounts,
    };
  }, [calls, scores, insights]);

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

  const setManualClientType = useCallback(async (callId: string, clientType: string | null) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/claude/calls/set-client-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId, client_type: clientType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) setScores((prev) => ({ ...prev, [callId]: data.result }));
      }
    } catch { /* swallow — UI keeps the stale value */ }
  }, [session?.access_token]);

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const analyzeAllCalls = useCallback(async () => {
    if (!session?.access_token) return;
    const targets = calls.slice();
    if (!targets.length) return;
    setBulkAnalyzing(true);
    setBulkProgress({ done: 0, total: targets.length });
    const concurrency = 3;
    let idx = 0;
    let done = 0;
    async function worker() {
      while (idx < targets.length) {
        const myIdx = idx++;
        const call = targets[myIdx];
        const callId = String(call.id);
        if (scores[callId]) { done++; setBulkProgress({ done, total: targets.length }); continue; }
        setScoringIds((prev) => { const n = new Set(prev); n.add(callId); return n; });
        try {
          const res = await fetch('/api/claude/calls/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
            body: JSON.stringify({ callId, call, force: false }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.result) setScores((prev) => ({ ...prev, [callId]: data.result }));
          } else {
            let err = `Analyze failed (${res.status})`;
            try { const j = await res.json(); err = j.error || err; } catch {}
            setScoringErrors((prev) => ({ ...prev, [callId]: err }));
          }
        } catch (e) {
          setScoringErrors((prev) => ({ ...prev, [callId]: e instanceof Error ? e.message : 'Network error' }));
        } finally {
          setScoringIds((prev) => { const n = new Set(prev); n.delete(callId); return n; });
          done++;
          setBulkProgress({ done, total: targets.length });
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    setBulkAnalyzing(false);
  }, [calls, scores, session]);

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

        setAllCallsRaw(allCalls);
        let minTime = Infinity, maxTime = -Infinity;
        for (const c of allCalls) {
          const p = parseDate(c.called_at);
          if (!p) continue;
          const t = p.getTime();
          if (t < minTime) minTime = t;
          if (t > maxTime) maxTime = t;
        }
        if (isFinite(minTime) && isFinite(maxTime)) {
          const pad = 3 * 24 * 60 * 60 * 1000;
          const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
          const cappedMax = Math.min(maxTime + pad, endOfToday.getTime());
          setTimelineBounds({ min: new Date(minTime - pad), max: new Date(cappedMax) });
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
        let missedWeek = 0;
        let missedPaidWeek = 0;
        let returnedMissedWeek = 0;
        let returnedPickedUpWeek = 0;
        const dayMissedCounts = new Map<string, number>();
        const dayReturnedCounts = new Map<string, number>();
        const missedNumbers = new Set<string>();

        allCalls.forEach(c => {
          const parsed = parseDate(c.called_at);
          if (!parsed) return;
          const callDate = parsed.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
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
            if (isMissedCall(c)) {
              missedWeek++;
              dayMissedCounts.set(callDate, (dayMissedCounts.get(callDate) || 0) + 1);
              if (c.caller_number) missedNumbers.add(c.caller_number);
              if (isPaidSource(c.source_name || c.source)) missedPaidWeek++;
            }
          }
        });

        allCalls.forEach(c => {
          if (c.direction !== 'outbound') return;
          const parsedR = parseDate(c.called_at);
          if (!parsedR) return;
          const callDate = parsedR.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
          if (!weekDates.has(callDate)) return;
          const target = c.caller_number || c.receiving_number;
          if (target && missedNumbers.has(target)) {
            returnedMissedWeek++;
            dayReturnedCounts.set(callDate, (dayReturnedCounts.get(callDate) || 0) + 1);
            if ((c.talk_time ?? 0) >= 3) returnedPickedUpWeek++;
          }
        });

        const dailyCounts = days.map(d => {
          const bucket = daySources.get(d.date);
          const sources = bucket
            ? Array.from(bucket.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
            : [];
          return { ...d, count: dayCounts.get(d.date) || 0, missedCount: dayMissedCounts.get(d.date) || 0, returnedCount: dayReturnedCounts.get(d.date) || 0, sources };
        });

        setInsights({
          today: dayCounts.get(todayStr) || 0,
          yesterday: dayCounts.get(yesterdayStr) || 0,
          thisWeek: weekCallCount,
          allTime,
          avgDuration: weekCallCount > 0 ? Math.round(weekDuration / weekCallCount) : 0,
          inbound: inboundCount,
          outbound: outboundCount,
          missedThisWeek: missedWeek,
          missedPaidThisWeek: missedPaidWeek,
          returnedMissedThisWeek: returnedMissedWeek,
          returnedPickedUpThisWeek: returnedPickedUpWeek,
          dailyCounts,
        });
      } catch {
        // Insights are non-critical
      }
      setInsightsLoading(false);
    }
    loadInsights();
  }, [accountId]);

  const fetchCalls = useCallback(async (p: number, append = false) => {
    if (!accountId) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page: p, per_page: 25 };
    if (searchQuery) params.search = searchQuery;
    if (dateFilter) params.start_date = dateFilter;
    if (directionFilter !== 'all') params.direction = directionFilter;

    const data = await ctmFetch(`/accounts/${accountId}/calls.json`, params);

    if (data.error) {
      setError(data.error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (data.calls) {
      setCalls(prev => {
        const merged = append ? [...prev, ...data.calls!] : data.calls!;
        // Build sources summary from the full accumulated list
        const sourceMap = new Map<string, number>();
        merged.forEach((c: Call) => {
          const src = c.source_name || c.source || 'Unknown';
          sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
        });
        setSources(Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
        return merged;
      });
      setTotalPages(data.total_pages || 1);
      setTotalEntries(data.total_entries || 0);
      setPage(data.page || p);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [accountId, searchQuery, dateFilter, directionFilter]);

  useEffect(() => {
    if (accountId) fetchCalls(1);
  }, [accountId, fetchCalls]);

  // Infinite scroll: observe the sentinel and load the next page when visible.
  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node) return;
    if (tab !== 'calls') return;
    if (loading || loadingMore) return;
    if (page >= totalPages) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        fetchCalls(page + 1, true);
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [tab, loading, loadingMore, page, totalPages, fetchCalls]);

  // Auto-score: fetch existing scores, then queue any unscored calls.
  // Uses a per-call inflight set so newly-arrived calls (e.g. just completed
  // and freshly polled) get picked up even while a previous batch is running.
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
        const toScore = calls.filter((c) => {
          const id = String(c.id);
          return !data.scores?.[id] && !autoScoreInFlight.current.has(id);
        });
        if (toScore.length === 0) return;
        const concurrency = 3;
        let idx = 0;
        const worker = async () => {
          while (idx < toScore.length) {
            if (cancelled) return;
            const call = toScore[idx++];
            const id = String(call.id);
            autoScoreInFlight.current.add(id);
            try {
              const scoreRes = await fetch('/api/claude/calls/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ callId: id, call }),
              });
              if (scoreRes.ok) {
                const scoreData = await scoreRes.json();
                if (scoreData.result) {
                  setScores((prev) => ({ ...prev, [id]: scoreData.result }));
                }
              }
            } catch { /* continue */ }
            finally {
              autoScoreInFlight.current.delete(id);
            }
          }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, calls]);

  // Light polling — pick up newly-completed calls every 60s so auto-analyze
  // can score them without a full page reload. Merges new IDs to the front
  // instead of resetting pagination so the user's scroll position survives.
  useEffect(() => {
    if (!accountId || !session?.access_token) return;
    let cancelled = false;
    async function refresh() {
      if (cancelled) return;
      const params: Record<string, string | number> = { page: 1, per_page: 25 };
      if (searchQuery) params.search = searchQuery;
      if (dateFilter) params.start_date = dateFilter;
      if (directionFilter !== 'all') params.direction = directionFilter;
      try {
        const data = await ctmFetch(`/accounts/${accountId}/calls.json`, params);
        if (cancelled || !data.calls) return;
        setCalls(prev => {
          const existing = new Set(prev.map(c => c.id));
          const fresh = data.calls!.filter(c => !existing.has(c.id));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev];
        });
        if (data.total_entries) setTotalEntries(data.total_entries);
      } catch { /* swallow — try again next tick */ }
    }
    const id = window.setInterval(refresh, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [accountId, session?.access_token, searchQuery, dateFilter, directionFilter]);

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

  const visibleCalls = (() => {
    const filtered = calls.filter(call => {
      const spamFlag = isSpamCall(call);
      if (tab === 'spam') {
        if (!spamFlag) return false;
      } else {
        if (spamFlag) return false;
      }
      if (operatorFilter === 'all') return true;
      const s = scores[String(call.id)];
      return s?.operator_name === operatorFilter;
    });
    const getVal = (call: Call, s: ScoreRow | undefined): string | number => {
      switch (sortKey) {
        case 'id': return call.id;
        case 'fit_score': return s?.fit_score ?? -1;
        case 'call_name': return (s?.call_name || '').toLowerCase();
        case 'called_at': return parseDate(call.called_at)?.getTime() ?? 0;
        case 'caller_number': return (call.caller_number_formatted || call.caller_number || '').toLowerCase();
        case 'duration': return call.duration ?? 0;
        case 'caller_name': return (s?.caller_name || '').toLowerCase();
        case 'operator_name': return (s?.operator_name || '').toLowerCase();
        case 'client_type': return (s?.client_type || '').toLowerCase();
        case 'source': return (call.source_name || call.source || '').toLowerCase();
        case 'location': return [call.city, call.state].filter(Boolean).join(', ').toLowerCase();
        default: return 0;
      }
    };
    return filtered.slice().sort((a, b) => {
      const vA = getVal(a, scores[String(a.id)]);
      const vB = getVal(b, scores[String(b.id)]);
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  return (
    <div className="p-2.5 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-8 flex-wrap gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight mb-0.5 sm:mb-1">Calls</h1>
          <p className="text-[11px] sm:text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Call tracking powered by CTM
            {totalEntries > 0 && <span> &middot; {totalEntries.toLocaleString()} total</span>}
          </p>
        </div>
        <a
          href="/app/calls/heatmap"
          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-primary text-white rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label="View Heatmap"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h2v2H7zM11 8h2v2h-2zM15 8h2v2h-2zM7 12h2v2H7zM11 12h2v2h-2zM15 12h2v2h-2zM7 16h2v0H7zM11 16h2v0h-2zM15 16h2v0h-2z" />
          </svg>
          <span className="hidden sm:inline">View Heatmap</span>
          <span className="sm:hidden">Heatmap</span>
        </a>
      </div>

      {/* Timeline Slider — drag to scope all metrics below */}
      {timelineBounds && (
        <TimelineSlider
          min={timelineBounds.min}
          max={timelineBounds.max}
          start={rangeStart}
          end={rangeEnd}
          activityByDay={new Map(
            (() => {
              const m = new Map<string, number>();
              for (const c of allCallsRaw) {
                const p = parseDate(c.called_at);
                if (!p) continue;
                const k = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
                m.set(k, (m.get(k) || 0) + 1);
              }
              return Array.from(m.entries());
            })()
          )}
          onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        />
      )}

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
      ) : (
        <div className="mb-6 space-y-4">
          {/* Stat Cards — range-scoped */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Total Calls</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{rangeInsights.totalCalls}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.totalCalls > 0 ? `${rangeInsights.inbound} in · ${rangeInsights.outbound} out` : 'No calls in range'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-blue-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-blue-400 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Meaningful</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{rangeInsights.meaningful}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.totalCalls > 0 ? `${Math.round((rangeInsights.meaningful / rangeInsights.totalCalls) * 100)}% of calls` : 'No calls in range'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Missed</p>
              <p className="text-xl sm:text-2xl font-bold text-red-500">{rangeInsights.missed}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.inbound > 0 ? `${Math.round((rangeInsights.missed / rangeInsights.inbound) * 100)}% of inbound` : 'No inbound'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Missed (Paid)</p>
              <p className="text-xl sm:text-2xl font-bold text-red-500">{rangeInsights.missedPaid}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.missed > 0 ? `${Math.round((rangeInsights.missedPaid / rangeInsights.missed) * 100)}% of missed` : 'No missed calls'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-amber-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-amber-500 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Spam</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{spamCount}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {spamCount > 0 ? `${spamCount} reported` : 'None reported'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Returned</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-500">{rangeInsights.returnedMissed}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.missed > 0 ? `${Math.round((rangeInsights.returnedMissed / rangeInsights.missed) * 100)}% of missed` : 'No missed calls'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Returned (Picked Up)</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{rangeInsights.returnedPickedUp}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.returnedMissed > 0 ? `${Math.round((rangeInsights.returnedPickedUp / rangeInsights.returnedMissed) * 100)}% of returned` : 'No returned'}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-2.5 sm:p-5">
              <p className="text-[10px] sm:text-xs font-medium text-foreground/40 uppercase tracking-wider mb-0.5 sm:mb-1" style={{ fontFamily: 'var(--font-body)' }}>Avg Duration</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatDuration(rangeInsights.avgDuration)}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>per call</p>
            </div>
          </div>

          {/* Hourly Breakdown + Daily Summary (single-day only) */}
          {isSingleDay && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Hourly Breakdown</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="w-2 h-2 rounded-full bg-[#a0522d]" /> Calls
                    </span>
                    <span className="flex items-center gap-1 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Meaningful
                    </span>
                    <span className="flex items-center gap-1 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Missed
                    </span>
                    <span className="flex items-center gap-1 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Returned
                    </span>
                  </div>
                </div>
                <HourGraph data={hourlyCounts} />
              </div>
              <DailySummary
                calls={dailyCalls}
                scores={scores}
                date={rangeStartIso}
                isToday={isTodaySelected}
                sessionToken={session?.access_token || null}
              />
            </div>
          )}
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
      <div className="flex gap-1 mb-4 sm:mb-6 bg-warm-bg rounded-xl p-1 w-fit">
        {(['calls', 'sources', 'spam'] as Tab[]).map(t => {
          const label = t === 'calls' ? 'Call Log' : t === 'sources' ? 'Sources' : 'Spam';
          return (
            <button key={t} onClick={() => setTab(t)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {(tab === 'calls' || tab === 'spam') && (
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
      {(tab === 'calls' || tab === 'spam') && !loading && (
        <>
          {calls.length === 0 && !error ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
              <svg className="w-12 h-12 mx-auto text-foreground/15 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                {tab === 'spam' ? 'No reported spam numbers' : 'No calls found'}
              </p>
            </div>
          ) : calls.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-50">
                {visibleCalls.map(call => {
                  const expanded = expandedId === call.id;
                  const score = scores[String(call.id)];
                  const spamFlag = isSpamCall(call);
                  const missedFlag = isMissedCall(call);
                  const callNumber = call.caller_number_formatted || call.caller_number || 'Unknown';
                  const rowBg = spamFlag ? 'bg-amber-50/70' : missedFlag ? 'bg-red-50/60' : 'bg-white';
                  const accentBar = spamFlag ? 'bg-amber-400' : missedFlag ? 'bg-red-400' : score?.fit_score != null ? (score.fit_score >= 75 ? 'bg-emerald-500' : score.fit_score >= 50 ? 'bg-blue-500' : score.fit_score >= 25 ? 'bg-amber-500' : 'bg-red-500') : 'bg-gray-200';
                  return (
                    <Fragment key={call.id}>
                      <div
                        onClick={() => setExpandedId(expanded ? null : call.id)}
                        className={`${rowBg} cursor-pointer transition-colors active:bg-warm-bg/40`}
                      >
                        <div className="flex items-stretch">
                          <div className={`w-1 shrink-0 ${accentBar}`} />
                          <div className="flex-1 min-w-0 px-3.5 py-3">
                            {/* Top: fit score + call name + chevron */}
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">
                                {score?.fit_score != null ? (
                                  <span className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-base font-bold text-white ${fitScoreBg(score.fit_score)}`}>
                                    {score.fit_score}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-xs font-medium text-foreground/30 bg-gray-100">
                                    —
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-foreground leading-tight line-clamp-2">
                                  {score?.call_name || (spamFlag ? 'Spam call' : missedFlag ? (call.voicemail ? 'Voicemail' : 'Missed call') : 'Unanalyzed call')}
                                </p>
                                <p className="text-[11px] text-foreground/50 mt-0.5 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                                  {formatDate(call.called_at)} · {formatTime(call.called_at)}
                                  {call.duration != null && ` · ${formatDuration(call.duration)}`}
                                </p>
                              </div>
                              <svg className={`w-4 h-4 shrink-0 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            {/* Middle: number + badges */}
                            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                                {callNumber}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
                                {call.direction || 'unknown'}
                              </span>
                              {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">VM</span>}
                              {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">1st</span>}
                              {spamFlag && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">Spam</span>}
                              {missedFlag && !spamFlag && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">Missed</span>}
                            </div>

                            {/* Bottom: operator/type + actions */}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs text-foreground/60 min-w-0 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                                {score?.caller_name && <span className="font-medium text-foreground/80 truncate">{score.caller_name}</span>}
                                {score?.operator_name && (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                    <span>Op: <span className="text-foreground/80">{score.operator_name}</span></span>
                                  </span>
                                )}
                                {score?.client_type && (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                    <span>{score.client_type}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {call.audio && (
                                  <button
                                    onClick={() => playRecording(call.audio)}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${playingAudio === call.audio ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100'}`}
                                    aria-label={playingAudio === call.audio ? 'Stop' : 'Play'}
                                  >
                                    {playingAudio === call.audio ? (
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                  </button>
                                )}
                                {score?.transcript && (
                                  <button
                                    onClick={() => setTranscriptFor(call.id)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 active:bg-blue-100"
                                    aria-label="Transcript"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => rescoreCall(String(call.id), true)}
                                  disabled={scoringIds.has(String(call.id))}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-foreground/60 active:bg-warm-bg/50 disabled:opacity-50"
                                  aria-label={score?.scored_at ? 'Re-analyze' : 'Analyze'}
                                >
                                  <svg className={`w-3.5 h-3.5 ${scoringIds.has(String(call.id)) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <p className="text-[10px] font-mono text-foreground/30 mt-1.5">#{call.id}</p>
                          </div>
                        </div>
                      </div>
                      {expanded && (
                        <div className="bg-warm-bg/30 px-3.5 py-4">
                          <CallDetail
                            call={call}
                            score={scores[String(call.id)] || null}
                            scoring={scoringIds.has(String(call.id))}
                            error={scoringErrors[String(call.id)]}
                            onRescore={rescoreCall}
                          />
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-warm-bg/50">
                      <SortTh label="Call ID" sortKeyName="id" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Fit" sortKeyName="fit_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Call Name" sortKeyName="call_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Date / Time" sortKeyName="called_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Number" sortKeyName="caller_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Duration" sortKeyName="duration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Caller" sortKeyName="caller_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Operator" sortKeyName="operator_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Type" sortKeyName="client_type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Source" sortKeyName="source" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Location" sortKeyName="location" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} hiddenLg />
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recording</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Transcript</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {calls.filter(call => {
                      const spamFlag = isSpamCall(call);
                      if (tab === 'spam') {
                        if (!spamFlag) return false;
                      } else {
                        if (spamFlag) return false;
                      }
                      if (operatorFilter === 'all') return true;
                      const s = scores[String(call.id)];
                      return s?.operator_name === operatorFilter;
                    }).slice().sort((a, b) => {
                      const sA = scores[String(a.id)];
                      const sB = scores[String(b.id)];
                      const getVal = (call: Call, s: ScoreRow | undefined): string | number => {
                        switch (sortKey) {
                          case 'id': return call.id;
                          case 'fit_score': return s?.fit_score ?? -1;
                          case 'call_name': return (s?.call_name || '').toLowerCase();
                          case 'called_at': return parseDate(call.called_at)?.getTime() ?? 0;
                          case 'caller_number': return (call.caller_number_formatted || call.caller_number || '').toLowerCase();
                          case 'duration': return call.duration ?? 0;
                          case 'caller_name': return (s?.caller_name || '').toLowerCase();
                          case 'operator_name': return (s?.operator_name || '').toLowerCase();
                          case 'client_type': return (s?.client_type || '').toLowerCase();
                          case 'source': return (call.source_name || call.source || '').toLowerCase();
                          case 'location': return [call.city, call.state].filter(Boolean).join(', ').toLowerCase();
                          default: return 0;
                        }
                      };
                      const vA = getVal(a, sA);
                      const vB = getVal(b, sB);
                      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
                      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
                      return 0;
                    }).map(call => {
                      const expanded = expandedId === call.id;
                      return (
                        <Fragment key={call.id}>
                          <tr onClick={() => setExpandedId(expanded ? null : call.id)} className={`transition-colors cursor-pointer hover:bg-warm-bg/20 ${isSpamCall(call) ? 'bg-amber-50/70 border-b border-amber-200' : isMissedCall(call) ? 'bg-red-50/60 border-b border-red-100' : 'border-b border-gray-50'}`} style={isSpamCall(call) ? { boxShadow: 'inset 0 0 20px rgba(245,158,11,0.1), 0 0 8px rgba(245,158,11,0.06)' } : isMissedCall(call) ? { boxShadow: 'inset 0 0 20px rgba(239,68,68,0.1), 0 0 8px rgba(239,68,68,0.06)' } : undefined}>
                            <td className="px-3 sm:px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-start gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => rescoreCall(String(call.id), true)}
                                  disabled={scoringIds.has(String(call.id))}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-foreground/60 hover:text-primary hover:bg-white transition-colors border border-gray-200 disabled:opacity-50 whitespace-nowrap"
                                  title="Run AI analysis on this call"
                                >
                                  <svg className={`w-3 h-3 ${scoringIds.has(String(call.id)) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                  </svg>
                                  {scoringIds.has(String(call.id)) ? 'Analyzing…' : scores[String(call.id)]?.scored_at ? 'Re-analyze' : 'Analyze'}
                                </button>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
                                    {call.direction || 'unknown'}
                                  </span>
                                  {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">VM</span>}
                                  {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">1st</span>}
                                </div>
                                <div className="text-xs font-mono text-foreground/50 whitespace-nowrap">#{call.id}</div>
                              </div>
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
                            <td className="px-3 sm:px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div
                                className="min-w-0 relative inline-block"
                                onMouseEnter={() => setReportingSpam(String(call.id))}
                                onMouseLeave={() => setReportingSpam(null)}
                              >
                                <div className="text-sm font-medium text-foreground">
                                  {call.caller_number_formatted || call.caller_number || 'Unknown'}
                                </div>
                                {call.name && call.name !== 'Unknown' && <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{call.name}</div>}
                                {reportingSpam === String(call.id) && call.caller_number && (
                                  <div className="absolute left-0 top-full pt-1 z-20">
                                    {spamNumbers.has(normalizePhone(call.caller_number)) ? (
                                      <button
                                        type="button"
                                        onClick={() => { unreportSpam(call.caller_number); setReportingSpam(null); }}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm whitespace-nowrap"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                        Unmark spam
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => { reportSpam(call.caller_number); setReportingSpam(null); }}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 shadow-sm whitespace-nowrap"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z" /></svg>
                                        Report spam
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm font-mono text-foreground whitespace-nowrap">
                              {formatDuration(call.duration)}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/70 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                              {scores[String(call.id)]?.caller_name ? (
                                <span className="font-medium">{scores[String(call.id)].caller_name}</span>
                              ) : (
                                <span className="text-foreground/20">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/70 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
                              {isSpamCall(call) ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                                  Spam
                                </span>
                              ) : isMissedCall(call) ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                                  {call.voicemail ? 'Voicemail' : 'No answer'}
                                </span>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-2">
                                    <OperatorPicker
                                      currentName={scores[String(call.id)]?.operator_name || null}
                                      knownOperators={knownOperators}
                                      noAnswer={false}
                                      voicemail={false}
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
                                  {scores[String(call.id)]?.scored_at && (
                                    <div className="text-[9px] text-foreground/30 whitespace-nowrap leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                                      {formatDate(scores[String(call.id)].scored_at)} · {formatTime(scores[String(call.id)].scored_at)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
                              {isSpamCall(call) ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                                  Spam
                                </span>
                              ) : isMissedCall(call) ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                                  {call.voicemail ? 'Voicemail' : 'No answer'}
                                </span>
                              ) : (
                                <ClientTypePicker
                                  currentType={scores[String(call.id)]?.client_type || null}
                                  knownTypes={knownClientTypes}
                                  onPick={(t) => setManualClientType(String(call.id), t)}
                                />
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-3.5 text-sm text-foreground/60 max-w-[180px] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                              {call.source_name || call.source || '—'}
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
                              <td colSpan={14} className="px-5 py-5">
                                <CallDetail
                                  call={call}
                                  score={scores[String(call.id)] || null}
                                  scoring={scoringIds.has(String(call.id))}
                                  error={scoringErrors[String(call.id)]}
                                  onRescore={rescoreCall}
                                />
                              </td>
                            </tr>
                          )}
                          {!expanded && miniPopoverId === call.id && (
                            <tr className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-50" onClick={(e) => e.stopPropagation()}>
                              <td colSpan={14} className="px-5 py-4">
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

              {/* Infinite scroll sentinel + status */}
              <div ref={loadMoreSentinelRef} className="flex items-center justify-center px-5 py-4 border-t border-gray-100 bg-warm-bg/30">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className="w-3 h-3 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin" />
                    Loading more calls…
                  </div>
                ) : page >= totalPages ? (
                  <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                    All {totalEntries.toLocaleString()} calls loaded
                  </p>
                ) : (
                  <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                    {calls.length.toLocaleString()} of {totalEntries.toLocaleString()} loaded · scroll for more
                  </p>
                )}
              </div>
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

      {isAdmin && calls.length > 0 && (
        <button
          type="button"
          onClick={analyzeAllCalls}
          disabled={bulkAnalyzing}
          className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold shadow-lg transition-all ${bulkAnalyzing ? 'bg-primary-dark shadow-xl scale-105' : 'bg-primary hover:bg-primary-dark hover:shadow-xl'}`}
          style={{ fontFamily: 'var(--font-body)' }}
          title="Analyze every loaded call that doesn't have a score yet"
        >
          <svg className={`w-4 h-4 ${bulkAnalyzing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {bulkAnalyzing && bulkProgress ? (
            <>
              <span>Analyzing {bulkProgress.done}/{bulkProgress.total}</span>
              <span className="w-16 h-1.5 rounded-full bg-white/30 overflow-hidden">
                <span className="block h-full bg-white rounded-full transition-all" style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }} />
              </span>
            </>
          ) : (() => {
            const unscored = calls.filter(c => !scores[String(c.id)]).length;
            return unscored > 0 ? `Analyze ${unscored} unscored call${unscored === 1 ? '' : 's'}` : 'All calls analyzed';
          })()}
        </button>
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
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <select
          value={currentName || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__new__') { setEditing(true); return; }
            if (v === '__clear__') { onPick(null); return; }
            if (v === '') return;
            onPick(v);
          }}
          className={`appearance-none text-xs pl-2.5 pr-6 py-1 rounded-full font-medium border cursor-pointer focus:outline-none focus:border-primary/40 ${currentName ? 'bg-blue-50 text-blue-800 border-transparent' : error ? 'bg-red-50 text-red-700 border-transparent' : 'bg-white border-gray-200 text-foreground/40'}`}
        >
          {!currentName && <option value="">{error ? 'Error — Set…' : 'Set operator…'}</option>}
          {options.map((n) => <option key={n} value={n}>{n}</option>)}
          <option value="__new__">+ New name…</option>
          {currentName && <option value="__clear__">Clear</option>}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

// Inline client-type picker. Shows the pill when a type is set, otherwise a
// compact dropdown so the user can manually classify the call. Always allows
// changing or clearing via the dropdown on the right.
function ClientTypePicker({ currentType, knownTypes, onPick }: {
  currentType: string | null;
  knownTypes: string[];
  onPick: (type: string | null) => void;
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
          placeholder="Call type"
          className="text-xs px-2 py-1 rounded-md border border-gray-200 focus:outline-none focus:border-primary/40 w-28"
        />
        <button type="button" onClick={() => { if (custom.trim()) onPick(custom.trim()); setEditing(false); }} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-primary text-white hover:opacity-90">Save</button>
        <button type="button" onClick={() => { setEditing(false); setCustom(''); }} className="text-[10px] text-foreground/40 hover:text-foreground/70">Cancel</button>
      </div>
    );
  }

  const options = Array.from(new Set([...(currentType ? [currentType] : []), ...knownTypes])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <select
          value={currentType || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__new__') { setEditing(true); return; }
            if (v === '__clear__') { onPick(null); return; }
            if (v === '') return;
            onPick(v);
          }}
          className={`appearance-none text-xs pl-2.5 pr-6 py-1 rounded-full font-medium border cursor-pointer focus:outline-none focus:border-primary/40 ${currentType ? `${clientTypeBg(currentType)} border-transparent` : 'bg-white border-gray-200 text-foreground/40'}`}
        >
          {!currentType && <option value="">Set type…</option>}
          {options.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value="__new__">+ Custom…</option>
          {currentType && <option value="__clear__">Clear</option>}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-current opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

// Simple label/value cell used inside the expanded call detail drawer.
function SortTh({ label, sortKeyName, sortKey, sortDir, onSort, hiddenLg }: {
  label: string;
  sortKeyName: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  hiddenLg?: boolean;
}) {
  const active = sortKey === sortKeyName;
  return (
    <th
      onClick={() => onSort(sortKeyName)}
      className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-foreground/70 transition-colors ${active ? 'text-foreground/80' : 'text-foreground/40'} ${hiddenLg ? 'hidden lg:table-cell' : ''}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </span>
    </th>
  );
}

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
  error,
  onRescore,
}: {
  call: Call;
  score: ScoreRow | null;
  scoring: boolean;
  error?: string;
  onRescore: (callId: string, force: boolean) => void;
}) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Analysis failed</p>
            <p className="text-xs text-red-800 mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}
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

// Elegant date-range slider with draggable start + end handles, a highlighted
// selection band, and tiny activity-density bars overlaid above the track so
// you can see where the calls are. Drag the handles, or grab the band to pan
// the whole selection. Snaps to days. Keyboard-friendly (handles are focusable
// and arrow keys nudge by ±1 day).
function TimelineSlider({
  min,
  max,
  start,
  end,
  activityByDay,
  onChange,
}: {
  min: Date;
  max: Date;
  start: Date;
  end: Date;
  activityByDay: Map<string, number>;
  onChange: (start: Date, end: Date) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<null | { kind: 'start' | 'end' | 'band'; startX: number; startMs: number; endMs: number }>(null);

  const totalMs = Math.max(1, max.getTime() - min.getTime());
  const dayMs = 24 * 60 * 60 * 1000;
  const startPct = (start.getTime() - min.getTime()) / totalMs;
  const endPct = (end.getTime() - min.getTime()) / totalMs;

  // Month ticks across the range.
  const months = useMemo(() => {
    const out: { date: Date; pct: number; label: string; isYearStart: boolean }[] = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    if (cursor.getTime() < min.getTime()) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() <= max.getTime()) {
      const pct = (cursor.getTime() - min.getTime()) / totalMs;
      out.push({
        date: new Date(cursor),
        pct,
        label: cursor.toLocaleDateString('en-US', { month: 'short' }),
        isYearStart: cursor.getMonth() === 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [min, max, totalMs]);

  // Day-by-day activity bars (one per day across the full range).
  const activityBars = useMemo(() => {
    const bars: { pct: number; widthPct: number; count: number }[] = [];
    let peak = 1;
    activityByDay.forEach(v => { if (v > peak) peak = v; });
    const startDay = new Date(min); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(max); endDay.setHours(0, 0, 0, 0);
    const cursor = new Date(startDay);
    while (cursor.getTime() <= endDay.getTime()) {
      const dateStr = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      const count = activityByDay.get(dateStr) || 0;
      if (count > 0) {
        const t = cursor.getTime();
        bars.push({
          pct: (t - min.getTime()) / totalMs,
          widthPct: (dayMs / totalMs) * 100,
          count: count / peak,
        });
      }
      cursor.setTime(cursor.getTime() + dayMs);
    }
    return bars;
  }, [activityByDay, min, max, totalMs]);

  const snapToDay = (ms: number, side: 'start' | 'end') => {
    const d = new Date(ms);
    if (side === 'start') d.setHours(0, 0, 0, 0);
    else d.setHours(23, 59, 59, 999);
    return d;
  };

  const pctToMs = (pct: number) => min.getTime() + Math.max(0, Math.min(1, pct)) * totalMs;

  const onPointerDown = (kind: 'start' | 'end' | 'band') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging({ kind, startX: e.clientX, startMs: start.getTime(), endMs: end.getTime() });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const deltaMs = ((e.clientX - dragging.startX) / rect.width) * totalMs;
    if (dragging.kind === 'start') {
      const next = Math.min(dragging.startMs + deltaMs, dragging.endMs - dayMs);
      onChange(snapToDay(Math.max(min.getTime(), next), 'start'), end);
    } else if (dragging.kind === 'end') {
      const next = Math.max(dragging.endMs + deltaMs, dragging.startMs + dayMs);
      onChange(start, snapToDay(Math.min(max.getTime(), next), 'end'));
    } else {
      // Band: pan both, clamped.
      let newStart = dragging.startMs + deltaMs;
      let newEnd = dragging.endMs + deltaMs;
      const span = dragging.endMs - dragging.startMs;
      if (newStart < min.getTime()) { newStart = min.getTime(); newEnd = newStart + span; }
      if (newEnd > max.getTime()) { newEnd = max.getTime(); newStart = newEnd - span; }
      onChange(snapToDay(newStart, 'start'), snapToDay(newEnd, 'end'));
    }
  };

  const onPointerUp = () => setDragging(null);

  const onTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current || dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const clickedMs = pctToMs(pct);
    // Keep the current span; center it near the click point.
    const span = end.getTime() - start.getTime();
    let newStart = clickedMs - span / 2;
    let newEnd = clickedMs + span / 2;
    if (newStart < min.getTime()) { newStart = min.getTime(); newEnd = newStart + span; }
    if (newEnd > max.getTime()) { newEnd = max.getTime(); newStart = newEnd - span; }
    onChange(snapToDay(newStart, 'start'), snapToDay(newEnd, 'end'));
  };

  const nudgeStart = (days: number) => {
    const next = new Date(start.getTime() + days * dayMs);
    if (next.getTime() >= min.getTime() && next.getTime() < end.getTime()) onChange(snapToDay(next.getTime(), 'start'), end);
  };
  const nudgeEnd = (days: number) => {
    const next = new Date(end.getTime() + days * dayMs);
    if (next.getTime() > start.getTime() && next.getTime() <= max.getTime()) onChange(start, snapToDay(next.getTime(), 'end'));
  };

  const azParts = (d: Date) => {
    const parts = d.toLocaleDateString('en-US', { timeZone: 'America/Phoenix', month: 'short', day: 'numeric', year: 'numeric' }).split(' ');
    return { month: parts[0], day: parts[1]?.replace(',', '') ?? '', year: parts[2] ?? '' };
  };
  const rangeLabel = (() => {
    const s = azParts(start);
    const e = azParts(end);
    if (s.month === e.month && s.year === e.year) {
      return `${s.month} ${s.day} – ${e.day}, ${e.year}`;
    }
    return `${s.month} ${s.day} – ${e.month} ${e.day}, ${e.year}`;
  })();

  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs));

  // Phoenix is MST year round (UTC-7, no DST) so a given Phoenix calendar day
  // is always the UTC range [date 07:00, nextDate 07:00). Build Today /
  // Yesterday / preset ranges in that frame so the rest of the page (which
  // buckets calls by Phoenix date) lines up regardless of the user's tz.
  const phoenixDayBounds = (offsetDays: number) => {
    const nowAz = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const [yy, mo, dd] = nowAz.split('-').map(Number);
    const startMs = Date.UTC(yy, mo - 1, dd + offsetDays, 7, 0, 0, 0);
    const endMs = startMs + dayMs - 1;
    return [startMs, endMs] as const;
  };

  const setPreset = (days: number) => {
    const [, todayEnd] = phoenixDayBounds(0);
    const newEnd = new Date(Math.min(max.getTime(), todayEnd));
    const newStart = new Date(Math.max(min.getTime(), newEnd.getTime() - (days - 1) * dayMs - (dayMs - 1)));
    onChange(newStart, newEnd);
  };
  const setToday = () => {
    const [s, e] = phoenixDayBounds(0);
    const clampedStart = new Date(Math.max(min.getTime(), s));
    const clampedEnd = new Date(Math.min(max.getTime(), e));
    onChange(clampedStart, clampedEnd);
  };
  const setYesterday = () => {
    const [s, e] = phoenixDayBounds(-1);
    const clampedStart = new Date(Math.max(min.getTime(), s));
    const clampedEnd = new Date(Math.min(max.getTime(), e));
    onChange(clampedStart, clampedEnd);
  };
  const setAllTime = () => {
    const s = new Date(min); s.setHours(0, 0, 0, 0);
    const e = new Date(max); e.setHours(23, 59, 59, 999);
    onChange(s, e);
  };
  const isAllTime = Math.abs(start.getTime() - min.getTime()) < dayMs && Math.abs(end.getTime() - max.getTime()) < dayMs;

  // Match today/yesterday by comparing Phoenix-tz date strings, since the
  // preset buttons build their ranges in Phoenix time.
  const azDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const todayStr = azDate(new Date());
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return azDate(d); })();
  const startStr = azDate(start);
  const endStr = azDate(end);
  const isToday = startStr === todayStr && endStr === todayStr;
  const isYesterday = startStr === yesterdayStr && endStr === yesterdayStr;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 select-none">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Viewing</p>
          <p className="text-base sm:text-lg font-bold text-foreground tracking-tight">{rangeLabel}</p>
          <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{spanDays} day{spanDays === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1">
          {(() => {
            const presetActive = !isAllTime && !isToday && !isYesterday;
            const items: { key: string; label: string; active: boolean; onClick: () => void }[] = [
              { key: 'today', label: 'Today', active: isToday, onClick: setToday },
              { key: 'yesterday', label: 'Yesterday', active: isYesterday, onClick: setYesterday },
              { key: '7D', label: '7D', active: presetActive && spanDays === 7, onClick: () => setPreset(7) },
              { key: '14D', label: '14D', active: presetActive && spanDays === 14, onClick: () => setPreset(14) },
              { key: '30D', label: '30D', active: presetActive && spanDays === 30, onClick: () => setPreset(30) },
              { key: '90D', label: '90D', active: presetActive && spanDays === 90, onClick: () => setPreset(90) },
              { key: 'all', label: 'All', active: isAllTime, onClick: setAllTime },
            ];
            return items.map(it => (
              <button
                key={it.key}
                onClick={it.onClick}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${it.active ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {it.label}
              </button>
            ));
          })()}
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-16 mt-2 cursor-pointer"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onTrackClick}
      >
        {/* Activity density bars (behind the track) */}
        <div className="absolute inset-x-0 top-0 bottom-7 overflow-hidden">
          {activityBars.map((b, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-primary/20 rounded-sm"
              style={{
                left: `${b.pct * 100}%`,
                width: `${b.widthPct}%`,
                height: `${Math.max(4, b.count * 100)}%`,
                minHeight: 2,
              }}
            />
          ))}
        </div>

        {/* Track base */}
        <div className="absolute inset-x-0 bottom-6 h-1 rounded-full bg-gray-100" />

        {/* Selected band */}
        <div
          className="absolute bottom-6 h-1 rounded-full bg-primary shadow-[0_0_0_3px_rgba(160,82,45,0.1)] cursor-grab active:cursor-grabbing transition-[background] hover:bg-primary/90"
          style={{ left: `${startPct * 100}%`, width: `${Math.max(0, (endPct - startPct) * 100)}%` }}
          onPointerDown={onPointerDown('band')}
        />

        {/* Filled activity bars under the selection (highlighted) */}
        <div className="absolute top-0 bottom-7 overflow-hidden pointer-events-none"
          style={{ left: `${startPct * 100}%`, width: `${Math.max(0, (endPct - startPct) * 100)}%` }}
        >
          {activityBars.map((b, i) => {
            const barRightPct = b.pct + b.widthPct / 100;
            const inRange = barRightPct > startPct && b.pct < endPct;
            if (!inRange) return null;
            const relativeLeft = ((b.pct - startPct) / Math.max(0.0001, (endPct - startPct))) * 100;
            const relativeWidth = (b.widthPct / ((endPct - startPct) * 100)) * 100;
            return (
              <div
                key={i}
                className="absolute bottom-0 bg-primary rounded-sm"
                style={{
                  left: `${relativeLeft}%`,
                  width: `${relativeWidth}%`,
                  height: `${Math.max(6, b.count * 100)}%`,
                  opacity: 0.85,
                }}
              />
            );
          })}
        </div>

        {/* Start handle */}
        <button
          type="button"
          aria-label="Start date"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') nudgeStart(-1); if (e.key === 'ArrowRight') nudgeStart(1); }}
          onPointerDown={onPointerDown('start')}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 w-4 h-4 rounded-full bg-white border-2 border-primary cursor-ew-resize shadow-md hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-transform"
          style={{ left: `calc(${startPct * 100}% - 8px)` }}
        />

        {/* End handle */}
        <button
          type="button"
          aria-label="End date"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') nudgeEnd(-1); if (e.key === 'ArrowRight') nudgeEnd(1); }}
          onPointerDown={onPointerDown('end')}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 w-4 h-4 rounded-full bg-white border-2 border-primary cursor-ew-resize shadow-md hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-transform"
          style={{ left: `calc(${endPct * 100}% - 8px)` }}
        />

        {/* Month labels */}
        <div className="absolute inset-x-0 bottom-0 h-5 pointer-events-none">
          {months.map((m, i) => (
            <div
              key={i}
              className={`absolute text-[10px] whitespace-nowrap select-none ${m.isYearStart ? 'text-foreground/70 font-semibold' : 'text-foreground/30'}`}
              style={{ left: `${m.pct * 100}%`, transform: 'translateX(-50%)', fontFamily: 'var(--font-body)' }}
            >
              {m.isYearStart ? `${m.label} ${m.date.getFullYear()}` : m.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HourGraph({
  data,
}: {
  data: { hour: number; label: string; count: number; missedCount: number; returnedCount: number; meaningfulCount: number }[];
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

  const max = Math.max(...data.map((d) => d.count), 1);
  const pts = data.map((d, i) => {
    const x = padL + (i / (data.length - 1)) * innerW;
    const y = padT + innerH - (d.count / max) * innerH;
    const missedY = padT + innerH - (d.missedCount / max) * innerH;
    const returnedY = padT + innerH - (d.returnedCount / max) * innerH;
    const meaningfulY = padT + innerH - (d.meaningfulCount / max) * innerH;
    return { x, y, missedY, returnedY, meaningfulY, ...d };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`;
  const missedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.missedY.toFixed(1)}`).join(' ');
  const returnedPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.returnedY.toFixed(1)}`).join(' ');
  const meaningfulPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.meaningfulY.toFixed(1)}`).join(' ');

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + innerH * t);
  const axisEvery = 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full block select-none"
      preserveAspectRatio="none"
      style={{ maxHeight: 200 }}
    >
      <defs>
        <linearGradient id="hg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a0522d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#a0522d" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="hg-clip">
          <rect x={padL} y={padT - 4} width={innerW} height={innerH + 8}>
            <animate attributeName="width" from="0" to={innerW} dur="1.8s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1" />
          </rect>
        </clipPath>
      </defs>

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

      <g clipPath="url(#hg-clip)">
        <path d={areaPath} fill="url(#hg-area)" />
        <path d={linePath} fill="none" stroke="#a0522d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={missedPath} fill="none" stroke="#ef4444" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
        <path d={returnedPath} fill="none" stroke="#10b981" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
        <path d={meaningfulPath} fill="none" stroke="#3b82f6" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
      </g>

      {pts.map((p, i) => {
        const delay = 0.2 + i * 0.04;
        return (
          <g key={`mr-${p.hour}`} className="pointer-events-none">
            {p.missedCount > 0 && (
              <>
                <circle cx={p.x} cy={p.missedY} r={3} fill="#ffffff" stroke="#ef4444" strokeWidth="2" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay}s forwards` }} />
                <text x={p.x - 6} y={p.missedY + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="#ef4444" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.05}s forwards`, fontFamily: 'var(--font-body)' }}>{p.missedCount}</text>
              </>
            )}
            {p.returnedCount > 0 && (
              <>
                <circle cx={p.x} cy={p.returnedY} r={3} fill="#ffffff" stroke="#10b981" strokeWidth="2" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay}s forwards` }} />
                <text x={p.x + 6} y={p.returnedY + 3} textAnchor="start" fontSize="9" fontWeight="700" fill="#10b981" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.05}s forwards`, fontFamily: 'var(--font-body)' }}>{p.returnedCount}</text>
              </>
            )}
            {p.meaningfulCount > 0 && (
              <>
                <circle cx={p.x} cy={p.meaningfulY} r={3} fill="#ffffff" stroke="#3b82f6" strokeWidth="2" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay}s forwards` }} />
                <text x={p.x + 6} y={p.meaningfulY + 3} textAnchor="start" fontSize="9" fontWeight="700" fill="#3b82f6" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.05}s forwards`, fontFamily: 'var(--font-body)' }}>{p.meaningfulCount}</text>
              </>
            )}
          </g>
        );
      })}

      {pts.map((p, i) => {
        const delay = 0.2 + i * 0.04;
        const showLabel = i % axisEvery === 0;
        return (
          <g
            key={p.hour}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx((cur) => (cur === i ? null : cur))}
          >
            <rect
              x={p.x - innerW / pts.length / 2}
              y={padT - 4}
              width={innerW / pts.length}
              height={innerH + padB}
              fill="transparent"
            />
            {p.count > 0 && (
              <circle cx={p.x} cy={p.y} r={3.5} fill="#ffffff" stroke="#a0522d" strokeWidth="2" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay}s forwards` }} />
            )}
            {p.count > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(26,26,26,0.8)" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.05}s forwards`, fontFamily: 'var(--font-body)' }}>{p.count}</text>
            )}
            {showLabel && (
              <text x={p.x} y={H - 14} textAnchor="middle" fontSize="10" fontWeight="500" fill="rgba(26,26,26,0.4)" style={{ opacity: 0, animation: `wgFadeIn 420ms ease-out ${delay + 0.1}s forwards`, fontFamily: 'var(--font-body)' }}>{p.label}</text>
            )}
          </g>
        );
      })}

      {hoveredIdx !== null && pts[hoveredIdx] && pts[hoveredIdx].count > 0 && (() => {
        const p = pts[hoveredIdx];
        const boxW = 160;
        const boxH = 60;
        let tipX = p.x - boxW / 2;
        if (tipX < padL) tipX = padL;
        if (tipX + boxW > W - padR) tipX = W - padR - boxW;
        const placeAbove = p.y - boxH - 12 > padT;
        const tipY = placeAbove ? p.y - boxH - 12 : p.y + 14;
        const nextH = (p.hour + 1) % 24;
        const nextLabel = `${nextH % 12 === 0 ? 12 : nextH % 12}${nextH < 12 ? 'a' : 'p'}`;
        return (
          <g className="pointer-events-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}>
            <rect x={tipX} y={tipY} width={boxW} height={boxH} rx={8} fill="#ffffff" stroke="rgba(0,0,0,0.08)" />
            <text x={tipX + 10} y={tipY + 16} fontSize="10" fontWeight="700" fill="rgba(26,26,26,0.5)" style={{ fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {p.label}–{nextLabel} · {p.count} call{p.count === 1 ? '' : 's'}
            </text>
            <text x={tipX + 10} y={tipY + 34} fontSize="11" fill="#3b82f6" style={{ fontFamily: 'var(--font-body)' }}>Meaningful: {p.meaningfulCount}</text>
            <text x={tipX + 10} y={tipY + 48} fontSize="11" fill="#ef4444" style={{ fontFamily: 'var(--font-body)' }}>Missed: {p.missedCount}</text>
            <text x={tipX + boxW - 10} y={tipY + 48} textAnchor="end" fontSize="11" fill="#10b981" style={{ fontFamily: 'var(--font-body)' }}>Returned: {p.returnedCount}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function MiniHeatmap({
  calls,
  selectedDate,
  onDayClick,
}: {
  calls: Call[];
  selectedDate: string;
  onDayClick: (date: string) => void;
}) {
  const WEEKS = 14;
  const todayAz = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }), []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of calls) {
      const p = parseDate(c.called_at);
      if (!p) continue;
      const k = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [calls]);

  const dateGrid = useMemo(() => {
    const [y, mo, d] = todayAz.split('-').map(Number);
    const end = new Date(Date.UTC(y, mo - 1, d, 12));
    const endDay = end.getUTCDay();
    const daysToSaturday = (6 - endDay + 7) % 7;
    const gridEnd = new Date(end);
    gridEnd.setUTCDate(gridEnd.getUTCDate() + daysToSaturday);
    const totalDays = WEEKS * 7;
    const start = new Date(gridEnd);
    start.setUTCDate(start.getUTCDate() - (totalDays - 1));
    const out: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d2 = new Date(start);
      d2.setUTCDate(d2.getUTCDate() + i);
      out.push(d2.toISOString().slice(0, 10));
    }
    return out;
  }, [todayAz]);

  const maxCount = useMemo(() => {
    let m = 0;
    counts.forEach(v => { if (v > m) m = v; });
    return m;
  }, [counts]);

  const cellClass = (count: number): string => {
    if (count === 0) return 'bg-warm-bg border border-foreground/5';
    if (maxCount === 0) return 'bg-warm-bg border border-foreground/5';
    const ratio = count / maxCount;
    if (ratio > 0.75) return 'bg-primary-dark';
    if (ratio > 0.5) return 'bg-primary';
    if (ratio > 0.25) return 'bg-primary/60';
    return 'bg-primary/30';
  };

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < WEEKS; col++) {
      const firstDayOfWeek = dateGrid[col * 7];
      if (!firstDayOfWeek) continue;
      const mo = Number(firstDayOfWeek.slice(5, 7)) - 1;
      if (mo !== lastMonth) {
        const dt = new Date(Date.UTC(Number(firstDayOfWeek.slice(0, 4)), mo, 1));
        labels.push({ col, label: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) });
        lastMonth = mo;
      }
    }
    return labels;
  }, [dateGrid]);

  const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className="inline-flex flex-col gap-2 w-full">
      <div className="flex items-end gap-[3px] pl-7 h-4">
        {Array.from({ length: WEEKS }).map((_, col) => {
          const lbl = monthLabels.find((m) => m.col === col);
          return (
            <div key={col} className="w-[14px] text-[9px] text-foreground/40 font-medium truncate" style={{ fontFamily: 'var(--font-body)' }}>
              {lbl?.label || ''}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-[3px]">
          {weekdayLabels.map((d, i) => (
            <div key={i} className="h-[14px] text-[9px] text-foreground/40 font-medium leading-[14px] w-5 text-right pr-1" style={{ fontFamily: 'var(--font-body)' }}>
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: WEEKS }).map((_, col) => (
            <div key={col} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, row) => {
                const date = dateGrid[col * 7 + row];
                if (!date) return <div key={row} className="w-[14px] h-[14px]" />;
                const count = counts.get(date) || 0;
                const isFuture = date > todayAz;
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => !isFuture && onDayClick(date)}
                    title={`${date}: ${count} call${count === 1 ? '' : 's'}`}
                    className={`w-[14px] h-[14px] rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${
                      isFuture ? 'bg-transparent border border-dashed border-foreground/10 cursor-default' : cellClass(count)
                    } ${isSelected ? 'ring-2 ring-foreground' : ''}`}
                    disabled={isFuture}
                    aria-label={`${date}: ${count} calls`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-warm-bg border border-foreground/5" />
        <div className="w-3 h-3 rounded-sm bg-primary/30" />
        <div className="w-3 h-3 rounded-sm bg-primary/60" />
        <div className="w-3 h-3 rounded-sm bg-primary" />
        <div className="w-3 h-3 rounded-sm bg-primary-dark" />
        <span>More</span>
      </div>
    </div>
  );
}

function DailySummary({
  calls,
  scores,
  date,
  isToday,
  sessionToken,
}: {
  calls: Call[];
  scores: Record<string, ScoreRow>;
  date: string;
  isToday: boolean;
  sessionToken: string | null;
}) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Stable signature so we only regenerate when calls or relevant scores change
  const signature = useMemo(() => {
    const idSig = calls.map(c => c.id).sort((a, b) => a - b).join(',');
    const scoreSig = calls.map(c => {
      const s = scores[String(c.id)];
      return s ? `${c.id}:${s.fit_score ?? 'x'}:${(s.summary || '').length}` : `${c.id}:_`;
    }).join('|');
    return `${date}::${idSig}::${scoreSig}`;
  }, [calls, scores, date]);

  useEffect(() => {
    if (!sessionToken) return;
    if (calls.length === 0) {
      setSummary(isToday ? 'No calls today yet.' : 'No calls on this day.');
      setLoading(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const callsPayload = calls.map(c => ({
          id: c.id,
          called_at: c.called_at,
          direction: c.direction,
          duration: c.duration,
          talk_time: c.talk_time,
          voicemail: c.voicemail,
          caller_number_formatted: c.caller_number_formatted,
          caller_number: c.caller_number,
          source: c.source,
          source_name: c.source_name,
          city: c.city,
          state: c.state,
        }));
        const scoresPayload: Record<string, {
          caller_name: string | null;
          client_type: string | null;
          fit_score: number | null;
          summary: string;
          next_steps: string | null;
          caller_interest: string | null;
        }> = {};
        for (const c of calls) {
          const s = scores[String(c.id)];
          if (s) scoresPayload[String(c.id)] = {
            caller_name: s.caller_name,
            client_type: s.client_type,
            fit_score: s.fit_score,
            summary: s.summary,
            next_steps: s.next_steps,
            caller_interest: s.caller_interest,
          };
        }
        const res = await fetch('/api/claude/calls/daily-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({ date, calls: callsPayload, scores: scoresPayload }),
        });
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
          setError(null);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate summary');
      } finally {
        setLoading(false);
      }
    }, 1500);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, sessionToken, isToday]);

  const stats = useMemo(() => {
    let inbound = 0, outbound = 0, missed = 0, talkSec = 0;
    for (const c of calls) {
      if (c.direction === 'inbound') inbound++;
      if (c.direction === 'outbound') outbound++;
      if (c.direction === 'inbound' && (c.voicemail || (c.talk_time ?? 0) < 3)) missed++;
      talkSec += c.talk_time || 0;
    }
    return { inbound, outbound, missed, talkSec };
  }, [calls]);

  const allScored = calls.length > 0 && calls.every(c => scores[String(c.id)]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
            {isToday ? 'Daily Summary so far' : 'Daily Summary'}
          </p>
          {!allScored && calls.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              analyzing
            </span>
          )}
        </div>
        <span className="text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
          {calls.length} {calls.length === 1 ? 'call' : 'calls'}
          {calls.length > 0 && ` · ${stats.inbound} in · ${stats.outbound} out${stats.missed > 0 ? ` · ${stats.missed} missed` : ''}`}
        </span>
      </div>
      {loading && !summary ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-11/12" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-9/12" />
        </div>
      ) : error ? (
        <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
      ) : (
        <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${loading ? 'opacity-60' : ''}`} style={{ fontFamily: 'var(--font-body)' }}>
          {summary || 'Generating summary…'}
        </p>
      )}
    </div>
  );
}
