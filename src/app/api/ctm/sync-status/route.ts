import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/ctm/sync-status
//
// Lightweight probe so the Calls page can show "Last synced Xm ago"
// without calling the full sync. Returns last_synced_at,
// last_called_at, and the total rows in public.calls.

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('ctm_sync_state')
    .select('last_synced_at, last_called_at')
    .eq('id', 1)
    .maybeSingle();

  const { count } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    last_synced_at: data?.last_synced_at ?? null,
    last_called_at: data?.last_called_at ?? null,
    total_calls: count ?? 0,
  });
}
