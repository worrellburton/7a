import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();

  const { data: userRow } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
  if (!userRow?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { callIds?: string[] };
  if (!body.callIds?.length) {
    return NextResponse.json({ scores: {} });
  }

  const { data: rows } = await supabase
    .from('call_ai_scores')
    .select('*')
    .in('call_id', body.callIds);

  const scores: Record<string, unknown> = {};
  if (rows) {
    for (const row of rows) {
      scores[row.call_id] = row;
    }
  }

  return NextResponse.json({ scores });
}
