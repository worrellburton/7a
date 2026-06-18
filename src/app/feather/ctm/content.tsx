'use client';

import { useAuth } from '@/lib/AuthProvider';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SelectAllCheckbox, SortTh } from './Pickers';
import { MobileRangePresets } from './MobileRangePresets';
import { CopyCallLinkButton, SyncStatusIndicator } from './LinkButtons';
import { TimelineSlider } from './TimelineSlider';
import { SourcesPanel } from './SourcesPanel';
import { CallDetail } from './CallDetail';
import { CallMobileRow, CallMobileRowSkeleton } from './CallMobileRow';
import { MobileSelect } from './MobileSelect';
import {
  Call,
  Tab,
  SPAM_STORAGE_KEY,
  Insights,
  directionStyle,
  normalizePhone,
  isPaidSource,
  isMissedCall,
  ctmFetch,
  formatDuration,
  parseDate,
  formatDate,
  formatTime,
} from './_shared';

// Call-log page size. The list is server-paginated through CTM's
// calls.json API (calls live in CallTrackingMetrics, not Supabase, so
// CTM's own page/per_page IS the server-side pagination). Newest-first
// is CTM's default order. Prev/next jump whole pages of this size.
const PER_PAGE = 50;

export default function CallsContent() {
  const { user, session } = useAuth();
  // Batch selection — checkbox in every row, sticky action bar appears
  // when any are selected with spam controls.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive the active tab directly from the URL every render. Keeping
  // it as local state was causing the sidebar "Calls" click to land on
  // stale state whenever the ?tab= param was stripped from a
  // same-pathname navigation. Reading from the URL means there's no
  // sync lag and every tab is genuinely shareable.
  const tab: Tab = (() => {
    const q = searchParams?.get('tab');
    return q === 'sources' || q === 'spam' ? q : 'calls';
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
    router.replace(`/feather/ctm/${encodeURIComponent(q)}`);
  }, [searchParams, router]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
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
  const [spamNumbers, setSpamNumbers] = useState<Set<string>>(new Set());
  const [reportingSpam, setReportingSpam] = useState<string | null>(null);

  // Load the spam list. Preferred source is public.call_spam_numbers
  // (shared across users). On first load we also push any numbers still
  // living in this browser's localStorage up to the server so the
  // shared list catches up.
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
    const missedNumbers = new Set<string>();
    let totalCalls = 0;
    let totalDuration = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    let missed = 0;
    let missedPaid = 0;
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
      spam,
      missedSpam,
      returnedMissed,
      returnedPickedUp,
      dailyCounts,
      startIso,
      endIso,
    };
  }, [allCallsRaw, calls, rangeStart, rangeEnd, isSpamCall]);

  const rangeInsights = localRangeInsights;

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

    const params: Record<string, string | number> = { page: p, per_page: PER_PAGE };
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

  // Prev/next pagination (replaced the old infinite-scroll). Each page
  // is a fresh CTM fetch of PER_PAGE rows; `calls` holds only the
  // current page. goToPage scrolls back to the top of the list so the
  // new page reads from the start.
  const goToPage = useCallback((p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    fetchCalls(p);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, totalPages, fetchCalls]);

  // Light polling — pick up newly-completed calls every 60s without a
  // full reload. Only merges when viewing page 1 (the newest page);
  // on a historical page we just refresh the total count so we don't
  // splice newer calls into the middle of an older page. Detail view
  // (CallDetail) always loads fresh on expand, so it's unaffected.
  useEffect(() => {
    if (!accountId || !session?.access_token) return;
    let cancelled = false;
    async function refresh() {
      if (cancelled) return;
      const params: Record<string, string | number> = { page: 1, per_page: PER_PAGE };
      if (searchQuery) params.search = searchQuery;
      if (dateFilter) params.start_date = dateFilter;
      if (directionFilter !== 'all') params.direction = directionFilter;
      try {
        const data = await ctmFetch(`/accounts/${accountId}/calls.json`, params);
        if (cancelled || !data.calls) return;
        if (data.total_entries) {
          setTotalEntries(data.total_entries);
          setTotalPages(data.total_pages || 1);
        }
        // Front-merge new calls only when the user is on page 1.
        if (page === 1) {
          setCalls(prev => {
            const existing = new Set(prev.map(c => c.id));
            const fresh = data.calls!.filter(c => !existing.has(c.id));
            if (fresh.length === 0) return prev;
            // Keep page 1 at PER_PAGE so it doesn't grow unbounded.
            return [...fresh, ...prev].slice(0, PER_PAGE);
          });
        }
      } catch { /* swallow — try again next tick */ }
    }
    const id = window.setInterval(refresh, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [accountId, session?.access_token, searchQuery, dateFilter, directionFilter, page]);

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
      return true;
    });
    const getVal = (call: Call): string | number => {
      switch (sortKey) {
        case 'id': return call.id;
        case 'called_at': return parseDate(call.called_at)?.getTime() ?? 0;
        case 'caller_number': return (call.caller_number_formatted || call.caller_number || '').toLowerCase();
        case 'duration': return call.duration ?? 0;
        case 'tracking_label': return (call.tracking_label || '').toLowerCase();
        case 'direction': return (call.direction || '').toLowerCase();
        case 'source': return (call.source_name || call.source || '').toLowerCase();
        case 'location': return [call.city, call.state].filter(Boolean).join(', ').toLowerCase();
        default: return 0;
      }
    };
    return filtered.slice().sort((a, b) => {
      const vA = getVal(a);
      const vB = getVal(b);
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  return (
    <div className="relative min-h-full overflow-x-clip p-2.5 sm:p-6 lg:p-10">
      {/* Ambient backdrop — three soft warm orbs behind everything so
          the glass surfaces have something colorful to refract.
          Pointer-events off so they never trap clicks. Same pattern
          as the home page so the visual language stays consistent. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-orange-300/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full bg-rose-200/35 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 w-[480px] h-[480px] rounded-full bg-amber-200/30 blur-[130px]" />
      </div>

      {/* Header — glass plank with title left, Heatmap CTA right. */}
      <header className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-4 sm:mb-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight mb-0.5 sm:mb-1">Calls</h1>
            <p className="text-[11px] sm:text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
              Call tracking powered by CTM
              {totalEntries > 0 && <span> &middot; {totalEntries.toLocaleString()} total</span>}
            </p>
            <SyncStatusIndicator token={session?.access_token ?? null} />
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/feather/ctm/reports"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur text-foreground border border-white/70 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider hover:bg-white transition-colors shadow-sm"
              style={{ fontFamily: 'var(--font-body)' }}
              aria-label="View Reports"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m3 6V7m3 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Reports</span>
              <span className="sm:hidden">Reports</span>
            </a>
            <a
              href="/feather/ctm/heatmap"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-primary text-white rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors shadow-sm"
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
      </header>

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

      {/* Insights Dashboard — glass tiles. Each tile carries a top
          sheen line so the surface reads as real glass. */}
      {insightsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative rounded-2xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)] p-4 sm:p-5 animate-pulse">
              <div className="h-3 bg-foreground/10 rounded w-16 mb-3" />
              <div className="h-7 bg-foreground/10 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-4">
            <StatTile label="Total Calls" value={rangeInsights.totalCalls} sub={rangeInsights.totalCalls > 0 ? `${rangeInsights.inbound} in · ${rangeInsights.outbound} out` : 'No calls in range'} />
            <StatTile
              label="Missed"
              valueClass="text-red-500"
              value={rangeInsights.missed}
              sub={rangeInsights.inbound > 0 ? `${Math.round((rangeInsights.missed / rangeInsights.inbound) * 100)}% of inbound` : 'No inbound'}
              extra={rangeInsights.missedSpam > 0 ? `${rangeInsights.missedSpam} spam excluded` : undefined}
              extraClass="text-amber-600"
            />
            <StatTile
              label="Missed (Paid)"
              valueClass="text-red-500"
              value={rangeInsights.missedPaid}
              sub={rangeInsights.missed > 0 ? `${Math.round((rangeInsights.missedPaid / rangeInsights.missed) * 100)}% of missed` : 'No missed calls'}
            />
            <StatTile
              label="Spam"
              labelClass="text-amber-500"
              valueClass="text-amber-600"
              value={rangeInsights.spam}
              sub={rangeInsights.spam > 0 ? `${rangeInsights.spam} reported` : 'None reported'}
              accent="amber"
            />
            <StatTile
              label="Returned"
              valueClass="text-emerald-500"
              value={rangeInsights.returnedMissed}
              sub={rangeInsights.missed > 0 ? `${Math.round((rangeInsights.returnedMissed / rangeInsights.missed) * 100)}% of missed` : 'No missed calls'}
            />
            <StatTile
              label="Returned (Picked Up)"
              valueClass="text-emerald-600"
              value={rangeInsights.returnedPickedUp}
              sub={rangeInsights.returnedMissed > 0 ? `${Math.round((rangeInsights.returnedPickedUp / rangeInsights.returnedMissed) * 100)}% of returned` : 'No returned'}
            />
            <StatTile label="Avg Duration" value={formatDuration(rangeInsights.avgDuration)} sub="per call" />
          </div>
        </div>
      )}

      {/* Operator cheat sheet — the admissions call flow, collapsible
          so it doesn't crowd the call log but stays one tap away for
          newer reps. Open/closed state is persisted to localStorage
          per browser so each rep's preference sticks across reloads
          without needing a server round-trip. */}
      <OperatorCheatSheet />

      {/* Error State — same glass language but tinted with the
          error palette so it reads as urgent without breaking
          the visual system. */}
      {error && (
        <div className="relative rounded-2xl border border-red-200/70 bg-red-50/65 supports-[backdrop-filter]:bg-red-50/50 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(220,38,38,0.18)] p-5 mb-6">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <p className="text-sm text-red-700 font-semibold">CTM API Error</p>
          <p className="text-xs text-red-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      {/* Tabs — glass segmented bar. Translucent surface w/ a sheen
          line so it matches the stat tiles + header above. The
          active tab still pops as solid white inside the group so
          the selection signal stays loud. */}
      <div className="relative flex gap-1 mb-4 sm:mb-6 rounded-xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-xl p-1 w-fit shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-white/85 to-transparent" />
        {(['calls', 'sources', 'spam'] as Tab[]).map(t => {
          const label = t === 'calls' ? 'Call Log' : t === 'sources' ? 'Sources' : 'Spam';
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="inline-flex items-center gap-1.5">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters — sticky on mobile so the toolbar stays reachable
          while scrolling a long list, and uses MobileSelect for the
          two enum filters so each chip gets a 44px tap target +
          bottom-sheet picker (the native <select> + appearance-none
          combo was clipping the tap area on iOS WebKit). */}
      {(tab === 'calls' || tab === 'spam') && (
        <div className="sticky md:static top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 bg-warm-bg/85 supports-[backdrop-filter]:bg-warm-bg/65 backdrop-blur-md md:bg-transparent md:backdrop-blur-0 mb-4 md:mb-4">
          <div className="relative md:rounded-2xl md:border md:border-white/70 md:bg-white/45 md:supports-[backdrop-filter]:bg-white/30 md:backdrop-blur-xl md:shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)] md:p-2 flex items-center gap-2 sm:gap-3 flex-wrap">
            <div aria-hidden="true" className="hidden md:block pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/85 to-transparent" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchCalls(1); }}
              placeholder="Search calls..."
              className="min-h-[44px] md:min-h-0 md:py-2 px-3 rounded-lg text-sm border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-sm focus:outline-none focus:border-primary focus:bg-white flex-1 min-w-[140px] sm:w-48 sm:flex-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); }}
              className="min-h-[44px] md:min-h-0 md:py-2 px-3 rounded-lg text-sm border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-sm focus:outline-none focus:border-primary focus:bg-white"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <MobileSelect
              ariaLabel="Direction"
              value={directionFilter}
              onChange={setDirectionFilter}
              options={[
                { value: 'all', label: 'All directions' },
                { value: 'inbound', label: 'Inbound' },
                { value: 'outbound', label: 'Outbound' },
              ]}
            />
            <button
              onClick={() => fetchCalls(1)}
              className="min-h-[44px] md:min-h-0 md:py-2 px-4 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Loading — desktop keeps the simple spinner, mobile gets
          skeleton rows so the perceived delay matches the eventual
          layout (no mid-scroll reflow). */}
      {loading && (
        <>
          <div className="hidden md:flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          </div>
          <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <CallMobileRowSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {/* Call Log Tab */}
      {(tab === 'calls' || tab === 'spam') && !loading && (
        <>
          {calls.length === 0 && !error ? (
            <div className="relative rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)] text-center py-12 md:py-20 px-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
              <svg className="w-12 h-12 mx-auto text-foreground/15 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              <p className="text-sm font-semibold text-foreground/65 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                {tab === 'spam' ? 'No reported spam numbers' : 'No calls match these filters'}
              </p>
              <p className="text-xs text-foreground/45 max-w-xs mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
                {tab === 'spam'
                  ? 'Spam-flagged numbers will show up here once you mark a call as spam.'
                  : 'Try a wider date range, clear the search, or switch operators.'}
              </p>
            </div>
          ) : calls.length > 0 && (
            <div className="relative rounded-2xl border border-white/70 bg-white/65 supports-[backdrop-filter]:bg-white/50 backdrop-blur-xl shadow-[0_14px_40px_-20px_rgba(60,48,42,0.28)] overflow-hidden">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent z-10" />
              {/* Mobile single-row layout — see CallMobileRow.tsx for
                  the row anatomy and why we replaced the multi-line
                  card. The row is its own component now so the
                  list-level concerns (selection state, expanded id,
                  audio playback) stay in the parent and the row only
                  worries about presentation + the per-row action
                  popover. */}
              <div className="md:hidden divide-y divide-gray-50">
                {visibleCalls.map((call) => {
                  const expanded = expandedId === call.id;
                  const spamFlag = isSpamCall(call);
                  return (
                    <Fragment key={call.id}>
                      <CallMobileRow
                        call={call}
                        expanded={expanded}
                        selected={selectedIds.has(String(call.id))}
                        isSpam={spamFlag}
                        playingAudio={playingAudio}
                        onToggleExpand={() => setExpandedId(expanded ? null : call.id)}
                        onToggleSelect={() => toggleSelect(String(call.id))}
                        onPlay={(url) => playRecording(url)}
                      />
                      {expanded && (
                        <div className="bg-warm-bg/30 px-3.5 py-4">
                          <CallDetail call={call} />
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
                      <SortTh label="Direction" sortKeyName="direction" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Date / Time" sortKeyName="called_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Number" sortKeyName="caller_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Tracking" sortKeyName="tracking_label" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Duration" sortKeyName="duration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Source" sortKeyName="source" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTh label="Location" sortKeyName="location" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} hiddenLg />
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recording</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCalls.map(call => {
                      const expanded = expandedId === call.id;
                      const cellPad = 'py-2';
                      return (
                        <Fragment key={call.id}>
                          <tr data-call-id={call.id} onClick={() => setExpandedId(expanded ? null : call.id)} className={`transition-colors cursor-pointer hover:bg-warm-bg/20 ${selectedIds.has(String(call.id)) ? 'bg-primary/5' : ''} ${isSpamCall(call) ? 'bg-amber-50/70 border-b border-amber-200' : isMissedCall(call) ? 'bg-red-50/60 border-b border-red-100' : 'border-b border-primary/20'}`} style={isSpamCall(call) ? { boxShadow: 'inset 0 0 20px rgba(245,158,11,0.1), 0 0 8px rgba(245,158,11,0.06)' } : isMissedCall(call) ? { boxShadow: 'inset 0 0 20px rgba(239,68,68,0.1), 0 0 8px rgba(239,68,68,0.06)' } : { boxShadow: '0 2px 8px -4px rgba(188, 107, 74, 0.18), 0 1px 0 rgba(188, 107, 74, 0.08)' }}>
                            <td className={`w-9 px-3 ${cellPad} align-top`} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(String(call.id))}
                                onChange={() => toggleSelect(String(call.id))}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                aria-label={`Select call ${call.id}`}
                              />
                            </td>
                            <td className={`px-3 sm:px-5 ${cellPad}`} onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <div className="text-xs font-mono text-foreground/50 whitespace-nowrap">#{call.id}</div>
                                <CopyCallLinkButton callId={String(call.id)} />
                              </div>
                            </td>
                            <td className={`px-3 sm:px-5 ${cellPad}`} onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
                                  {call.direction || 'unknown'}
                                </span>
                                {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">VM</span>}
                                {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">1st</span>}
                                {isSpamCall(call) && (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">Spam</span>
                                )}
                                {!isSpamCall(call) && isMissedCall(call) && (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                                    {call.voicemail ? 'Voicemail' : 'No answer'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 sm:px-5 ${cellPad}`}>
                              <div className="text-sm font-medium text-foreground whitespace-nowrap">{formatDate(call.called_at)}</div>
                              <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{formatTime(call.called_at)}</div>
                            </td>
                            <td className={`px-3 sm:px-5 ${cellPad}`} onClick={(e) => e.stopPropagation()}>
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
                            <td className={`px-3 sm:px-5 ${cellPad} text-sm text-foreground/70 max-w-[180px] truncate`} style={{ fontFamily: 'var(--font-body)' }}>
                              {call.tracking_label || '—'}
                            </td>
                            <td className={`px-3 sm:px-5 ${cellPad} text-sm font-mono text-foreground whitespace-nowrap`}>
                              {formatDuration(call.duration)}
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
                            <td className="px-3 py-3.5">
                              <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-warm-bg/30 border-b border-gray-50">
                              <td colSpan={11} className="px-5 py-5">
                                <CallDetail call={call} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Server-side pagination controls. Each page is a fresh
                  CTM fetch of PER_PAGE rows (calls live in
                  CallTrackingMetrics, not Supabase), so we page through
                  with explicit Prev/Next rather than infinite scroll. */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-warm-bg/30" style={{ fontFamily: 'var(--font-body)' }}>
                <p className="text-xs text-foreground/45">
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    <>Page {page.toLocaleString()} of {totalPages.toLocaleString()} · {totalEntries.toLocaleString()} total</>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loadingMore}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-foreground/70 hover:border-gray-300 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || loadingMore}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-foreground/70 hover:border-gray-300 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sources Tab */}
      {tab === 'sources' && !loading && (
        <SourcesPanel calls={allCallsRaw.length ? allCallsRaw : calls} onOpenCall={(id) => { setExpandedId(id); setTab('calls'); setTimeout(() => { const el = document.querySelector(`[data-call-id="${id}"]`); if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} />
      )}

      {/* Selection action bar — appears when one or more calls are
          checked. Spam toggling lives here so the action is discoverable
          without hunting per-row hover states. */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 bg-foreground text-white rounded-full pl-5 pr-2 py-2 shadow-2xl ring-1 ring-white/10">
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => {
              for (const id of selectedIds) {
                const call = calls.find((c) => String(c.id) === id);
                if (call?.caller_number) reportSpam(call.caller_number);
              }
              clearSelection();
            }}
            className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-2 text-xs font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Mark as spam
          </button>
          <button
            type="button"
            onClick={() => {
              for (const id of selectedIds) {
                const call = calls.find((c) => String(c.id) === id);
                if (call?.caller_number) unreportSpam(call.caller_number);
              }
              clearSelection();
            }}
            className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-3 py-2 text-xs font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Unmark spam
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-[11px] font-semibold uppercase tracking-wider text-white/70 hover:text-white px-3 py-1.5 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

// Single glass tile used by the Insights row at the top of the page.
// The admissions call flow rendered as a collapsible cheat sheet
// above the call log. Content is owned here (not pulled from a CMS)
// because it changes rarely and lives next to the team that uses it;
// editing means a tiny PR rather than a database round-trip. Sections
// mirror the numbered structure the admissions team works from so a
// rep can scan to the step they're on mid-call.
const CHEAT_SHEET_STORAGE_KEY = 'calls:operator-cheat-sheet:open';
type CheatSheetSection = { n: number; title: string; lines: (string | { quote: string })[] };
const CHEAT_SHEET_SECTIONS: CheatSheetSection[] = [
  {
    n: 1,
    title: 'Initial Contact / Opening the Call',
    lines: [
      'Warm greeting and introduction.',
      { quote: 'Thank you for calling [Program Name], this is [Name], how can I help you today?' },
      'Build rapport quickly — tone matters more than script.',
      'Identify caller type: self (potential client) or family member / referral source.',
    ],
  },
  {
    n: 2,
    title: 'Immediate Needs & Safety Check',
    lines: [
      'Assess urgency:',
      { quote: 'Are you safe right now?' },
      { quote: 'When was your last use?' },
      'Determine if detox is needed immediately.',
      'If crisis-level → escalate appropriately (911, crisis line, or immediate detox placement).',
    ],
  },
  {
    n: 3,
    title: 'Program Overview (If Appropriate)',
    lines: [
      'Brief explanation of services: detox (if applicable), residential / inpatient.',
      'Keep it simple and tailored to what they shared.',
      { quote: 'Based on what you’re telling me, we may be a good fit for…' },
    ],
  },
  {
    n: 4,
    title: 'Information Gathering (Soft Intake Start)',
    lines: [
      'Collect essential details conversationally:',
      'Full name · DOB · contact information.',
      'Substance use history (type, frequency, amount).',
      'Mental health concerns (if disclosed).',
      'Current living situation.',
    ],
  },
  {
    n: 5,
    title: 'Insurance Collection (VOB Trigger)',
    lines: [
      'Request insurance details: provider, member ID, group number (if applicable).',
      'Ask for insurance card (front & back):',
      { quote: 'You can text or email it to us, whatever is easiest for you.' },
      'Action step: enter data into Dazos, then submit for VOB via the automated system (if integrated) or email to the VOB team.',
    ],
  },
  {
    n: 6,
    title: 'Set Expectations for VOB',
    lines: [
      'Clearly explain next steps:',
      { quote: 'We’re going to verify your insurance benefits now.' },
      { quote: 'This usually takes about 20 min – 1 hr or so.' },
      'Reassure:',
      { quote: 'As soon as we have answers, we’ll call you back and go over everything with you.' },
    ],
  },
  {
    n: 7,
    title: 'Engagement While Awaiting VOB',
    lines: [
      'Keep them emotionally engaged:',
      { quote: 'What made you reach out today?' },
      { quote: 'What are you hoping your life looks like after treatment?' },
      'Initiate PAA (Pre-Authorization Assessment) if possible.',
      'Address concerns: cost fears, work / family obligations, fear of treatment.',
    ],
  },
  {
    n: 8,
    title: 'VOB Results Call (Follow-Up Call Flow)',
    lines: [
      'Reconnect:',
      { quote: 'Hi [Name], this is [Name] from [Program], I have your insurance results.' },
      'Review benefits: coverage details (keep it simple), any out-of-pocket costs, authorization requirements (if applicable).',
      'Financial discussion — if balance exists, introduce the Payment Arrangement Agreement. Be transparent but supportive.',
    ],
  },
  {
    n: 9,
    title: 'Clinical Recommendation',
    lines: [
      'Based on substance use, withdrawal risk, mental health, and environment.',
      'Recommend detox, residential, or outpatient — or refer out if not appropriate.',
    ],
  },
  {
    n: 10,
    title: 'Close for Admission',
    lines: [
      'Direct but supportive close:',
      { quote: 'Based on everything, the best next step would be [level of care]. We can get you admitted as soon as today / tomorrow.' },
      'Handle objections. Reinforce urgency without pressure.',
    ],
  },
  {
    n: 11,
    title: 'Logistics & Intake Completion',
    lines: [
      'If client agrees, schedule admission date / time.',
      'Provide what to bring, arrival instructions, and transportation options.',
      'Complete intake documentation in the system.',
    ],
  },
  {
    n: 12,
    title: 'If Not Admitting',
    lines: [
      'Offer alternatives: a different level of care or referral partners.',
      'Leave the door open:',
      { quote: 'If anything changes, we’re here for you.' },
    ],
  },
  {
    n: 13,
    title: 'Follow-Up Protocol',
    lines: [
      'If no answer: call + text + email.',
      'Example cadence: same-day follow-up, next day, 48 hours.',
      'Keep tone supportive, not pushy.',
    ],
  },
];
const CHEAT_SHEET_PRINCIPLES = [
  'Connection over script.',
  'Clarity over complexity.',
  'Speed matters (VOB turnaround).',
];

function OperatorCheatSheet() {
  // Default-closed so the call log is the first thing on the page;
  // reps who use the sheet often persist their open preference via
  // localStorage. SSR safety: read in a useEffect rather than the
  // initializer so the server-rendered HTML stays deterministic and
  // hydration doesn't mismatch.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CHEAT_SHEET_STORAGE_KEY) === '1') setOpen(true);
    } catch { /* private mode / disabled storage — fine, just stay closed */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(CHEAT_SHEET_STORAGE_KEY, open ? '1' : '0'); } catch { /* see above */ }
  }, [open]);

  return (
    <div className="relative rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(0,0,0,0.18)] mb-4 sm:mb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/85 to-transparent" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="operator-cheat-sheet-body"
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#bc6b4a]/12 text-[#bc6b4a] text-[13px] font-semibold">CF</span>
          <span className="min-w-0">
            <span className="block text-[13.5px] sm:text-sm font-semibold text-foreground">Operator cheat sheet</span>
            <span className="block text-[11px] sm:text-xs text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>
              Admissions call flow · inbound &amp; outbound · 13 steps
            </span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-foreground/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id="operator-cheat-sheet-body"
          className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-black/5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {CHEAT_SHEET_SECTIONS.map((s) => (
              <li key={s.n} className="break-inside-avoid">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-[#bc6b4a]/85 tabular-nums">{s.n}.</span>
                  <h4 className="text-[12.5px] sm:text-[13px] font-semibold text-foreground tracking-tight">{s.title}</h4>
                </div>
                <ul className="mt-1.5 ml-5 space-y-1 text-[12px] sm:text-[12.5px] text-foreground/75 leading-snug">
                  {s.lines.map((line, i) =>
                    typeof line === 'string' ? (
                      <li key={i} className="list-disc list-outside marker:text-foreground/30">{line}</li>
                    ) : (
                      <li key={i} className="list-none -ml-5 pl-3 border-l-2 border-[#bc6b4a]/30 italic text-foreground/70">
                        &ldquo;{line.quote}&rdquo;
                      </li>
                    ),
                  )}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-5 pt-4 border-t border-black/5">
            <h4 className="text-[12px] sm:text-[12.5px] font-semibold text-foreground uppercase tracking-wider">Key principles</h4>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] sm:text-[12.5px] text-foreground/75">
              {CHEAT_SHEET_PRINCIPLES.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#bc6b4a]/60" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-foreground/55 italic leading-relaxed">
              This call flow is a guide. Every caller is different — use judgment, adapt to the conversation, and meet the caller where they are while still working toward the next step in the admissions process.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Repeated 8x — extracted so each tile carries the same translucent
// surface, sheen line, and shadow without 80 lines of duplicate
// className. The `accent` prop adds a colored ring instead of a tint
// shift so the focus state survives the white/45 wash of the glass.
function StatTile({
  label,
  value,
  sub,
  extra,
  labelClass,
  valueClass,
  extraClass,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  extra?: string;
  labelClass?: string;
  valueClass?: string;
  extraClass?: string;
  accent?: 'blue' | 'amber';
}) {
  const ringClass =
    accent === 'blue'
      ? 'ring-1 ring-blue-300/55 shadow-[0_0_0_1px_rgba(96,165,250,0.18),0_8px_24px_-16px_rgba(60,48,42,0.28)]'
      : accent === 'amber'
      ? 'ring-1 ring-amber-300/55 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_8px_24px_-16px_rgba(60,48,42,0.28)]'
      : 'shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)]';
  return (
    <div
      className={`relative rounded-xl sm:rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl p-2.5 sm:p-5 ${ringClass}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-xl sm:rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
      />
      <p
        className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5 sm:mb-1 ${labelClass ?? 'text-foreground/45'}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold ${valueClass ?? 'text-foreground'}`}>{value}</p>
      {sub && (
        <p
          className="text-[10px] sm:text-xs text-foreground/35 mt-0.5 sm:mt-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {sub}
        </p>
      )}
      {extra && (
        <p
          className={`text-[10px] sm:text-xs font-medium mt-0.5 ${extraClass ?? 'text-foreground/55'}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {extra}
        </p>
      )}
    </div>
  );
}



