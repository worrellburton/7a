import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { phoenixDayOf } from '@/lib/calls-shared';

// GET /api/calls/reports/recovery-com?from=<iso>&to=<iso>
//
// Server-side rollup of every call attributed to the Recovery.com
// listing in CTM. Powers /feather/calls/reports/recovery-com — the
// page mirrors the "Insurance Verify" branding and exports as PDF.
//
// `source` is the human-typed CTM source; the matching string lives
// in our calls table as the literal "Recovery.com - Elev8.io" today.
// We match case-insensitively against /^recovery\.com/i so future
// renames (e.g. "Recovery.com — Direct") still flow into the report.
//
// This endpoint is volume + attribution only — just the CTM-derived
// facts we need to chart daily volume, missed calls, top tracking
// labels, sources, and geo.

const PAGE_SIZE = 1000;

interface CallRow {
  ctm_id: string;
  called_at: string;
  direction: string | null;
  duration: number | null;
  talk_time: number | null;
  voicemail: boolean | null;
  caller_number: string | null;
  caller_number_formatted: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  source_name: string | null;
  tracking_label: string | null;
  tracking_number: string | null;
  tracking_number_formatted: string | null;
}

const PHX_OFFSET_HOURS = -7; // Phoenix is UTC-7 year round (no DST).

function phoenixHourOf(iso: string): number {
  const d = new Date(iso);
  // Shift UTC hour by Phoenix offset, then normalise into 0–23.
  return ((d.getUTCHours() + 24 + PHX_OFFSET_HOURS) % 24);
}

