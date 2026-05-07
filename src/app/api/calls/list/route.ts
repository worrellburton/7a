import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/calls/list?from&to&direction&search&page&perPage
//
// Reads from public.calls. Supports the same filters the Calls page UI
// exposes: date range, direction, and search across caller name /
// caller number / source.

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const direction = url.searchParams.get('direction');
  const search = url.searchParams.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const perPage = Math.max(
    1,
    Math.min(MAX_PER_PAGE, Number(url.searchParams.get('perPage')) || DEFAULT_PER_PAGE),
  );

  const supabase = getAdminSupabase();

  let q = supabase
    .from('calls')
    .select(
      'ctm_id, called_at, direction, duration, talk_time, ring_time, voicemail, status, caller_number, caller_number_formatted, receiving_number, receiving_number_formatted, tracking_number_formatted, source, source_name, tracking_label, city, state, audio_url, caller_name',
      { count: 'exact' },
    )
    .order('called_at', { ascending: false });

  if (from) q = q.gte('called_at', from);
  if (to) q = q.lte('called_at', to);
  if (direction && direction !== 'all') q = q.eq('direction', direction);
  if (search) {
    // Match on caller_number, caller_name, or source_name.
    const like = `%${search}%`;
    q = q.or(
      `caller_number.ilike.${like},caller_number_formatted.ilike.${like},caller_name.ilike.${like},source_name.ilike.${like}`,
    );
  }

  const start = (page - 1) * perPage;
  const { data, error, count } = await q.range(start, start + perPage - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    calls: data ?? [],
    total: count ?? 0,
    page,
    perPage,
  });
}
