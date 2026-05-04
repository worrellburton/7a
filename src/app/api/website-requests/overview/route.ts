import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/overview — accessible to admins and to
// Marketing & Admissions department members. Summary across both
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
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  const admin = getAdminSupabase();

  // Every count + recent-rows query filters spam_at IS NULL so
  // auto-spammed (and admin-marked-spam) submissions don't pollute
  // the dashboard. The Forms tab still surfaces them via the
  // explicit "Show spam" toggle, so admins keep audit access.
  const [vobTotal, vobNew, formsTotal, formsNew, vobRecent, formsRecent] = await Promise.all([
    admin.from('vob_requests').select('*', { count: 'exact', head: true }).is('spam_at', null),
    admin.from('vob_requests').select('*', { count: 'exact', head: true }).eq('status', 'new').is('spam_at', null),
    admin.from('contact_submissions').select('*', { count: 'exact', head: true }).is('spam_at', null),
    admin.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new').is('spam_at', null),
    admin
      .from('vob_requests')
      .select('id, full_name, insurance_provider, status, received_at')
      .is('spam_at', null)
      .order('received_at', { ascending: false })
      .limit(5),
    admin
      .from('contact_submissions')
      .select('id, source, first_name, last_name, email, status, created_at')
      .is('spam_at', null)
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
