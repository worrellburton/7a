import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/calls/operators?from&to
//
// Aggregates operator stats across every call in the selected date
// range — not just what the browser has paginated. Joins
// public.calls (range-filtered) with public.call_ai_scores via
// ctm_id / call_id, groups by operator_name, and returns average
// score, average fit_score, call count, and the top strengths /
// weaknesses with occurrence counts.

const PAGE_SIZE = 1000;

interface ScoreRow {
  call_id: string;
  score: number | null;
  fit_score: number | null;
  operator_name: string | null;
  operator_strengths: string[] | null;
  operator_weaknesses: string[] | null;
  call_name: string | null;
  caller_name: string | null;
  summary: string | null;
  next_steps: string | null;
  sentiment: string | null;
}

interface CallRow {
  ctm_id: string;
  called_at: string;
  direction: string | null;
  duration: number | null;
  talk_time: number | null;
  caller_number_formatted: string | null;
  caller_number: string | null;
  city: string | null;
  state: string | null;
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

  // Pull the set of call ids in the range first, then fetch their
  // scores. This way operators whose calls happen outside the range
  // don't leak in.
  const callsInRange: CallRow[] = [];
  let start = 0;
  while (true) {
    const { data, error } = await supabase
      .from('calls')
      .select('ctm_id, called_at, direction, duration, talk_time, caller_number_formatted, caller_number, city, state')
      .gte('called_at', from)
      .lte('called_at', to)
      .range(start, start + PAGE_SIZE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    callsInRange.push(...((data ?? []) as CallRow[]));
    if (data.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  if (callsInRange.length === 0) {
    return NextResponse.json({ operators: [] });
  }

  const callById = new Map<string, CallRow>();
  for (const c of callsInRange) callById.set(c.ctm_id, c);

  const ids = callsInRange.map(c => c.ctm_id);
  const rows: ScoreRow[] = [];
  const chunk = 500;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data, error } = await supabase
      .from('call_ai_scores')
      .select('call_id, score, fit_score, operator_name, operator_strengths, operator_weaknesses, call_name, caller_name, summary, next_steps, sentiment')
      .in('call_id', slice)
      .not('operator_name', 'is', null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as ScoreRow[]));
  }

  interface CallEntry {
    ctm_id: string;
    called_at: string;
    direction: string | null;
    duration: number | null;
    talk_time: number | null;
    caller_number_formatted: string | null;
    caller_number: string | null;
    city: string | null;
    state: string | null;
    score: number | null;
    fit_score: number | null;
    call_name: string | null;
    caller_name: string | null;
    summary: string | null;
    next_steps: string | null;
    sentiment: string | null;
    strengths: string[];
    weaknesses: string[];
  }

  const byOp = new Map<string, {
    count: number;
    scoreSum: number;
    fitSum: number;
    fitCount: number;
    strengths: Map<string, number>;
    weaknesses: Map<string, number>;
    calls: CallEntry[];
  }>();

  for (const r of rows) {
    const name = r.operator_name?.trim();
    if (!name) continue;
    const call = callById.get(r.call_id);
    if (!call) continue;
    let bucket = byOp.get(name);
    if (!bucket) {
      bucket = { count: 0, scoreSum: 0, fitSum: 0, fitCount: 0, strengths: new Map(), weaknesses: new Map(), calls: [] };
      byOp.set(name, bucket);
    }
    bucket.count++;
    bucket.scoreSum += r.score ?? 0;
    if (r.fit_score != null) {
      bucket.fitSum += r.fit_score;
      bucket.fitCount++;
    }
    for (const s of r.operator_strengths ?? []) {
      if (!s) continue;
      bucket.strengths.set(s, (bucket.strengths.get(s) ?? 0) + 1);
    }
    for (const w of r.operator_weaknesses ?? []) {
      if (!w) continue;
      bucket.weaknesses.set(w, (bucket.weaknesses.get(w) ?? 0) + 1);
    }
    bucket.calls.push({
      ctm_id: call.ctm_id,
      called_at: call.called_at,
      direction: call.direction,
      duration: call.duration,
      talk_time: call.talk_time,
      caller_number_formatted: call.caller_number_formatted,
      caller_number: call.caller_number,
      city: call.city,
      state: call.state,
      score: r.score,
      fit_score: r.fit_score,
      call_name: r.call_name,
      caller_name: r.caller_name,
      summary: r.summary,
      next_steps: r.next_steps,
      sentiment: r.sentiment,
      strengths: r.operator_strengths ?? [],
      weaknesses: r.operator_weaknesses ?? [],
    });
  }

  const operators = Array.from(byOp.entries())
    .map(([name, b]) => ({
      name,
      count: b.count,
      avgScore: b.count > 0 ? Math.round(b.scoreSum / b.count) : 0,
      avgFit: b.fitCount > 0 ? Math.round(b.fitSum / b.fitCount) : null,
      strengths: Array.from(b.strengths.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([text, count]) => ({ text, count })),
      weaknesses: Array.from(b.weaknesses.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([text, count]) => ({ text, count })),
      calls: b.calls.sort((a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime()),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return NextResponse.json({ operators, scoredCalls: rows.length });
}
