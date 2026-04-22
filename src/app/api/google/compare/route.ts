import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/compare?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Returns the current range alongside two comparison ranges:
//   - previousPeriod: equal length ending the day before current start
//   - yearAgo: same length, shifted 365 days earlier
// Also returns a "daily overlay" array pairing current[i] with previous[i]
// by ordinal position for charting.

export const dynamic = 'force-dynamic';

const SUMMARY_METRICS = [
  { name: 'sessions' },
  { name: 'activeUsers' },
  { name: 'screenPageViews' },
  { name: 'averageSessionDuration' },
  { name: 'bounceRate' },
  { name: 'engagementRate' },
];

function parseIsoUtc(dateStr: string): Date {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(yy, mo - 1, dd));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, delta: number): string {
  const d = parseIsoUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return iso(d);
}

function diffDays(startStr: string, endStr: string): number {
  return (
    Math.round(
      (parseIsoUtc(endStr).getTime() - parseIsoUtc(startStr).getTime()) / (24 * 60 * 60 * 1000)
    ) + 1
  );
}

interface SummaryValues {
  sessions: number;
  activeUsers: number;
  pageViews: number;
  avgSessionDurationSec: number;
  bounceRate: number;
  engagementRate: number;
}

function readSummary(row: { metricValues?: { value?: string }[] } | undefined): SummaryValues {
  const v = row?.metricValues ?? [];
  return {
    sessions: Number(v[0]?.value ?? 0),
    activeUsers: Number(v[1]?.value ?? 0),
    pageViews: Number(v[2]?.value ?? 0),
    avgSessionDurationSec: Number(v[3]?.value ?? 0),
    bounceRate: Number(v[4]?.value ?? 0),
    engagementRate: Number(v[5]?.value ?? 0),
  };
}

interface DailyRow {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}

function toDailySeries(rows: DailyRow[] | undefined): { date: string; sessions: number }[] {
  return (rows ?? [])
    .map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    }))
    .filter((d) => /^\d{8}$/.test(d.date))
    .map((d) => ({
      ...d,
      date: `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const len = diffDays(startDate, endDate);
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(prevEnd, -(len - 1));
  const yaStart = addDays(startDate, -365);
  const yaEnd = addDays(endDate, -365);

  try {
    const [curSum, prevSum, yaSum, curDaily, prevDaily] = await Promise.all([
      ga4Run({ dateRanges: [{ startDate, endDate }], metrics: SUMMARY_METRICS }),
      ga4Run({ dateRanges: [{ startDate: prevStart, endDate: prevEnd }], metrics: SUMMARY_METRICS }),
      ga4Run({ dateRanges: [{ startDate: yaStart, endDate: yaEnd }], metrics: SUMMARY_METRICS }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 400,
      }),
      ga4Run({
        dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 400,
      }),
    ]);

    const current = readSummary(curSum.rows?.[0]);
    const previousPeriod = readSummary(prevSum.rows?.[0]);
    const yearAgo = readSummary(yaSum.rows?.[0]);

    const curSeries = toDailySeries(curDaily.rows);
    const prevSeries = toDailySeries(prevDaily.rows);

    // Align by ordinal index so the two series overlay cleanly on one x-axis.
    const overlayLen = Math.max(curSeries.length, prevSeries.length);
    const daily = Array.from({ length: overlayLen }, (_, i) => ({
      date: curSeries[i]?.date ?? prevSeries[i]?.date ?? '',
      current: curSeries[i]?.sessions ?? 0,
      previous: prevSeries[i]?.sessions ?? 0,
    }));

    return NextResponse.json({
      range: {
        current: { startDate, endDate },
        previousPeriod: { startDate: prevStart, endDate: prevEnd },
        yearAgo: { startDate: yaStart, endDate: yaEnd },
      },
      current,
      previousPeriod,
      yearAgo,
      daily,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
