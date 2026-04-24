import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// GET /api/website-requests/unread-count
//
// Accessible to admins and Marketing & Admissions department members.
// Returns the total of new VOB requests + new contact submissions
// (status='new'). Used by the sidebar nav to render a notification
// badge on the Website Requests link.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

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
