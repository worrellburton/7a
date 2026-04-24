import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/unread-count
//
// Admin-only. Returns the total of new VOB requests + new contact
// submissions (status='new'). Used by the sidebar nav to render a
// notification badge on the Website Requests link.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  const [vobs, forms] = await Promise.all([
    admin.from('vob_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    admin.from('contact_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  const vobCount = vobs.count ?? 0;
  const formsCount = forms.count ?? 0;
  return NextResponse.json({
    total: vobCount + formsCount,
    vobs: vobCount,
    forms: formsCount,
  });
}