function phoenixDayOfWeek(iso: string): number {
  // 0 = Sunday … 6 = Saturday, in Phoenix time.
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + PHX_OFFSET_HOURS * 3_600_000);
  return shifted.getUTCDay();
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to (ISO strings) are required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Pull the spam list so we can subtract bot/spam calls from the
  // counts (matches the rest of the calls UI).
  const { data: spamRows, error: spamErr } = await supabase
    .from('call_spam_numbers')
    .select('phone_normalized');
  if (spamErr) return NextResponse.json({ error: spamErr.message }, { status: 500 });
  const spamSet = new Set<string>((spamRows ?? []).map((r) => r.phone_normalized as string));

  const calls: CallRow[] = [];
  let start = 0;
  while (true) {
    const { data, error } = await supabase
      .from('calls')
      .select(
        'ctm_id, called_at, direction, duration, talk_time, voicemail, caller_number, caller_number_formatted, city, state, source, source_name, tracking_label, tracking_number, tracking_number_formatted',
      )
      .gte('called_at', from)
      .lte('called_at', to)
      .ilike('source', 'recovery.com%')
      .order('called_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    calls.push(...(data as CallRow[]));
    if (data.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  // Filter spam — match the digits-only normalisation used elsewhere.
  const isSpam = (c: CallRow) => {
    const digits = (c.caller_number || '').replace(/\D/g, '');
    return digits && spamSet.has(digits);
  };
  const safeCalls = calls.filter((c) => !isSpam(c));

  // ── Aggregates ────────────────────────────────────────────────
  const total = safeCalls.length;
  const inbound = safeCalls.filter((c) => c.direction === 'inbound').length;
  const outbound = safeCalls.filter((c) => c.direction === 'outbound').length;
  const missed = safeCalls.filter(
    (c) => c.direction === 'inbound' && (c.voicemail || (c.talk_time ?? 0) < 3),
  ).length;
  const voicemails = safeCalls.filter((c) => c.voicemail).length;
  const uniqueCallers = new Set(
    safeCalls.map((c) => (c.caller_number || '').replace(/\D/g, '')).filter(Boolean),
  ).size;

  const totalDuration = safeCalls.reduce((sum, c) => sum + (c.duration ?? 0), 0);
  const totalTalkTime = safeCalls.reduce((sum, c) => sum + (c.talk_time ?? 0), 0);
  const avgDuration = total > 0 ? totalDuration / total : 0;
  const avgTalkTime = total > 0 ? totalTalkTime / total : 0;

  // Daily counts (Phoenix days).
  const dailyMap = new Map<string, { count: number; missed: number }>();
  for (const c of safeCalls) {
    const day = phoenixDayOf(c.called_at);
    let bucket = dailyMap.get(day);
    if (!bucket) {
      bucket = { count: 0, missed: 0 };
      dailyMap.set(day, bucket);
    }
    bucket.count++;
    if (c.direction === 'inbound' && (c.voicemail || (c.talk_time ?? 0) < 3)) bucket.missed++;
  }
  const dailyCounts = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, count: v.count, missed: v.missed }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hour-of-day + day-of-week distribution (Phoenix time).
  const hourlyCounts: { hour: number; count: number }[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: 0,
  }));
  const dowCounts: { day: number; label: string; count: number }[] = DOW_LABELS.map(
    (label, day) => ({ day, label, count: 0 }),
  );
  for (const c of safeCalls) {
    hourlyCounts[phoenixHourOf(c.called_at)].count++;
    dowCounts[phoenixDayOfWeek(c.called_at)].count++;
  }

  // Top tracking labels.
  const labelMap = new Map<string, number>();
  for (const c of safeCalls) {
    const label = (c.tracking_label || '').trim();
    if (!label) continue;
    labelMap.set(label, (labelMap.get(label) ?? 0) + 1);
  }
  const trackingLabels = Array.from(labelMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Top tracking numbers (the dialed-in number per CTM tracking line).
  const trackingNumberMap = new Map<string, { number: string; count: number }>();
  for (const c of safeCalls) {
    const num = (c.tracking_number_formatted || c.tracking_number || '').trim();
    if (!num) continue;
    let bucket = trackingNumberMap.get(num);
    if (!bucket) {
      bucket = { number: num, count: 0 };
      trackingNumberMap.set(num, bucket);
    }
    bucket.count++;
  }
  const trackingNumbers = Array.from(trackingNumberMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Top sources (CTM source string — there's usually 1–3 variants).
  const sourceMap = new Map<string, number>();
  for (const c of safeCalls) {
    const key = (c.source_name || c.source || '').trim();
    if (!key) continue;
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Top cities + states.
  const cityMap = new Map<string, { city: string; state: string | null; count: number }>();
  for (const c of safeCalls) {
    const city = (c.city || '').trim();
    if (!city) continue;
    const key = `${city}|${c.state ?? ''}`;
    let bucket = cityMap.get(key);
    if (!bucket) {
      bucket = { city, state: c.state, count: 0 };
      cityMap.set(key, bucket);
    }
    bucket.count++;
  }
  const cities = Array.from(cityMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const stateMap = new Map<string, number>();
  for (const c of safeCalls) {
    const state = (c.state || '').trim();
    if (!state) continue;
    stateMap.set(state, (stateMap.get(state) ?? 0) + 1);
  }
  const states = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Top callers (by frequency in this report window).
  const callerMap = new Map<
    string,
    {
      phone: string;
      calls: number;
      firstAt: string;
      lastAt: string;
      city: string | null;
      state: string | null;
    }
  >();
  for (const c of safeCalls) {
    const phone = c.caller_number_formatted || c.caller_number || '';
    if (!phone) continue;
    let bucket = callerMap.get(phone);
    if (!bucket) {
      bucket = {
        phone,
        calls: 0,
        firstAt: c.called_at,
        lastAt: c.called_at,
        city: c.city,
        state: c.state,
      };
      callerMap.set(phone, bucket);
    }
    bucket.calls++;
    if (c.called_at < bucket.firstAt) bucket.firstAt = c.called_at;
    if (c.called_at > bucket.lastAt) bucket.lastAt = c.called_at;
  }
  const repeatCallers = Array.from(callerMap.values())
    .filter((v) => v.calls > 1)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 15);

  // Build the call-log payload (sorted newest-first).
  const callLog = safeCalls.map((c) => ({
    id: c.ctm_id,
    called_at: c.called_at,
    direction: c.direction,
    duration: c.duration ?? 0,
    talk_time: c.talk_time ?? 0,
    caller_number: c.caller_number_formatted || c.caller_number,
    city: c.city,
    state: c.state,
    tracking_label: c.tracking_label,
    tracking_number: c.tracking_number_formatted || c.tracking_number,
    source: c.source_name || c.source,
    voicemail: !!c.voicemail,
  }));

  return NextResponse.json({
    range: { from, to },
    overview: {
      total,
      inbound,
      outbound,
      missed,
      voicemails,
      uniqueCallers,
      avgDuration,
      avgTalkTime,
      totalDuration,
      totalTalkTime,
    },
    dailyCounts,
    hourlyCounts,
    dowCounts,
    trackingLabels,
    trackingNumbers,
    sources,
    cities,
    states,
    repeatCallers,
    callLog,
  });
}
