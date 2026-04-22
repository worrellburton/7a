// Shared helpers for the analytics workspace.
//
// Everything operates in Phoenix time (America/Phoenix, UTC-7, no DST) so
// "today" / "yesterday" etc. line up with the rest of the platform (calls,
// admissions) and with GA4's default timezone for the property.

export const PHOENIX_TZ = 'America/Phoenix';
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  start: Date;
  end: Date;
}

export type RangePreset = 'today' | 'yesterday' | '7d' | '14d' | '30d' | '90d' | 'ytd' | 'custom';

export function azDateString(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
}

function phoenixDayBounds(offsetDays: number): { start: Date; end: Date } {
  const nowAz = new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
  const [yy, mo, dd] = nowAz.split('-').map(Number);
  const startMs = Date.UTC(yy, mo - 1, dd + offsetDays, 7, 0, 0, 0);
  return { start: new Date(startMs), end: new Date(startMs + DAY_MS - 1) };
}

export function rangeForPreset(preset: RangePreset): DateRange {
  const today = phoenixDayBounds(0);
  switch (preset) {
    case 'today':
      return today;
    case 'yesterday':
      return phoenixDayBounds(-1);
    case '7d':
      return { start: phoenixDayBounds(-6).start, end: today.end };
    case '14d':
      return { start: phoenixDayBounds(-13).start, end: today.end };
    case '30d':
      return { start: phoenixDayBounds(-29).start, end: today.end };
    case '90d':
      return { start: phoenixDayBounds(-89).start, end: today.end };
    case 'ytd': {
      const nowAz = new Date().toLocaleDateString('en-CA', { timeZone: PHOENIX_TZ });
      const yy = Number(nowAz.slice(0, 4));
      return {
        start: new Date(Date.UTC(yy, 0, 1, 7, 0, 0, 0)),
        end: today.end,
      };
    }
    case 'custom':
    default:
      return { start: phoenixDayBounds(-29).start, end: today.end };
  }
}

// Previous period of the same length, ending the day before `range.start`.
// Used for period-over-period % change.
export function previousRange(range: DateRange): DateRange {
  const lengthMs = range.end.getTime() - range.start.getTime() + 1;
  const prevEnd = new Date(range.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs + 1);
  return { start: prevStart, end: prevEnd };
}

export function detectPreset(range: DateRange): RangePreset {
  const presets: RangePreset[] = ['today', 'yesterday', '7d', '14d', '30d', '90d', 'ytd'];
  for (const p of presets) {
    const r = rangeForPreset(p);
    if (
      azDateString(r.start) === azDateString(range.start) &&
      azDateString(r.end) === azDateString(range.end)
    ) {
      return p;
    }
  }
  return 'custom';
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', {
    timeZone: PHOENIX_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const s = fmt(range.start);
  const e = fmt(range.end);
  if (s === e) return s;
  const sParts = s.split(' ');
  const eParts = e.split(' ');
  if (sParts[0] === eParts[0] && sParts[2] === eParts[2]) {
    return `${sParts[0]} ${sParts[1].replace(',', '')} – ${eParts[1].replace(',', '')}, ${eParts[2]}`;
  }
  return `${s} – ${e}`;
}

export function spanDays(range: DateRange): number {
  return Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1);
}

export function pctChange(current: number, prev: number): number | null {
  if (!prev) return null;
  return (current - prev) / prev;
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDuration(sec: number): string {
  if (!sec || sec < 1) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function fmtDelta(delta: number | null, inverse = false): { label: string; tone: 'up' | 'down' | 'flat' } {
  if (delta === null || !isFinite(delta)) return { label: '—', tone: 'flat' };
  if (Math.abs(delta) < 0.001) return { label: '0.0%', tone: 'flat' };
  const positive = delta > 0;
  const tone: 'up' | 'down' | 'flat' = positive ? (inverse ? 'down' : 'up') : (inverse ? 'up' : 'down');
  const sign = positive ? '+' : '';
  return { label: `${sign}${(delta * 100).toFixed(1)}%`, tone };
}

// API helper: GA4 wants YYYY-MM-DD in the property's local timezone.
export function toApiDate(d: Date): string {
  return azDateString(d);
}
