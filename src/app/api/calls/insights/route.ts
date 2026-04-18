import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import {
  computeRangeAggregates,
  phoenixDayOf,
  phoenixDaysBetween,
  type AggregateCall,
} from '@/lib/calls-shared';

// GET /api/calls/insights?from=<iso>&to=<iso>
//
// Reads from the public.calls mirror populated by /api/ctm/sync and
// returns aggregate stats for the date range. The Calls page used to
// derive these client-side from paginated CTM results, which meant
// counts only reflected whatever was loaded. Now every stat card is
// computed against the full canonical set.

const PAGE_SIZE = 1000;

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

  const { data: spamRows, error: spamErr } = await supabase
    .from('call_spam_numbers')
    .select('phone_normalized');
  if (spamErr) return NextResponse.json({ error: spamErr.message }, { status: 500 });
  const spamSet = new Set<string>((spamRows ?? []).map(r => r.phone_normalized as string));

  const calls: AggregateCall[] = [];
  let start = 0;
  while (true) {
    const { data, error } = await supabase
      .from('calls')
      .select(
        'ctm_id, called_at, direction, duration, talk_time, voicemail, caller_number, caller_number_formatted, receiving_number, receiving_number_formatted, source, source_name',
      )
      .gte('called_at', from)
      .lte('called_at', to)
      .order('called_at', { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    calls.push(...(data as AggregateCall[]));
    if (data.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  const scores = new Map<string, { fit_score: number | null }>();
  if (calls.length > 0) {
    const ids = calls.map(c => c.ctm_id);
    // Supabase caps .in() payloads, chunk defensively.
    const chunk = 500;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const { data, error } = await supabase
        .from('call_ai_scores')
        .select('call_id, fit_score')
        .in('call_id', slice);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      for (const r of data ?? []) {
        scores.set(String(r.call_id), { fit_score: r.fit_score as number | null });
      }
    }
  }

  const rangeDays = phoenixDaysBetween(from, to);
  const aggregates = computeRangeAggregates(calls, spamSet, scores, phoenixDayOf, rangeDays);

  return NextResponse.json({
    ...aggregates,
    from,
    to,
    callsCounted: calls.length,
  });
}
