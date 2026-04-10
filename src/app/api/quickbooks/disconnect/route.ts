import { NextResponse } from 'next/server';
import { deleteIntegration } from '@/lib/quickbooks';
import { getServerSupabase } from '@/lib/supabase-server';

// POST /api/quickbooks/disconnect — wipe stored tokens.
export async function POST() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin check
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await deleteIntegration();
  return NextResponse.json({ ok: true });
}
