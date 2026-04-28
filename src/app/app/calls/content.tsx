'use client';

import { useAuth } from '@/lib/AuthProvider';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CallAiBadge from './CallAiHover';
import { OperatorPicker, ClientTypePicker, SelectAllCheckbox, SortTh, DetailField } from './Pickers';
import { ScoreMiniPopover } from './ScoreMiniPopover';
import { AudioScrubber } from './AudioScrubber';
import { MobileRangePresets } from './MobileRangePresets';
import { CopyCallLinkButton, OperatorCallLinkButton, SyncStatusIndicator } from './LinkButtons';
import { MiniHeatmap } from './MiniHeatmap';
import { TimelineSlider } from './TimelineSlider';
import { OperatorInsightsPanel } from './OperatorInsights';
import { SourcesPanel } from './SourcesPanel';
import { CallDetail } from './CallDetail';
import {
  ScoreRow,
  Call,
  CTMResponse,
  Tab,
  SPAM_STORAGE_KEY,
  Insights,
  OperatorCallEntry,
  OperatorAgg,
  OpSortKey,
  directionStyle,
  normalizePhone,
  isPaidSource,
  isMissedCall,
  ctmFetch,
  formatDuration,
  parseDate,
  formatDate,
  formatTime,
  clientTypeBg,
  fitScoreBg,
  scoreColorHex,
  sentimentStyle,
  fmtAudioTime,
  scoreColorClass,
} from './_shared';

