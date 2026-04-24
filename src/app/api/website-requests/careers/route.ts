import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/careers — admin-only. Lists submissions
// from the OpenPositions careers form (rows in
// public.contact_submissions where source='careers'). Sibling of
// /api/website-requests/forms which lists everything else.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('contact_submissions')
    .select('id, source, first_name, last_name, email, telephone, message, page_url, referrer, status, notes, created_at')
    .eq('source', 'careers')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [], total: data?.length ?? 0 });
}
