'use client';

import { useEffect, useMemo, useState } from 'react';
import { type AircallCallRow } from './_shared';

// Optional call-volume heatmap: buckets recent calls by Phoenix weekday ×
// hour-of-day so operators can see when the phones light up. Fetches its
// own sample over the page's current date range / filters (independent of
// the paginated list below) and shades each cell by relative volume.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SAMPLE_PAGES = 5; // up to 5×100 = 500 calls
const SAMPLE_PER_PAGE = 100;
const PRIMARY_RGB = '188, 107, 74'; // --color-primary #bc6b4a

// Phoenix is UTC-7 year-round (no DST) → shift then read UTC parts.
function phoenixDowHour(iso: string | null): { dow: number; hour: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const s = new Date(d.getTime() - 7 * 3600 * 1000);
  return { dow: s.getUTCDay(), hour: s.getUTCHours() };
}

function hourLabel(h: number): string {
  const ampm = h >= 12 ? 'p' : 'a';
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}${ampm}`;
}

interface Props {
  token: string | null;
  from?: string;
  direction?: string;
  missed?: boolean;
  search?: string;
}

export function CallsHeatmap({ token, from, direction, missed, search }: Props) {
  const [rows, setRows] = useState<AircallCallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const all: AircallCallRow[] = [];
      for (let page = 1; page <= SAMPLE_PAGES; page++) {
        const p = new URLSearchParams();
        if (from) p.set('from', from);
        if (direction && direction !== 'all') p.set('direction', direction);
        if (missed) p.set('missed', '1');
        if (search) p.set('search', search);
        p.set('page', String(page));
        p.set('perPage', String(SAMPLE_PER_PAGE));
        const res = await fetch(`/api/aircall/list?${p.toString()}`, { headers });
        if (cancelled) return;
        if (!res.ok) break;
        const j = await res.json();
        const batch: AircallCallRow[] = j.calls ?? [];
        all.push(...batch);
        if (batch.length < SAMPLE_PER_PAGE) break;
      }
      if (!cancelled) {
        setRows(all);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, from, direction, missed, search]);

  const { grid, max, total } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[]);
    let mx = 0;
    for (const r of rows) {
      const p = phoenixDowHour(r.started_at);
      if (!p) continue;
      g[p.dow][p.hour] += 1;
      if (g[p.dow][p.hour] > mx) mx = g[p.dow][p.hour];
    }
    return { grid: g, max: mx, total: rows.length };
  }, [rows]);

  return (
    <section className="relative rounded-3xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-5 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
      <div className="px-5 sm:px-7 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
              </svg>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Call volume
            </h2>
          </div>
          <span className="text-[11px] font-medium text-foreground/45 tabular-nums">
            {loading ? 'Loading…' : `${total.toLocaleString()} calls · by hour (MST)`}
          </span>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl bg-foreground/5 animate-pulse" />
        ) : total === 0 ? (
          <p className="text-sm text-foreground/50 py-6 text-center">No calls in this range to chart.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Hour axis */}
              <div className="flex items-center gap-px pl-10 mb-1">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-foreground/35 tabular-nums">
                    {h % 3 === 0 ? hourLabel(h) : ''}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {grid.map((dayRow, d) => (
                <div key={d} className="flex items-center gap-px mb-px">
                  <div className="w-10 pr-1 text-right text-[10px] font-semibold text-foreground/45">{DAYS[d]}</div>
                  {dayRow.map((count, h) => {
                    const alpha = max > 0 && count > 0 ? 0.12 + 0.88 * (count / max) : 0;
                    return (
                      <div
                        key={h}
                        title={`${DAYS[d]} ${hourLabel(h)} · ${count} call${count === 1 ? '' : 's'}`}
                        className="flex-1 aspect-square rounded-[3px] border border-foreground/5"
                        style={{ backgroundColor: count > 0 ? `rgba(${PRIMARY_RGB}, ${alpha})` : 'rgba(0,0,0,0.025)' }}
                      />
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-foreground/40">
                <span>Less</span>
                {[0.12, 0.35, 0.58, 0.81, 1].map((a) => (
                  <span key={a} className="h-3 w-3 rounded-[3px] border border-foreground/5" style={{ backgroundColor: `rgba(${PRIMARY_RGB}, ${a})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
