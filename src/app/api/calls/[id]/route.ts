import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/calls/<ctm_id> — returns the single call row from public.calls
// joined with its latest AI score from public.call_ai_scores. Used by the
// dedicated call detail page.

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getAdminSupabase();

  const { data: call, error: callErr } = await supabase
    .from('calls')
    .select('ctm_id, called_at, direction, duration, talk_time, ring_time, voicemail, status, caller_number, caller_number_formatted, receiving_number, receiving_number_formatted, tracking_number_formatted, source, source_name, tracking_label, city, state, audio_url, caller_name')
    .eq('ctm_id', id)
    .maybeSingle();

  if (callErr) return NextResponse.json({ error: callErr.message }, { status: 500 });
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: score } = await supabase
    .from('call_ai_scores')
    .select('*')
    .eq('call_id', String(id))
    .order('scored_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ call, score: score ?? null });
}
