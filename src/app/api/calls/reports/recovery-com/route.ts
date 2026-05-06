import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { phoenixDayOf, isMeaningfulCall } from '@/lib/calls-shared';

// GET /api/calls/reports/recovery-com?from=<iso>&to=<iso>
//
// Server-side rollup of every call attributed to the Recovery.com
// listing in CTM. Powers /app/calls/reports/recovery-com — the
// page mirrors the "Insurance Verify" branding and exports as PDF.
//
// `source` is the human-typed CTM source; the matching string lives
// in our calls table as the literal "Recovery.com - Elev8.io" today.
// We match case-insensitively against /^recovery\.com/i so future
// renames (e.g. "Recovery.com — Direct") still flow into the report.

const PAGE_SIZE = 1000;
const MEANINGFUL_FIT = 60;
const HIGH_FIT = 75;

const RECOVERY_SOURCE_RE = /^recovery\.com/i;

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
}

interface ScoreRow {
  call_id: string;
  score: number | null;
  fit_score: number | null;
  call_name: string | null;
  caller_name: string | null;
  operator_name: string | null;
  client_type: string | null;
  sentiment: string | null;
  summary: string | null;
  next_steps: string | null;
}

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
        'ctm_id, called_at, direction, duration, talk_time, voicemail, caller_number, caller_number_formatted, city, state, source, source_name, tracking_label',
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

  // Pull AI scores for every call we surfaced.
  const scoreById = new Map<string, ScoreRow>();
  if (safeCalls.length > 0) {
    const ids = safeCalls.map((c) => c.ctm_id);
    const chunk = 500;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const { data, error } = await supabase
        .from('call_ai_scores')
        .select(
          'call_id, score, fit_score, call_name, caller_name, operator_name, client_type, sentiment, summary, next_steps',
        )
        .in('call_id', slice);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      for (const row of data ?? []) {
        scoreById.set(String(row.call_id), row as ScoreRow);
      }
    }
  }

  // ── Aggregates ────────────────────────────────────────────────
  const total = safeCalls.length;
  const inbound = safeCalls.filter((c) => c.direction === 'inbound').length;
  const outbound = safeCalls.filter((c) => c.direction === 'outbound').length;
  const missed = safeCalls.filter(
    (c) => c.direction === 'inbound' && (c.voicemail || (c.talk_time ?? 0) < 3),
  ).length;
  const firstTime = safeCalls.length; // every Recovery.com call is treated as a unique caller for now
  const uniqueCallers = new Set(
    safeCalls.map((c) => (c.caller_number || '').replace(/\D/g, '')).filter(Boolean),
  ).size;
  void firstTime;

  const totalDuration = safeCalls.reduce((sum, c) => sum + (c.duration ?? 0), 0);
  const totalTalkTime = safeCalls.reduce((sum, c) => sum + (c.talk_time ?? 0), 0);
  const avgDuration = total > 0 ? totalDuration / total : 0;
  const avgTalkTime = total > 0 ? totalTalkTime / total : 0;

  // Score-derived KPIs (ignore unscored).
  const scored = safeCalls
    .map((c) => scoreById.get(c.ctm_id))
    .filter((s): s is ScoreRow => !!s);
  const meaningful = safeCalls.filter((c) =>
    isMeaningfulCall(c, scoreById.get(c.ctm_id)?.fit_score ?? null),
  ).length;
  const highFit = scored.filter((s) => (s.fit_score ?? 0) >= HIGH_FIT).length;
  const avgCallScore =
    scored.length > 0 ? scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length : 0;
  const fitScores = scored
    .map((s) => s.fit_score)
    .filter((n): n is number => typeof n === 'number');
  const avgFitScore =
    fitScores.length > 0 ? fitScores.reduce((sum, n) => sum + n, 0) / fitScores.length : 0;

  // Daily counts (Phoenix days).
  const dailyMap = new Map<string, { count: number; meaningful: number; missed: number }>();
  for (const c of safeCalls) {
    const day = phoenixDayOf(c.called_at);
    let bucket = dailyMap.get(day);
    if (!bucket) {
      bucket = { count: 0, meaningful: 0, missed: 0 };
      dailyMap.set(day, bucket);
    }
    bucket.count++;
    const score = scoreById.get(c.ctm_id);
    if (isMeaningfulCall(c, score?.fit_score ?? null)) bucket.meaningful++;
    if (c.direction === 'inbound' && (c.voicemail || (c.talk_time ?? 0) < 3)) bucket.missed++;
  }
  const dailyCounts = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, count: v.count, meaningful: v.meaningful, missed: v.missed }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Fit-score histogram.
  const fitBuckets = [
    { label: '0–19', min: 0, max: 19 },
    { label: '20–39', min: 20, max: 39 },
    { label: '40–59', min: 40, max: 59 },
    { label: '60–74', min: 60, max: 74 },
    { label: '75–100', min: 75, max: 100 },
  ];
  const fitHistogram = fitBuckets.map((b) => ({
    label: b.label,
    count: scored.filter(
      (s) => (s.fit_score ?? -1) >= b.min && (s.fit_score ?? -1) <= b.max,
    ).length,
    range: `${b.min}-${b.max}`,
  }));

  // Sentiment + client type breakdowns.
  const sentimentCounts: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    unclear: 0,
  };
  for (const s of scored) {
    const k = (s.sentiment || 'unclear').toLowerCase();
    if (k in sentimentCounts) sentimentCounts[k]++;
    else sentimentCounts.unclear++;
  }
  const sentiment = Object.entries(sentimentCounts).map(([key, count]) => ({ key, count }));

  const clientTypeMap = new Map<string, number>();
  for (const s of scored) {
    if (!s.client_type) continue;
    clientTypeMap.set(s.client_type, (clientTypeMap.get(s.client_type) ?? 0) + 1);
  }
  const clientTypes = Array.from(clientTypeMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Operator scoreboard.
  const opsMap = new Map<
    string,
    { count: number; scoreSum: number; scored: number; meaningful: number; highFit: number }
  >();
  for (const c of safeCalls) {
    const score = scoreById.get(c.ctm_id);
    const name = (score?.operator_name || '').trim();
    if (!name) continue;
    let bucket = opsMap.get(name);
    if (!bucket) {
      bucket = { count: 0, scoreSum: 0, scored: 0, meaningful: 0, highFit: 0 };
      opsMap.set(name, bucket);
    }
    bucket.count++;
    if (score?.score != null) {
      bucket.scoreSum += score.score;
      bucket.scored++;
    }
    if (isMeaningfulCall(c, score?.fit_score ?? null)) bucket.meaningful++;
    if ((score?.fit_score ?? -1) >= HIGH_FIT) bucket.highFit++;
  }
  const operators = Array.from(opsMap.entries())
    .map(([name, v]) => ({
      name,
      count: v.count,
      avgScore: v.scored > 0 ? v.scoreSum / v.scored : null,
      meaningful: v.meaningful,
      highFit: v.highFit,
    }))
    .sort((a, b) => b.count - a.count);

  // Top callers (by frequency in this report window).
  const callerMap = new Map<
    string,
    { phone: string; calls: number; firstAt: string; lastAt: string; city: string | null; state: string | null }
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

  // Build the call-log payload (sorted newest-first, scores inlined).
  const callLog = safeCalls.map((c) => {
    const s = scoreById.get(c.ctm_id);
    return {
      id: c.ctm_id,
      called_at: c.called_at,
      direction: c.direction,
      duration: c.duration ?? 0,
      talk_time: c.talk_time ?? 0,
      caller_number: c.caller_number_formatted || c.caller_number,
      city: c.city,
      state: c.state,
      tracking_label: c.tracking_label,
      voicemail: !!c.voicemail,
      score: s?.score ?? null,
      fit_score: s?.fit_score ?? null,
      call_name: s?.call_name ?? null,
      caller_name: s?.caller_name ?? null,
      operator_name: s?.operator_name ?? null,
      client_type: s?.client_type ?? null,
      sentiment: s?.sentiment ?? null,
      summary: s?.summary ?? null,
      next_steps: s?.next_steps ?? null,
    };
  });

  return NextResponse.json({
    range: { from, to },
    overview: {
      total,
      inbound,
      outbound,
      missed,
      uniqueCallers,
      avgDuration,
      avgTalkTime,
      scoredCount: scored.length,
      meaningful,
      highFit,
      meaningfulPct: total > 0 ? meaningful / total : 0,
      avgCallScore,
      avgFitScore,
    },
    dailyCounts,
    fitHistogram,
    sentiment,
    clientTypes,
    operators,
    repeatCallers,
    callLog,
  });
}
