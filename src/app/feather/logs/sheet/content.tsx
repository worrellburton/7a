'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// "Log sheet" — spreadsheet-style annual view of the daily logs.
// Rows are log types (methods), columns are the months of the
// current Phoenix calendar year, cells are counts. Clicking a
// non-empty cell opens a detail panel below the sheet listing every
// log in that month × type bucket; each of those rows expands
// inline (same pattern as the Touchpoint logs feed).
//
// Mobile: the table scrolls horizontally INSIDE its own card with
// the log-type column pinned (position: sticky; left: 0). The page
// itself keeps the 100vw / overflow-x-hidden pin from /feather/logs
// so iOS Safari never widens the layout viewport.

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface LogRow {
  id: string;
  contactedAt: string;
  method: string | null;
  durationSeconds: number | null;
  userId: string | null;
  userName: string;
  userAvatarUrl: string | null;
  contactId: string;
  contactName: string;
  contactCompany: string | null;
}

interface SheetPayload {
  logs: LogRow[];
}

function phoenixDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

function fmtTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Phoenix',
  });
}

function fmtDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Phoenix',
  });
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function initialsOf(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function methodTone(method: string | null): { bg: string; text: string; ring: string; bar: string } {
  switch (method) {
    case 'Phone':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/70', bar: 'bg-emerald-400' };
    case 'In Person':
      return { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200/70', bar: 'bg-sky-400' };
    case 'Email':
    case 'Email Campaign':
      return { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200/70', bar: 'bg-violet-400' };
    case 'Text Message':
      return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200/70', bar: 'bg-amber-400' };
    case 'Left Message':
      return { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200/70', bar: 'bg-rose-400' };
    case 'New Contact':
      return { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/30', bar: 'bg-primary' };
    case 'Data Entry':
      return { bg: 'bg-foreground/5', text: 'text-foreground/70', ring: 'ring-foreground/15', bar: 'bg-foreground/40' };
    default:
      return { bg: 'bg-warm-bg/70', text: 'text-foreground/70', ring: 'ring-foreground/15', bar: 'bg-foreground/30' };
  }
}

interface SheetRow {
  method: string;
  monthCounts: number[]; // 12 entries, Jan..Dec
  total: number;
}

interface CellKey {
  method: string;
  monthIdx: number; // 0 = Jan
}

export default function LogSheetContent() {
  const { session } = useAuth();
  const [data, setData] = useState<SheetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const r = await fetch('/api/contacts/logs-today?range=this_year', { credentials: 'include' });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as SheetPayload;
      setData(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [session?.access_token]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    function onFocus() { refresh(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Phoenix "now" anchors: which year the sheet covers and which
  // month is current (columns after it are future → blank cells).
  const todayKey = phoenixDateKey(new Date().toISOString());
  const year = todayKey.slice(0, 4);
  const currentMonthIdx = Number(todayKey.slice(5, 7)) - 1;

  // Bucket every log into method × month. Buckets keep the full log
  // rows so the drill-down panel needs no second fetch.
  const buckets = useMemo(() => {
    const map = new Map<string, LogRow[][]>();
    for (const l of data?.logs ?? []) {
      const key = phoenixDateKey(l.contactedAt);
      if (key.slice(0, 4) !== year) continue; // guard — API already windows to the year
      const monthIdx = Number(key.slice(5, 7)) - 1;
      if (monthIdx < 0 || monthIdx > 11) continue;
      const method = (l.method || 'Other').trim() || 'Other';
      let slots = map.get(method);
      if (!slots) {
        slots = Array.from({ length: 12 }, () => [] as LogRow[]);
        map.set(method, slots);
      }
      slots[monthIdx].push(l);
    }
    return map;
  }, [data, year]);

  // Rows sorted by annual total (desc), ties alphabetical — the
  // busiest log types read first, like a ranked spreadsheet.
  const rows = useMemo<SheetRow[]>(() => {
    return Array.from(buckets.entries())
      .map(([method, slots]) => {
        const monthCounts = slots.map((s) => s.length);
        return { method, monthCounts, total: monthCounts.reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => (a.total !== b.total ? b.total - a.total : a.method.localeCompare(b.method)));
  }, [buckets]);

  const monthTotals = useMemo(
    () => MONTH_LABELS.map((_, i) => rows.reduce((acc, r) => acc + r.monthCounts[i], 0)),
    [rows],
  );
  const grandTotal = useMemo(() => monthTotals.reduce((a, b) => a + b, 0), [monthTotals]);

  const [selected, setSelected] = useState<CellKey | null>(null);
  const selectedLogs = useMemo(() => {
    if (!selected) return [];
    const slots = buckets.get(selected.method);
    // Newest first inside the panel.
    return (slots?.[selected.monthIdx] ?? []).slice().reverse();
  }, [buckets, selected]);

  const toggleCell = useCallback((method: string, monthIdx: number) => {
    setSelected((prev) =>
      prev && prev.method === method && prev.monthIdx === monthIdx ? null : { method, monthIdx },
    );
  }, []);

  return (
    <div
      className="w-full bg-warm-bg/40"
      // Same hard viewport pin as /feather/logs — see the comment
      // there for why width: 100vw + overflow-x: hidden is required
      // on iOS Safari.
      style={{
        width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden',
        touchAction: 'manipulation',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        {/* Header */}
        <header className="pt-6 sm:pt-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
            Marketing &amp; Admissions
          </p>
          <h1
            className="mt-1 text-xl sm:text-3xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Log sheet <em className="not-italic text-primary">{year}</em>
          </h1>
          <p className="mt-1.5 text-[12px] text-foreground/55 mx-auto max-w-md">
            Every log type by month. Tap a cell to see the 🪵 behind the number.
          </p>
          {error && (
            <p className="mt-2 text-[11px] text-rose-700">Couldn&apos;t load logs · {error}</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link
              href="/feather/logs"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
            >
              ← Daily logs
            </Link>
            <Link
              href="/feather"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
            >
              Home
            </Link>
          </div>
        </header>

        {/* The sheet */}
        <section className="mt-5 rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
          <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">
                Type × month · {year}
              </p>
              <h2
                className="mt-0.5 text-[15px] font-bold text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Log sheet
              </h2>
            </div>
            <span className="text-[10px] tabular-nums text-foreground/45 whitespace-nowrap shrink-0">
              {grandTotal} {grandTotal === 1 ? 'log' : 'logs'}
            </span>
          </header>

          {!data ? (
            <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">
              No 🪵 logged in {year} yet.
            </p>
          ) : (
            <>
              {/* Horizontal scroll is contained to THIS wrapper; the
                  sticky first column keeps the row labels readable
                  mid-scroll. max-w-full + overflow-x-auto means the
                  table's intrinsic width never leaks to the page. */}
              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-max min-w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-white/95 backdrop-blur-sm px-3 py-2 text-left text-[9.5px] font-bold uppercase tracking-[0.16em] text-foreground/55 border-r border-black/10"
                      >
                        Log type
                      </th>
                      {MONTH_LABELS.map((m, i) => (
                        <th
                          key={m}
                          scope="col"
                          className={`px-2 py-2 text-center text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            i === currentMonthIdx
                              ? 'text-primary'
                              : i > currentMonthIdx
                                ? 'text-foreground/25'
                                : 'text-foreground/55'
                          }`}
                        >
                          {m}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="px-3 py-2 text-center text-[9.5px] font-bold uppercase tracking-wider text-foreground/70 border-l border-black/10 bg-warm-bg/50"
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const tone = methodTone(row.method);
                      return (
                        <tr key={row.method} className="border-b border-black/5">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-white/95 backdrop-blur-sm px-3 py-2 text-left border-r border-black/10"
                          >
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 whitespace-nowrap ${tone.bg} ${tone.text} ${tone.ring}`}
                            >
                              {row.method}
                            </span>
                          </th>
                          {row.monthCounts.map((count, i) => {
                            const isFuture = i > currentMonthIdx;
                            const isSelected =
                              selected?.method === row.method && selected?.monthIdx === i;
                            if (count === 0) {
                              return (
                                <td key={i} className="px-2 py-2 text-center">
                                  <span className={isFuture ? 'text-transparent' : 'text-foreground/20'} aria-hidden>
                                    {isFuture ? '' : '·'}
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td key={i} className="p-0.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCell(row.method, i)}
                                  aria-pressed={isSelected}
                                  title={`${row.method} · ${MONTH_LABELS[i]} ${year} — ${count} ${count === 1 ? 'log' : 'logs'}`}
                                  className={`w-full min-w-[34px] rounded-md px-1.5 py-1.5 font-semibold tabular-nums transition-colors ${
                                    isSelected
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'text-foreground hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  {count}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold tabular-nums text-foreground border-l border-black/10 bg-warm-bg/50">
                            {row.total}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="border-t border-black/10 bg-warm-bg/50">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-warm-bg px-3 py-2 text-left text-[9.5px] font-bold uppercase tracking-[0.16em] text-foreground/70 border-r border-black/10"
                      >
                        Total
                      </th>
                      {monthTotals.map((count, i) => (
                        <td
                          key={i}
                          className={`px-2 py-2 text-center font-bold tabular-nums ${
                            count === 0 ? 'text-foreground/25' : 'text-foreground'
                          }`}
                        >
                          {i > currentMonthIdx && count === 0 ? '' : count}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold tabular-nums text-primary border-l border-black/10">
                        {grandTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 border-t border-black/5 text-[10px] text-foreground/40 sm:hidden">
                Swipe the sheet sideways to see every month →
              </p>
            </>
          )}
        </section>

        {/* Drill-down panel — appears under the sheet when a cell is
            selected. */}
        {selected && (
          <CellDetailCard
            method={selected.method}
            monthLabel={`${MONTH_LABELS[selected.monthIdx]} ${year}`}
            logs={selectedLogs}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── CellDetailCard ─────────────────────────────────────────────
function CellDetailCard({
  method, monthLabel, logs, onClose,
}: {
  method: string;
  monthLabel: string;
  logs: LogRow[];
  onClose: () => void;
}) {
  const tone = methodTone(method);
  // Inline-expanded row, same interaction as the Touchpoint feed.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Collapse any open row when the selected cell changes.
  useEffect(() => { setExpandedId(null); }, [method, monthLabel]);

  return (
    <section className="mt-3 rounded-2xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-[0_18px_40px_-24px_rgba(60,48,42,0.35)] overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <span
            className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 whitespace-nowrap ${tone.bg} ${tone.text} ${tone.ring}`}
          >
            {method}
          </span>
          <h2
            className="text-[15px] font-bold text-foreground truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {monthLabel}
          </h2>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-foreground/45 whitespace-nowrap">
            {logs.length} {logs.length === 1 ? 'log' : 'logs'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/12 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
            title="Close this cell's detail"
          >
            <span aria-hidden>×</span>
            <span>Close</span>
          </button>
        </div>
      </header>
      {logs.length === 0 ? (
        <p className="px-4 py-6 text-[12px] italic text-foreground/45 text-center">
          No 🪵 in this cell.
        </p>
      ) : (
        <ol className="divide-y divide-black/5 max-h-[420px] overflow-y-auto">
          {logs.map((log) => {
            const isOpen = expandedId === log.id;
            const fullStamp = new Date(log.contactedAt).toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            });
            return (
              <li key={log.id} className="px-0">
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                  aria-expanded={isOpen}
                  className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                    isOpen ? 'bg-warm-bg/40' : 'hover:bg-warm-bg/30'
                  }`}
                >
                  {log.userAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={log.userAvatarUrl}
                      alt=""
                      className="shrink-0 w-6 h-6 rounded-full object-cover border border-white shadow-sm mt-0.5"
                    />
                  ) : (
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center border border-white shadow-sm mt-0.5">
                      {initialsOf(log.userName)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-foreground truncate">
                      <span className="font-semibold">{log.userName}</span>
                      <span className="text-foreground/55"> · </span>
                      <span className="font-medium text-foreground/80">{log.contactName}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-foreground/45 tabular-nums">
                      {fmtDayMonth(log.contactedAt)} · {fmtTimeOfDay(log.contactedAt)}
                      {log.durationSeconds ? ` · ${fmtDuration(log.durationSeconds)}` : ''}
                    </p>
                    {isOpen && (
                      <p className="mt-1.5 text-[11.5px] text-foreground/70 leading-snug">
                        <span className="tabular-nums">{fullStamp}</span>
                        <span className="text-foreground/40"> · </span>
                        <span>{log.userName}</span>
                        <span className="text-foreground/40"> logged </span>
                        <span className="font-medium">{log.contactName}</span>
                        {log.contactCompany ? <span className="text-foreground/55"> ({log.contactCompany})</span> : null}
                        <span className="text-foreground/40"> via </span>
                        <span className="font-medium">{log.method ?? 'unspecified'}</span>
                        {log.durationSeconds ? (
                          <>
                            <span className="text-foreground/40"> for </span>
                            <span className="font-medium tabular-nums">{fmtDuration(log.durationSeconds)}</span>
                          </>
                        ) : null}
                        <span className="text-foreground/40">.</span>
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden
                    className={`shrink-0 text-foreground/30 text-[10px] mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
