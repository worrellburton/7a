'use client';

import { useAuth } from '@/lib/AuthProvider';
import { getAuthToken } from '@/lib/db';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface Call {
  id: number;
  name: string;
  caller_number_formatted: string;
  duration: number;
  talk_time: number;
  direction: string;
  source: string;
  called_at: string;
  tracking_label: string;
}

interface CTMResponse {
  calls?: Call[];
  total_pages?: number;
  total_entries?: number;
  error?: string;
}

interface Account {
  id: number;
}

interface DayBucket {
  date: string; // YYYY-MM-DD (Arizona)
  count: number;
  inbound: number;
  outbound: number;
  totalDuration: number;
  totalTalk: number;
  topSources: { name: string; count: number }[];
  firstAt?: string;
  lastAt?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  bucket: DayBucket | null;
}

async function ctmFetch(endpoint: string, params?: Record<string, string | number>): Promise<CTMResponse> {
  const token = getAuthToken();
  const res = await fetch('/api/ctm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params }),
  });
  return res.json();
}

function azDateOf(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  } catch {
    return '';
  }
}

function formatDuration(s: number): string {
  if (!s) return '0:00';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatLongDate(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}

// Build list of ISO dates covering N days ending at `endDate` inclusive,
// snapped so the first cell begins on Sunday.
function buildDateGrid(endDateStr: string, weeks: number): string[] {
  // Convert endDateStr (Arizona YYYY-MM-DD) to Date at noon UTC so day math is safe.
  const [y, m, d] = endDateStr.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d, 12));

  // End-of-week Saturday (so the current week is the last column).
  const endDay = end.getUTCDay(); // 0=Sun..6=Sat
  const daysToSaturday = (6 - endDay + 7) % 7;
  const gridEnd = new Date(end);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + daysToSaturday);

  const totalDays = weeks * 7;
  const start = new Date(gridEnd);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const out: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const WEEKS = 27; // roughly 6 months

