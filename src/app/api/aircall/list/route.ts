import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/aircall/list?from&to&direction&missed&user&search&page&perPage
//
// Reads from public.aircall_calls. Mirrors the CTM /api/calls/list
// contract but adds Aircall-specific filters: `missed` (recovery view)
// and `user` (per-agent, matched on user_email).

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

const SELECT =
  'aircall_id, started_at, answered_at, ended_at, direction, status, missed, missed_call_reason, voicemail, duration, raw_digits, caller_number, number_id, number_name, number_digits, user_name, user_email, contact_name, contact_company, teams, tags, recording_url, voicemail_url, summary, sentiment, transcript';

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const direction = url.searchParams.get('direction');
  const missed = url.searchParams.get('missed');
  const userEmail = url.searchParams.get('user')?.trim();
  const search = url.searchParams.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const perPage = Math.max(
    1,
    Math.min(MAX_PER_PAGE, Number(url.searchParams.get('perPage')) || DEFAULT_PER_PAGE),
  );

  const supabase = gate.admin;

  let q = supabase
    .from('aircall_calls')
    .select(SELECT, { count: 'exact' })
    .order('started_at', { ascending: false });

  if (from) q = q.gte('started_at', from);
  if (to) q = q.lte('started_at', to);
  if (direction && direction !== 'all') q = q.eq('direction', direction);
  if (missed === '1' || missed === 'true') q = q.eq('missed', true);
  if (userEmail) q = q.ilike('user_email', userEmail);
  if (search) {
    const like = `%${search}%`;
    q = q.or(
      `raw_digits.ilike.${like},caller_number.ilike.${like},contact_name.ilike.${like},user_name.ilike.${like},number_name.ilike.${like}`,
    );
  }

  const start = (page - 1) * perPage;
  const { data, error, count } = await q.range(start, start + perPage - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trim the heavy transcript out of the list payload — the list only
  // needs to know whether one exists; the detail route returns the full
  // text. Keeps the grid response small.
  const calls = (data ?? []).map((c) => {
    const { transcript, ...rest } = c as Record<string, unknown> & { transcript?: string | null };
    return { ...rest, has_transcript: !!(transcript && String(transcript).trim()) };
  });

  return NextResponse.json({ calls, total: count ?? 0, page, perPage });
}
