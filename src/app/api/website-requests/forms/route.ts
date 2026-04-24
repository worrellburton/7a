import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/forms  — admin-only. Lists every contact
// submission from public.contact_submissions (the table master
// authored in migration 20260423_contact_submissions.sql, extended
// by 20260424_website_requests.sql with source/consent/page_url).

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
    .select('id, source, first_name, last_name, email, telephone, payment_method, message, consent, page_url, referrer, user_agent, status, notes, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [], total: data?.length ?? 0 });
}