export default function CallsHeatmapContent() {
  const { session } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<{ page: number; totalPages: number; loaded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Map<string, DayBucket>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, bucket: null });

  useEffect(() => {
    if (!session?.access_token) return;
    async function discoverAccount() {
      const data = await ctmFetch('/accounts.json');
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      const accounts = (data as unknown as { accounts?: Account[] }).accounts;
      if (accounts && accounts.length > 0) {
        setAccountId(String(accounts[0].id));
      } else {
        setError('Could not determine CTM account ID.');
        setLoading(false);
      }
    }
    discoverAccount();
  }, [session]);

  useEffect(() => {
    if (!accountId) return;

    async function loadAll() {
      setLoading(true);
      try {
        let allCalls: Call[] = [];
        let pg = 1;
        let totalPages = 1;
        // Fetch every page. CTM caps per_page at 150, so on a busy account
        // this may take several round trips — surface progress to the UI.
        while (pg <= totalPages) {
          const data = await ctmFetch(`/accounts/${accountId}/calls.json`, { page: pg, per_page: 150 });
          if (data.error) {
            setError(data.error);
            break;
          }
          if (data.calls) allCalls = allCalls.concat(data.calls);
          totalPages = data.total_pages || 1;
          setLoadProgress({ page: pg, totalPages, loaded: allCalls.length });
          pg++;
        }

        const next = new Map<string, DayBucket>();
        for (const c of allCalls) {
          const date = azDateOf(c.called_at);
          if (!date) continue;
          const existing = next.get(date) ?? {
            date,
            count: 0,
            inbound: 0,
            outbound: 0,
            totalDuration: 0,
            totalTalk: 0,
            topSources: [],
            firstAt: undefined,
            lastAt: undefined,
          };
          existing.count += 1;
          if (c.direction === 'inbound') existing.inbound += 1;
          if (c.direction === 'outbound') existing.outbound += 1;
          existing.totalDuration += c.duration || 0;
          existing.totalTalk += c.talk_time || 0;
          if (!existing.firstAt || c.called_at < existing.firstAt) existing.firstAt = c.called_at;
          if (!existing.lastAt || c.called_at > existing.lastAt) existing.lastAt = c.called_at;
          // accumulate sources
          const src = c.source || c.tracking_label || 'Unknown';
          const found = existing.topSources.find((s) => s.name === src);
          if (found) found.count += 1;
          else existing.topSources.push({ name: src, count: 1 });
          next.set(date, existing);
        }

        // Sort topSources per bucket and trim to 3
        for (const b of next.values()) {
          b.topSources.sort((a, b2) => b2.count - a.count);
          b.topSources = b.topSources.slice(0, 3);
        }

        setBuckets(next);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [accountId]);

  const todayAz = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' }),
    []
  );

  const dateGrid = useMemo(() => buildDateGrid(todayAz, WEEKS), [todayAz]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const b of buckets.values()) if (b.count > m) m = b.count;
    return m;
  }, [buckets]);

  const totals = useMemo(() => {
    let calls = 0;
    let inbound = 0;
    let outbound = 0;
    let duration = 0;
    let activeDays = 0;
    for (const b of buckets.values()) {
      calls += b.count;
      inbound += b.inbound;
      outbound += b.outbound;
      duration += b.totalDuration;
      if (b.count > 0) activeDays += 1;
    }
    return { calls, inbound, outbound, duration, activeDays };
  }, [buckets]);

  // Map a count to a Tailwind background class (5 bucket heatmap)
  function cellClass(count: number): string {
    if (count === 0) return 'bg-warm-bg border border-foreground/5';
    if (maxCount === 0) return 'bg-warm-bg border border-foreground/5';
    const ratio = count / maxCount;
    if (ratio > 0.75) return 'bg-primary-dark';
    if (ratio > 0.5) return 'bg-primary';
    if (ratio > 0.25) return 'bg-primary/60';
    return 'bg-primary/30';
  }

  // Build month label positions (column index where month changes)
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

  function handleCellEnter(e: React.MouseEvent<HTMLDivElement>, date: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const existing = buckets.get(date);
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + window.scrollY,
      bucket: existing || {
        date,
        count: 0,
        inbound: 0,
        outbound: 0,
        totalDuration: 0,
        totalTalk: 0,
        topSources: [],
      },
    });
  }

  function handleCellLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/calls"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Calls
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Call Heatmap</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Calendar heatmap of the last {WEEKS} weeks. Hover any day to see a breakdown.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total calls" value={totals.calls.toLocaleString()} />
        <StatCard label="Inbound" value={totals.inbound.toLocaleString()} />
        <StatCard label="Outbound" value={totals.outbound.toLocaleString()} />
        <StatCard label="Active days" value={totals.activeDays.toLocaleString()} />
        <StatCard label="Total duration" value={formatDuration(totals.duration)} />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-4">
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {loadProgress && (
            <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
              Loading page {loadProgress.page} of {loadProgress.totalPages}
              {' '}&middot; {loadProgress.loaded.toLocaleString()} calls so far
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
          <div className="inline-flex flex-col gap-2 min-w-max">
            {/* Month labels row */}
            <div className="flex items-end gap-[3px] pl-8 h-4">
              {Array.from({ length: WEEKS }).map((_, col) => {
                const lbl = monthLabels.find((m) => m.col === col);
                return (
                  <div key={col} className="w-[14px] text-[10px] text-foreground/40 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                    {lbl?.label || ''}
                  </div>
                );
              })}
            </div>

            {/* Grid with weekday labels on the left */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-[3px] pt-0">
                {weekdayLabels.map((d, i) => (
                  <div key={i} className="h-[14px] text-[10px] text-foreground/40 font-medium leading-[14px] w-6 text-right pr-1" style={{ fontFamily: 'var(--font-body)' }}>
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
                      const bucket = buckets.get(date);
                      const count = bucket?.count || 0;
                      const isFuture = date > todayAz;
                      return (
                        <div
                          key={row}
                          onMouseEnter={(e) => !isFuture && handleCellEnter(e, date)}
                          onMouseLeave={handleCellLeave}
                          className={`w-[14px] h-[14px] rounded-[3px] transition-transform hover:scale-125 hover:ring-2 hover:ring-primary/30 cursor-pointer ${
                            isFuture ? 'bg-transparent border border-dashed border-foreground/10' : cellClass(count)
                          }`}
                          aria-label={`${date}: ${count} calls`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
              <span>Less</span>
              <div className="w-[14px] h-[14px] rounded-[3px] bg-warm-bg border border-foreground/5" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-primary/30" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-primary/60" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-primary" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-primary-dark" />
              <span>More</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.visible && tooltip.bucket && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltip.x + 'px',
            top: tooltip.y - 8 + 'px',
          }}
        >
          <div className="bg-foreground text-white rounded-xl px-4 py-3 shadow-2xl min-w-[200px]">
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>
              {formatLongDate(tooltip.bucket.date)}
            </p>
            <p className="text-lg font-bold text-white mb-2">
              {tooltip.bucket.count} {tooltip.bucket.count === 1 ? 'call' : 'calls'}
            </p>
            {tooltip.bucket.count > 0 ? (
              <div className="space-y-1 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Inbound</span>
                  <span className="text-white">{tooltip.bucket.inbound}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Outbound</span>
                  <span className="text-white">{tooltip.bucket.outbound}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Duration</span>
                  <span className="text-white">{formatDuration(tooltip.bucket.totalDuration)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Talk time</span>
                  <span className="text-white">{formatDuration(tooltip.bucket.totalTalk)}</span>
                </div>
                {tooltip.bucket.topSources.length > 0 && (
                  <div className="pt-1.5 mt-1.5 border-t border-white/10">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Top sources</p>
                    {tooltip.bucket.topSources.map((s) => (
                      <div key={s.name} className="flex justify-between gap-4">
                        <span className="text-white/70 truncate">{s.name}</span>
                        <span className="text-white">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
                No calls on this day.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
