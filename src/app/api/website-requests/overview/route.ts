import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/website-requests/overview — admin-only summary across both
// vob_requests and contact_submissions. Returns counts (total + new)
// and the 5 most recent rows from each table for the landing page at
// /app/website-requests.

export const dynamic = 'force-dynamic';

interface RecentVob {
  id: string;
  full_name: string;
  insurance_provider: string | null;
  status: string;
  received_at: string;
}

interface RecentForm {
  id: string;
  source: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminSupabase();

  const [vobTotal, vobNew, formsTotal, formsNew, vobRecent, formsRecent] = await Promise.all([
    admin.from('vob_requests').select('*', { count: 'exact', head: true }),
    admin.from('vob_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    admin.from('contact_submissions').select('*', { count: 'exact', head: true }),
    admin.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    admin
      .from('vob_requests')
      .select('id, full_name, insurance_provider, status, received_at')
      .order('received_at', { ascending: false })
      .limit(5),
    admin
      .from('contact_submissions')
      .select('id, source, first_name, last_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    vobs: {
      total: vobTotal.count ?? 0,
      new: vobNew.count ?? 0,
      recent: (vobRecent.data ?? []) as RecentVob[],
    },
    forms: {
      total: formsTotal.count ?? 0,
      new: formsNew.count ?? 0,
      recent: (formsRecent.data ?? []) as RecentForm[],
    },
  });
}