export default function CallsContent() {
  const { user, session, isAdmin } = useAuth();
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Batch selection — checkbox in every row, sticky action bar appears
  // when any are selected, "Analyze N selected" runs the same per-call
  // scoring pipeline as the floating "Analyze all" CTA but scoped.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive the active tab directly from the URL every render. Keeping
  // it as local state was causing the sidebar "Calls" click to land on
  // stale state (e.g. Operator Insights) whenever the ?tab= param was
  // stripped from a same-pathname navigation. Reading from the URL
  // means there's no sync lag and every tab is genuinely shareable.
  const tab: Tab = (() => {
    const q = searchParams?.get('tab');
    return q === 'sources' || q === 'spam' || q === 'operators' ? q : 'calls';
  })();
  const setTab = useCallback((next: Tab) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    sp.set('tab', next);
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(() => {
    const q = searchParams?.get('call');
    const n = q ? Number(q) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  // Legacy support: /app/calls?call=<id> used to expand a row inline.
  // Shared call links now live at /app/calls/<id>, so redirect old URLs
  // to the new path.
  useEffect(() => {
    const q = searchParams?.get('call');
    if (!q) return;
    router.replace(`/app/calls/${encodeURIComponent(q)}`);
  }, [searchParams, router]);
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
  const [rangeStart, setRangeStart] = useState<Date>(() => {
    // Default to today in Phoenix (MST, UTC-7 year-round) so the initial
    // view of the Calls page matches the Today preset exactly.
    const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 7, 0, 0, 0));
  });
  const [rangeEnd, setRangeEnd] = useState<Date>(() => {
    const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 7, 0, 0, 0) + 24 * 60 * 60 * 1000 - 1);
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [scoringErrors, setScoringErrors] = useState<Record<string, string>>({});
  const autoScoreInFlight = useRef<Set<string>>(new Set());
  const [spamNumbers, setSpamNumbers] = useState<Set<string>>(new Set());
  const [reportingSpam, setReportingSpam] = useState<string | null>(null);

  // Load the spam list. Preferred source is public.call_spam_numbers
  // (shared across users). On first load we also push any numbers still
  // living in this browser's localStorage up to the server, so the new
  // /api/calls/insights endpoint — which filters by the server list —
  // sees the same spam classifications the UI does.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      const local = (() => {
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SPAM_STORAGE_KEY) : null;
          if (!raw) return [] as string[];
          const arr = JSON.parse(raw);
          return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
        } catch {
          return [] as string[];
        }
      })();

      let serverSet = new Set<string>();
      try {
        const res = await fetch('/api/calls/spam', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.numbers)) serverSet = new Set<string>(data.numbers);
        }
      } catch { /* ignore — will fall back to local */ }

      // Push any local-only numbers up so server aggregates catch up.
      const missingOnServer = local.filter((n) => !serverSet.has(n));
      if (missingOnServer.length > 0) {
        await Promise.all(
          missingOnServer.map((n) =>
            fetch('/api/calls/spam', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ number: n }),
            }).catch(() => null),
          ),
        );
        missingOnServer.forEach((n) => serverSet.add(n));
      }

      if (!cancelled) {
        setSpamNumbers(serverSet.size > 0 ? serverSet : new Set(local));
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const reportSpam = useCallback((num: string) => {
    const key = normalizePhone(num);
    if (!key) return;
    setSpamNumbers((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (!session?.access_token) return;
    fetch('/api/calls/spam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ number: key }),
    }).catch(() => {
      // Roll back local state if the server rejects the report.
      setSpamNumbers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    });
  }, [session?.access_token]);

  const unreportSpam = useCallback((num: string) => {
    const key = normalizePhone(num);
    if (!key) return;
    setSpamNumbers((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (!session?.access_token) return;
    fetch(`/api/calls/spam?number=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {
      setSpamNumbers((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    });
  }, [session?.access_token]);

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

  const localRangeInsights = useMemo(() => {
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
    let missedSpam = 0;

    for (const c of sourceCalls) {
      const p = parseDate(c.called_at);
      if (!p) continue;
      const callDate = p.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      if (!rangeDates.has(callDate)) continue;
      const isSpam = isSpamCall(c);
      if (isSpam) {
        spam++;
        if (isMissedCall(c)) missedSpam++;
        continue;
      }
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
      missedSpam,
      returnedMissed,
      returnedPickedUp,
      dailyCounts,
      startIso,
      endIso,
    };
  }, [allCallsRaw, calls, scores, rangeStart, rangeEnd, isSpamCall]);

  // Canonical counts from public.calls (populated by /api/ctm/sync).
  // When this resolves we prefer it over the local computation because
  // it sees every synced call, not just what the browser has paginated.
  const [serverRangeInsights, setServerRangeInsights] = useState<typeof localRangeInsights | null>(null);
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    const from = rangeStart.toISOString();
    const to = rangeEnd.toISOString();
    (async () => {
      try {
        const res = await fetch(`/api/calls/insights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`insights ${res.status}`);
        const data = await res.json();
        if (cancelled || data.error) return;
        // Trust the server. Zero is a real answer — means nothing is
        // synced into public.calls for this window yet. Falling back to
        // the paginated client data would paper over sync lag and
        // silently disagree with other pages that read the same table.
        // Pad dailyCounts with label/short/sources to match the client shape.
        const dailyCounts = (data.dailyCounts ?? []).map((d: { date: string; count: number; missedCount: number; returnedCount: number; meaningfulCount: number }) => {
          const [y, m, dd] = d.date.split('-').map(Number);
          const dt = new Date(Date.UTC(y, m - 1, dd, 12));
          return {
            date: d.date,
            label: dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
            short: dt.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }),
            count: d.count,
            missedCount: d.missedCount,
            returnedCount: d.returnedCount,
            meaningfulCount: d.meaningfulCount,
            sources: [],
          };
        });
        setServerRangeInsights({
          totalCalls: data.totalCalls,
          avgDuration: data.avgDuration,
          inbound: data.inbound,
          outbound: data.outbound,
          missed: data.missed,
          missedPaid: data.missedPaid,
          meaningful: data.meaningful,
          spam: data.spam,
          missedSpam: data.missedSpam ?? 0,
          returnedMissed: data.returnedMissed,
          returnedPickedUp: data.returnedPickedUp,
          dailyCounts,
          startIso: rangeStart.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }),
          endIso: rangeEnd.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }),
        });
      } catch {
        // Leave serverRangeInsights null so we fall through to local.
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, rangeStart, rangeEnd, spamNumbers]);

  const rangeInsights = serverRangeInsights ?? localRangeInsights;

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

  // Score a list of calls in parallel (concurrency 3). Generic so the
  // same path powers both the floating "Analyze all" CTA and the
  // sticky "Analyze selected" action. `force=true` re-scores already
  // analyzed calls (used by the selection action so the user can
  // re-run on a curated set).
  const analyzeCalls = useCallback(async (targets: Call[], opts: { force?: boolean } = {}) => {
    if (!session?.access_token) return;
    if (!targets.length) return;
    const force = opts.force === true;
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
        // When `force` is off, skip already-scored calls to save API calls.
        if (!force && scores[callId]) { done++; setBulkProgress({ done, total: targets.length }); continue; }
        setScoringIds((prev) => { const n = new Set(prev); n.add(callId); return n; });
        try {
          const res = await fetch('/api/claude/calls/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
            body: JSON.stringify({ callId, call, force }),
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
  }, [scores, session]);

  const analyzeAllCalls = useCallback(() => analyzeCalls(calls), [analyzeCalls, calls]);

  const analyzeSelectedCalls = useCallback(() => {
    const targets = calls.filter((c) => selectedIds.has(String(c.id)));
    // Selection implies intent — re-score even if already analyzed.
    analyzeCalls(targets, { force: true });
  }, [analyzeCalls, calls, selectedIds]);

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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
      let data: { result?: ScoreRow; error?: string; detail?: string; call_in_progress?: boolean; audio_pending?: boolean } = {};
      try { data = await res.json(); } catch { /* non-json response */ }
      if (!res.ok) {
        const msg = data.error || data.detail || `Analyze failed (${res.status})`;
        setScoringErrors((prev) => ({ ...prev, [callId]: msg }));
        return;
      }
      // 202 from the score route means the call isn't ready to be
      // analyzed yet — either it's still in progress, or the
      // recording hasn't been transcoded by CTM. Both resolve on
      // their own; surface a friendly message instead of an error.
      if (data.call_in_progress) {
        setScoringErrors((prev) => ({ ...prev, [callId]: 'Call still in progress — analysis will run once it ends.' }));
        return;
      }
      if (data.audio_pending) {
        setScoringErrors((prev) => ({ ...prev, [callId]: 'Recording not ready yet — try again in a few minutes.' }));
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
          <SyncStatusIndicator token={session?.access_token ?? null} />
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Mobile-only quick range presets — always visible, even before
          timelineBounds loads. The full TimelineSlider below is richer
          but hidden on phones where screen space is tight. */}
      <div className="sm:hidden mb-3">
        <MobileRangePresets
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          min={timelineBounds?.min ?? null}
          max={timelineBounds?.max ?? null}
          onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        />
      </div>

      {/* Timeline Slider — drag to scope all metrics below. Hidden on
          phones in favor of the compact preset bar above. */}
      {timelineBounds && (
        <div className="hidden sm:block">
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
        </div>
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
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-4">
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
              {rangeInsights.missedSpam > 0 && (
                <p className="text-[10px] sm:text-xs font-medium text-amber-600 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {rangeInsights.missedSpam} spam excluded
                </p>
              )}
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
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{rangeInsights.spam}</p>
              <p className="text-[10px] sm:text-xs text-foreground/30 mt-0.5 sm:mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {rangeInsights.spam > 0 ? `${rangeInsights.spam} reported` : 'None reported'}
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
        {(['calls', 'sources', 'spam', ...(isAdmin ? ['operators'] as const : [])] as Tab[]).map(t => {
          const label = t === 'calls' ? 'Call Log' : t === 'sources' ? 'Sources' : t === 'spam' ? 'Spam' : 'Operator Insights';
          const isAdminTab = t === 'operators';
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                // Operator Insights is most useful against the entire history,
                // so switching into it defaults the range to "All".
                if (t === 'operators' && timelineBounds) {
                  const s = new Date(timelineBounds.min); s.setHours(0, 0, 0, 0);
                  const e = new Date(timelineBounds.max); e.setHours(23, 59, 59, 999);
                  setRangeStart(s);
                  setRangeEnd(e);
                }
              }}
              className={`relative px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                {label}
                {isAdminTab && (
                  <span className="group/admin relative inline-flex items-center">
                    <span aria-hidden className="absolute inset-0 rounded-full bg-amber-300/50 blur-[3px] animate-pulse" />
                    <svg className="relative w-3.5 h-3.5 text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" fill="currentColor" viewBox="0 0 24 24" aria-label="Super admin only">
                      <path d="M12 2l2.39 4.84L20 7.54l-4 3.89.94 5.5L12 14.77 7.06 16.93 8 11.43l-4-3.89 5.61-.7L12 2z" />
                    </svg>
                    <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-30 whitespace-nowrap rounded-md bg-foreground text-white text-[10px] font-semibold px-2 py-1 opacity-0 group-hover/admin:opacity-100 transition-opacity shadow-lg" style={{ fontFamily: 'var(--font-body)' }}>
                      Super admin only
                    </span>
                  </span>
                )}
              </span>
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
                          <div
                            className="shrink-0 flex items-center pl-2.5 pr-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(String(call.id))}
                              onChange={() => toggleSelect(String(call.id))}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                              aria-label={`Select call ${call.id}`}
                            />
                          </div>
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
                      <th className="w-9 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <SelectAllCheckbox
                          visibleCalls={visibleCalls}
                          selectedIds={selectedIds}
                          setSelectedIds={setSelectedIds}
                        />
                      </th>
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
                          <tr data-call-id={call.id} onClick={() => setExpandedId(expanded ? null : call.id)} className={`transition-colors cursor-pointer hover:bg-warm-bg/20 ${selectedIds.has(String(call.id)) ? 'bg-primary/5' : ''} ${isSpamCall(call) ? 'bg-amber-50/70 border-b border-amber-200' : isMissedCall(call) ? 'bg-red-50/60 border-b border-red-100' : 'border-b border-gray-50'}`} style={isSpamCall(call) ? { boxShadow: 'inset 0 0 20px rgba(245,158,11,0.1), 0 0 8px rgba(245,158,11,0.06)' } : isMissedCall(call) ? { boxShadow: 'inset 0 0 20px rgba(239,68,68,0.1), 0 0 8px rgba(239,68,68,0.06)' } : undefined}>
                            <td className="w-9 px-3 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(String(call.id))}
                                onChange={() => toggleSelect(String(call.id))}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                aria-label={`Select call ${call.id}`}
                              />
                            </td>
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
                                <div className="flex items-center gap-1.5">
                                  <div className="text-xs font-mono text-foreground/50 whitespace-nowrap">#{call.id}</div>
                                  <CopyCallLinkButton callId={String(call.id)} />
                                </div>
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
                              <td colSpan={15} className="px-5 py-5">
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
        <SourcesPanel calls={calls} scores={scores} onOpenCall={(id) => { setExpandedId(id); setTab('calls'); setTimeout(() => { const el = document.querySelector(`[data-call-id="${id}"]`); if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} />
      )}

      {/* Operator Insights Tab — admin only */}
      {tab === 'operators' && !loading && isAdmin && (
        <OperatorInsightsPanel
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          token={session?.access_token ?? null}
          onOpenCall={(ctmId, calledAt) => {
            const iso = parseDate(calledAt)?.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
            if (iso) setDateFilter(iso);
            setExpandedId(Number(ctmId));
            setTab('calls');
            setPage(1);
            setTimeout(() => {
              const el = document.querySelector(`[data-call-id="${ctmId}"]`);
              if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }}
        />
      )}

      {/* Selection action bar — appears when one or more calls are
          checked. Sits bottom-center so it doesn't fight the existing
          "Analyze missing" floating CTA at bottom-right. */}
      {isAdmin && selectedIds.size > 0 && !bulkAnalyzing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 bg-foreground text-white rounded-full pl-5 pr-2 py-2 shadow-2xl ring-1 ring-white/10">
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-[11px] font-semibold uppercase tracking-wider text-white/70 hover:text-white px-3 py-1.5 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={analyzeSelectedCalls}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
            title={`Analyze ${selectedIds.size} selected call${selectedIds.size === 1 ? '' : 's'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Analyze {selectedIds.size}
          </button>
        </div>
      )}

      {isAdmin && calls.length > 0 && (() => {
        const unscored = calls.filter(c => !scores[String(c.id)]).length;
        if (!bulkAnalyzing && unscored === 0) return null;
        return (
          <button
            type="button"
            onClick={analyzeAllCalls}
            disabled={bulkAnalyzing}
            className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold shadow-lg transition-all ${bulkAnalyzing ? 'bg-primary-dark shadow-xl scale-105' : 'bg-primary hover:bg-primary-dark hover:shadow-xl'}`}
            style={{ fontFamily: 'var(--font-body)' }}
            title="Analyze calls that don't have a score yet"
          >
            <svg className={`w-4 h-4 ${bulkAnalyzing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            {bulkAnalyzing && bulkProgress ? (
              <>
                <span>Analyzing {bulkProgress.done}/{bulkProgress.total}</span>
                <span className="w-16 h-1.5 rounded-full bg-white/30 overflow-hidden">
                  <span className="block h-full bg-white rounded-full transition-all" style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }} />
                </span>
              </>
            ) : (
              <span>Analyze missing calls{unscored > 0 ? ` · ${unscored}` : ''}</span>
            )}
          </button>
        );
      })()}

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



